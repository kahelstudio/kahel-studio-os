import { NextResponse } from "next/server";
import { auditCustomerEvent, consumeCustomerRateLimit, createCustomerProfile, ensureCustomerAccount, getProfileByEmail, hasTrustedOrigin, isValidEmail, normalizeEmail, normalizeMobile } from "@/lib/server/customer-auth";
import { sendBookingConfirmation } from "@/lib/server/customer-email";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getCurrentBookingTerms } from "@/lib/server/legal-documents";
import { isValidPhMobile } from "@/lib/phone";
import { bookingConflictMessage, isBookingSlotConflict } from "@/lib/server/booking-slots";
import { resolveBookableService, sha256 } from "@/lib/server/booking-availability";
import { getPayMongoPaymentCapability, payMongoPhilippinePhone } from "@/lib/server/paymongo-methods";

export const runtime = "nodejs";

const packagePrices: Record<string, number> = { Theme: 3000, Express: 2500, Group: 2199, Duo: 1800, Solo: 1500, "Mini Session": 999, "Baby Shower": 5000, "Engagement Party": 6000, Birthday: 7000, Christening: 8000, Debut: 10000, "Anniversary Celebration": 10000 };
const studioSessionDurations: Record<string, number> = { Theme: 60, Express: 60, Group: 60, Duo: 60, Solo: 60, "Mini Session": 30 };
const eventSessionDurations: Record<string, number> = { "Baby Shower": 240, "Engagement Party": 240, Birthday: 240, Christening: 240, Debut: 480, "Anniversary Celebration": 480 };
const studioAddonPrices: Record<string, number> = { "Extra Pax": 200, "+5 Edited Photos": 300, "HMUA (Hair & Makeup)": 1300, "Additional Hour": 800, "Extra Outfit": 300, "Rush Edit": 100 };
const eventAddonPrices: Record<string, number> = { "Additional hour of coverage": 3500, "Second photographer": 8000, "Same-day edit (reel)": 6000, "Express 7-day delivery": 5000, "Printed album, 20 spreads": 7500 };

type CheckoutRequest = { name?: unknown; email?: unknown; mobile?: unknown; session?: unknown; date?: unknown; time?: unknown; endTime?: unknown; startsAt?: unknown; holdId?: unknown; holdOwnerKey?: unknown; location?: unknown; promoCode?: unknown; pay?: unknown; addons?: unknown; termsAcceptance?: unknown };
type BookingRow = { id: string; client_id: string; client_profile_id: string; reference: string; paymongo_checkout_url: string | null; paymongo_checkout_session_id?: string | null; paymongo_checkout_expires_at?: string | null; request_fingerprint: string };
type CashBookingRow = { id: string; client_id: string; client_profile_id: string; reference: string; request_fingerprint: string };
type PreparedPayment = { payment: { id: string; status: string; checkout_url: string | null; provider_checkout_session_id: string | null }; invoice_id: string | null };
const short = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function termsInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as { accepted?: unknown; versionId?: unknown; contentHash?: unknown };
  return input.accepted === true && typeof input.versionId === "string" && /^[0-9a-f-]{36}$/i.test(input.versionId) && typeof input.contentHash === "string" && /^[0-9a-f]{64}$/.test(input.contentHash)
    ? { versionId: input.versionId, contentHash: input.contentHash }
    : null;
}

async function acceptTerms(admin: ReturnType<typeof getSupabaseAdmin>, bookingId: string, terms: { versionId: string; contentHash: string }, idempotencyKey: string, request: Request) {
  const environment = ["production", "staging", "development", "test"].includes(String(process.env.APP_ENV)) ? String(process.env.APP_ENV) : "development";
  const result = await admin.rpc("accept_booking_agreement", {
    requested_booking_id: bookingId,
    requested_user_id: null,
    requested_version_id: terms.versionId,
    requested_document_hash: terms.contentHash,
    requested_idempotency_key: `${idempotencyKey}:terms`,
    requested_method: "checkbox",
    requested_source: "public_website_booking",
    requested_environment: environment,
    requested_locale: request.headers.get("accept-language")?.split(",")[0]?.slice(0, 35) || "en-PH",
    requested_evidence_metadata: { request_id: request.headers.get("cf-ray")?.slice(0, 100) || crypto.randomUUID(), channel: "web" },
  });
  if (result.error) throw new Error(`BOOKING_TERMS_ACCEPTANCE_FAILED:${result.error.message}`);
  return result.data;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "Customer" };
}

function checkoutExpiry(value: unknown) {
  const fallback = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const parsed = typeof value === "number" && Number.isFinite(value)
    ? (value > 10_000_000_000 ? value : value * 1000)
    : typeof value === "string" ? Date.parse(value) : Number.NaN;
  return new Date(Number.isFinite(parsed) && parsed > Date.now() ? parsed : fallback).toISOString();
}

function buildBookingInsert(fields: {
  clientId: string; profileId: string; idempotencyKey: string; requestFingerprint: string;
  reference: string; session: string; serviceId: string; date: string; time: string;
  location: string; paymentType: string; subtotalAmount: number; totalAmount: number;
  holdId: string; holdOwnerTokenHash: string;
  durationMinutes: number;
}) {
  return {
    client_id: fields.clientId, client_profile_id: fields.profileId,
    idempotency_key: fields.idempotencyKey, request_fingerprint: fields.requestFingerprint,
    reference: fields.reference, service_type: fields.session, service_id: fields.serviceId,
    service_date: fields.date, service_time: fields.time, location: fields.location,
    payment_type: fields.paymentType, subtotal_amount_php: fields.subtotalAmount,
    total_amount_php: fields.totalAmount, payment_status: "pending",
    reservation_hold_id: fields.holdId, reservation_owner_token_hash: fields.holdOwnerTokenHash,
    duration_minutes_snapshot: fields.durationMinutes,
  };
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to submit this booking." }, { status: 403 });
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  let input: CheckoutRequest;
  try { input = await request.json() as CheckoutRequest; } catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const mobile = typeof input.mobile === "string" ? normalizeMobile(input.mobile) : "";
  const date = typeof input.date === "string" ? input.date : "";
  const time = typeof input.time === "string" ? input.time : "";
  const endTime = typeof input.endTime === "string" ? input.endTime : "";
  const startsAt = typeof input.startsAt === "string" ? input.startsAt : "";
  const holdId = typeof input.holdId === "string" ? input.holdId : "";
  const holdOwnerKey = typeof input.holdOwnerKey === "string" ? input.holdOwnerKey : "";
  if (!short(input.name, 120) || !isValidEmail(email) || !(mobile.startsWith("+63") && isValidPhMobile(mobile.slice(3))) || !short(input.session, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || Number.isNaN(Date.parse(startsAt)) || !/^[0-9a-f-]{36}$/i.test(holdId) || holdOwnerKey.length < 16 || holdOwnerKey.length > 200 || (input.pay !== "deposit" && input.pay !== "full" && input.pay !== "bnpl" && input.pay !== "cash")) return NextResponse.json({ error: "Refresh availability and reserve the selected time before checkout." }, { status: 400 });
  const packagePrice = packagePrices[input.session];
  if (!packagePrice) return NextResponse.json({ error: "Selected package is unavailable." }, { status: 400 });
  const addonPrices = studioSessionDurations[input.session] ? studioAddonPrices : eventAddonPrices;
  const addons = Array.isArray(input.addons) ? (input.addons as unknown[]).flatMap((addon) => {
    if (!addon || typeof addon !== "object") return [];
    const { name, quantity } = addon as { name?: unknown; quantity?: unknown };
    return typeof name === "string" && Number.isInteger(quantity) && Number(quantity) >= 1 && Number(quantity) <= 10 && addonPrices[name] ? [{ name, quantity: Number(quantity), price: addonPrices[name] }] : [];
  }).slice(0, 10) : [];
  if (Array.isArray(input.addons) && addons.length !== input.addons.length) return NextResponse.json({ error: "One or more selected add-ons are unavailable." }, { status: 400 });

  const packageSubtotal = packagePrice * 100;
  const addonTotal = addons.reduce((sum, addon) => sum + addon.price * addon.quantity * 100, 0);
  const subtotalAmount = packageSubtotal + addonTotal;
  const baseDuration = studioSessionDurations[input.session] ?? eventSessionDurations[input.session];
  if (!baseDuration) return NextResponse.json({ error: "Selected package duration is unavailable." }, { status: 400 });
  const additionalHours = addons.filter((addon) => addon.name === "Additional Hour" || addon.name === "Additional hour of coverage").reduce((sum, addon) => sum + addon.quantity, 0);
  const studioDuration = studioSessionDurations[input.session];
  const [startHour, startMinute] = time.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  if (studioDuration && (startMinutes < 8 * 60 || startMinutes + studioDuration > 17 * 60)) return NextResponse.json({ error: "Select a studio time between 8:00 AM and 5:00 PM." }, { status: 400 });
  if (studioDuration && startMinutes === 12 * 60) return NextResponse.json({ error: "12:00 PM is reserved for staff lunch. Please select a different time." }, { status: 400 });
  const eventCoverageMinutes = baseDuration + additionalHours * 60;
  let durationMinutes = eventCoverageMinutes;
  if (!studioDuration) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime)) return NextResponse.json({ error: "Enter both the event start and end time." }, { status: 400 });
    const [endHour, endMinute] = endTime.split(":").map(Number);
    durationMinutes = endHour * 60 + endMinute - startMinutes;
    if (durationMinutes < baseDuration) return NextResponse.json({ error: `This package requires at least ${baseDuration / 60} hours of coverage.` }, { status: 400 });
    if (durationMinutes > eventCoverageMinutes) return NextResponse.json({ error: `This package includes up to ${eventCoverageMinutes / 60} hours. Add coverage time or choose an earlier end time.` }, { status: 400 });
  }
  const requestFingerprint = await sha256(JSON.stringify({ name: input.name.trim(), email, mobile, session: input.session, date, time, endTime, startsAt, location: input.location, promoCode: input.promoCode, pay: input.pay, addons }));

  const addonDescription = addons.map((addon) => `${addon.name} × ${addon.quantity}`);
  const bookingTimeSummary = studioDuration ? time : `${time}–${endTime}`;
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) return NextResponse.json({ error: "Refresh the page and submit the booking again." }, { status: 400 });
  const acceptedTerms = termsInput(input.termsAcceptance);
  const currentTerms = await getCurrentBookingTerms();
  if (currentTerms && !acceptedTerms) return NextResponse.json({ error: "Accept the current Booking Terms and Conditions before continuing." }, { status: 428 });
  if (currentTerms && acceptedTerms && (acceptedTerms.versionId !== currentTerms.id || acceptedTerms.contentHash !== currentTerms.contentHash)) return NextResponse.json({ error: "The Booking Terms and Conditions changed. Review the current version and accept it before continuing." }, { status: 409 });
  const bookingLocation = typeof input.location === "string" && input.location.trim() ? input.location.trim().slice(0, 500) : "Kahel Studio, Cobo, Tabaco City";

  try {
    if (!await consumeCustomerRateLimit(request, "customer_booking", email, 6, "1 hour")) return NextResponse.json({ error: "Please wait before submitting another booking." }, { status: 429 });
    const admin = getSupabaseAdmin();
    const service = await resolveBookableService(input.session);
    if (!service) return NextResponse.json({ error: "Selected package is unavailable." }, { status: 400 });
    const serviceId = service.id;
    const holdOwnerTokenHash = await sha256(holdOwnerKey);

    if (input.pay === "cash") {
      const cashPrior = await admin.from("bookings").select("id,client_id,client_profile_id,reference,request_fingerprint").eq("idempotency_key", idempotencyKey).maybeSingle<CashBookingRow>();
      if (cashPrior.error) throw cashPrior.error;
      if (cashPrior.data) {
        if (cashPrior.data.request_fingerprint !== requestFingerprint) return NextResponse.json({ error: "This booking request was already used with different details. Refresh and try again." }, { status: 409 });
        if (acceptedTerms) await acceptTerms(admin, cashPrior.data.id, acceptedTerms, idempotencyKey, request);
        return NextResponse.json({ reference: cashPrior.data.reference, requestSaved: true });
      }
      const names = splitName(input.name);
      const profile = await getProfileByEmail(email) ?? await createCustomerProfile({ ...names, email, mobile });
      const reference = `KS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      let discountedPackageAmountCash = packageSubtotal;
      let discountPercentageCash = 0;
      let promoCodeIdCash: string | null = null;
      if (typeof input.promoCode === "string" && input.promoCode.trim().length > 0) {
        const promoValidation = await admin.rpc("validate_promo_code", {
          requested_code: input.promoCode,
          requested_client_id: profile.client_id,
          requested_booking_amount: packageSubtotal,
          requested_service_id: null,
        });
        if (promoValidation.error) return NextResponse.json({ error: promoValidation.error.message }, { status: 400 });
        const validation = promoValidation.data as { valid: boolean; discount_amount?: number; promo_code_id?: string; error?: string };
        if (!validation.valid) return NextResponse.json({ error: validation.error || "Invalid promo code" }, { status: 400 });
        discountedPackageAmountCash = packageSubtotal - (validation.discount_amount ?? 0);
        discountPercentageCash = validation.discount_amount ? Math.round((validation.discount_amount / packageSubtotal) * 100) : 0;
        promoCodeIdCash = validation.promo_code_id ?? null;
      }
      const totalAmountCash = discountedPackageAmountCash + addonTotal;

      const inserted = await admin.from("bookings").insert(buildBookingInsert({ clientId: profile.client_id, profileId: profile.id, idempotencyKey, requestFingerprint, reference, session: input.session, serviceId, date, time, location: bookingLocation, paymentType: "cash", subtotalAmount, totalAmount: totalAmountCash, holdId, holdOwnerTokenHash, durationMinutes })).select("id,client_id,client_profile_id,reference,request_fingerprint").single<CashBookingRow>();
      if (inserted.error) throw inserted.error;
      const cashBooking = inserted.data;

      if (promoCodeIdCash) {
        await admin.from("promo_code_usages").insert({
          promo_code_id: promoCodeIdCash,
          booking_id: cashBooking.id,
          client_id: profile.client_id,
          discount_amount: packageSubtotal - discountedPackageAmountCash,
        });
      }
      const cashAcceptance = acceptedTerms ? await acceptTerms(admin, cashBooking.id, acceptedTerms, idempotencyKey, request) : null;
      await auditCustomerEvent({ action: "booking_created", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: cashBooking.id });
      if (!profile.user_id) {
        try { await ensureCustomerAccount(profile, "booking"); }
        catch { await auditCustomerEvent({ action: "invitation_failed", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: cashBooking.id, metadata: { retry_required: true } }); }
      }
      const origin = process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;
      const cashAgreementPath = cashAcceptance ? `/portal/agreements/${cashAcceptance.id}` : null;
      const paymentSummaryCash = promoCodeIdCash
        ? `Cash at studio after authorized staff records and receipts it (Promo: ${discountPercentageCash}% off)`
        : "Cash at studio after authorized staff records and receipts it";
      await sendBookingConfirmation({ to: email, firstName: profile.first_name, reference, service: `${input.session}${addonDescription.length ? ` + ${addonDescription.join(", ")}` : ""}`, date, time: bookingTimeSummary, location: bookingLocation, paymentSummary: paymentSummaryCash, portalUrl: `${origin}/sign-in?next=%2Fportal%2Fbookings`, ...(currentTerms ? { termsVersionLabel: currentTerms.versionLabel, termsUrl: `${origin}/booking-terms` } : {}), ...(cashAgreementPath ? { agreementUrl: `${origin}/sign-in?next=${encodeURIComponent(cashAgreementPath)}` } : {}), clientId: profile.client_id, profileId: profile.id, bookingId: cashBooking.id });
      return NextResponse.json({ reference, requestSaved: true });
    }

    const production = String(process.env.APP_ENV) === "production";
    if (!secretKey || (production ? !secretKey.startsWith("sk_live_") : !secretKey.startsWith("sk_test_"))) return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
    const prior = await admin.from("bookings").select("id,client_id,client_profile_id,reference,paymongo_checkout_url,paymongo_checkout_session_id,paymongo_checkout_expires_at,request_fingerprint").eq("idempotency_key", idempotencyKey).maybeSingle<BookingRow>();
    if (prior.error) throw prior.error;
    if (prior.data && prior.data.request_fingerprint !== requestFingerprint) return NextResponse.json({ error: "This booking request was already used with different details. Refresh and try again." }, { status: 409 });

    const names = splitName(input.name);
    const profile = await getProfileByEmail(email) ?? await createCustomerProfile({ ...names, email, mobile });
    const reference = prior.data?.reference ?? `KS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    let discountedPackageAmountOnline = packageSubtotal;
    let discountPercentageOnline = 0;
    let promoCodeIdOnline: string | null = null;
    if (typeof input.promoCode === "string" && input.promoCode.trim().length > 0) {
      const promoValidation = await admin.rpc("validate_promo_code", {
        requested_code: input.promoCode,
        requested_client_id: profile.client_id,
        requested_booking_amount: packageSubtotal,
        requested_service_id: null,
      });
      if (promoValidation.error) return NextResponse.json({ error: promoValidation.error.message }, { status: 400 });
      const validation = promoValidation.data as { valid: boolean; discount_amount?: number; promo_code_id?: string; error?: string };
      if (!validation.valid) return NextResponse.json({ error: validation.error || "Invalid promo code" }, { status: 400 });
      discountedPackageAmountOnline = packageSubtotal - (validation.discount_amount ?? 0);
      discountPercentageOnline = validation.discount_amount ? Math.round((validation.discount_amount / packageSubtotal) * 100) : 0;
      promoCodeIdOnline = validation.promo_code_id ?? null;
    }
    const totalAmountOnline = discountedPackageAmountOnline + addonTotal;

    if (prior.data?.paymongo_checkout_url && prior.data.paymongo_checkout_session_id && prior.data.paymongo_checkout_expires_at && Date.parse(prior.data.paymongo_checkout_expires_at) > Date.now()) {
      if (promoCodeIdOnline) {
        await admin.from("promo_code_usages").insert({
          promo_code_id: promoCodeIdOnline,
          booking_id: prior.data.id,
          client_id: profile.client_id,
          discount_amount: packageSubtotal - discountedPackageAmountOnline,
        });
      }
      if (acceptedTerms) await acceptTerms(admin, prior.data.id, acceptedTerms, idempotencyKey, request);
      return NextResponse.json({ checkoutUrl: prior.data.paymongo_checkout_url, reference: prior.data.reference, reused: true });
    }

    const existing = prior.data;
    const checkoutExpired = !!(existing?.paymongo_checkout_session_id && existing.paymongo_checkout_expires_at && Date.parse(existing.paymongo_checkout_expires_at) <= Date.now());
    if (checkoutExpired && existing) {
      const reset = await (admin.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)("reset_booking_checkout_for_retry", {
        requested_booking_id: existing.id,
        requested_checkout_session_id: existing.paymongo_checkout_session_id!,
        requested_owner_token_hash: holdOwnerTokenHash,
        requested_expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      });
      if (reset.error) throw reset.error;
      const resetResult = reset.data as { reset?: boolean; reason?: string } | null;
      if (!resetResult?.reset) {
        return NextResponse.json({ error: resetResult?.reason === "booking_already_confirmed" ? "This booking is already confirmed." : "This checkout can no longer be used. Please start a new booking." }, { status: 409 });
      }
    }

    const packageAmountDue = Math.round(discountedPackageAmountOnline * (input.pay === "deposit" ? 0.5 : 1));
    const paymentDue = packageAmountDue + addonTotal;
    const paymentCapability = getPayMongoPaymentCapability(paymentDue, input.pay === "bnpl" ? "billease" : undefined);
    if (!paymentCapability.methods.length) return NextResponse.json({ error: input.pay === "bnpl" ? "Buy Now, Pay Later is unavailable for this booking amount. Choose another payment method." : "No online payment methods are configured." }, { status: input.pay === "bnpl" ? 409 : 503 });
    let booking = prior.data;
    if (!booking) {
      const inserted = await admin.from("bookings").insert(buildBookingInsert({ clientId: profile.client_id, profileId: profile.id, idempotencyKey, requestFingerprint, reference, session: input.session, serviceId, date, time, location: bookingLocation, paymentType: input.pay === "bnpl" ? "full" : input.pay, subtotalAmount, totalAmount: totalAmountOnline, holdId, holdOwnerTokenHash, durationMinutes })).select("id,client_id,client_profile_id,reference,paymongo_checkout_url,request_fingerprint").single<BookingRow>();
      if (inserted.error) {
        const concurrent = await admin.from("bookings").select("id,client_id,client_profile_id,reference,paymongo_checkout_url,request_fingerprint").eq("idempotency_key", idempotencyKey).maybeSingle<BookingRow>();
        if (!concurrent.data) throw inserted.error;
        if (concurrent.data.request_fingerprint !== requestFingerprint) return NextResponse.json({ error: "This booking request was already used with different details. Refresh and try again." }, { status: 409 });
        booking = concurrent.data;
      } else booking = inserted.data;
      await auditCustomerEvent({ action: "booking_created", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: booking.id });

      if (promoCodeIdOnline) {
        await admin.from("promo_code_usages").insert({
          promo_code_id: promoCodeIdOnline,
          booking_id: booking.id,
          client_id: profile.client_id,
          discount_amount: packageSubtotal - discountedPackageAmountOnline,
        });
      }
    } else {
      const linked = await admin.rpc("link_booking_hold", { requested_booking_id: booking.id, requested_reservation_id: holdId, requested_owner_token_hash: holdOwnerTokenHash });
      if (linked.error) throw linked.error;
    }

    const acceptance = acceptedTerms ? await acceptTerms(admin, booking.id, acceptedTerms, idempotencyKey, request) : null;

    const preparedResult = await admin.rpc("prepare_payment_collection", {
      requested_booking_id: booking.id,
      requested_processor: "paymongo",
      requested_source: "customer_checkout",
      requested_payment_method: "digital",
      requested_balance_component_centavos: paymentDue,
      requested_idempotency_key: `${idempotencyKey}:payment:${holdId}`,
      requested_add_ons: [],
      requested_create_invoice: false,
      requested_note: input.pay === "deposit" ? "Website booking deposit" : input.pay === "bnpl" ? "Website booking BillEase payment" : "Website booking full payment",
      requested_receipt: true,
      requested_actor_id: null,
    });
    if (preparedResult.error || !preparedResult.data) throw preparedResult.error ?? new Error("Payment preparation returned no result.");
    const prepared = preparedResult.data as unknown as PreparedPayment;
    if (prepared.payment.checkout_url && prepared.payment.provider_checkout_session_id) {
      return NextResponse.json({ checkoutUrl: prepared.payment.checkout_url, reference: booking.reference, reused: true });
    }
    if (prepared.payment.status !== "pending") return NextResponse.json({ error: "This payment attempt can no longer be used. Please try another payment method." }, { status: 409 });

    let invitationDelayed = false;
    if (!profile.user_id) {
      try { await ensureCustomerAccount(profile, "booking"); }
      catch {
        invitationDelayed = true;
        await auditCustomerEvent({ action: "invitation_failed", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: booking.id, metadata: { retry_required: true } });
      }
    }

    const claim = await admin.rpc("claim_booking_checkout", { requested_booking_id: booking.id });
    if (claim.error) throw claim.error;
    if (!claim.data) {
      const existing = await admin.from("bookings").select("paymongo_checkout_url").eq("id", booking.id).eq("client_id", booking.client_id).maybeSingle<{ paymongo_checkout_url: string | null }>();
      if (existing.data?.paymongo_checkout_url) return NextResponse.json({ checkoutUrl: existing.data.paymongo_checkout_url, reference: booking.reference, reused: true });
      return NextResponse.json({ error: "Your booking is already being processed.", bookingSaved: true, reference: booking.reference }, { status: 409 });
    }

    const origin = process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const addonLineItems = addons.map((addon) => ({ amount: addon.price * 100, currency: "PHP", name: addon.name, quantity: addon.quantity }));
    const controller = new AbortController();
    const providerTimeout = setTimeout(() => controller.abort(), 10_000);
    let paymongoResponse: Response;
    try {
      paymongoResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ data: { attributes: {
        billing: { name: input.name.trim(), email, phone: payMongoPhilippinePhone(mobile) },
        cancel_url: `${origin}/?checkout=cancelled&reference=${encodeURIComponent(booking.reference)}&booking=${encodeURIComponent(booking.id)}`, description: input.session,
        line_items: [{ amount: packageAmountDue, currency: "PHP", name: `${input.session} ${input.pay === "deposit" ? "50% deposit" : "full payment"}${discountPercentageOnline ? ` (${discountPercentageOnline}% promo)` : ""}`, quantity: 1 }, ...addonLineItems],
        metadata: { payment_id: prepared.payment.id, booking_id: booking.id, invoice_id: prepared.invoice_id ?? "", booking_date: date, booking_time: time, payment_type: input.pay === "bnpl" ? "full" : input.pay, preferred_payment_method: input.pay === "bnpl" ? "billease" : "", discount_percentage: String(discountPercentageOnline) },
        payment_method_types: paymentCapability.methods, reference_number: booking.reference, send_email_receipt: false, show_description: true, show_line_items: true,
        success_url: `${origin}/?checkout=success&reference=${encodeURIComponent(booking.reference)}&booking=${encodeURIComponent(booking.id)}`,
      } } }), cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("PayMongo checkout timed out. Retry this booking safely.");
      throw error;
    } finally {
      clearTimeout(providerTimeout);
    }
    const result = await paymongoResponse.json() as { data?: { id?: string; attributes?: { checkout_url?: string; expires_at?: number | string } }; errors?: Array<{ detail?: string }> };
    const checkoutUrl = result.data?.attributes?.checkout_url;
    const checkoutId = result.data?.id;
    if (!paymongoResponse.ok || !checkoutUrl || !checkoutId) {
      await admin.from("bookings").update({ checkout_creation_started_at: null }).eq("id", booking.id).eq("client_id", booking.client_id);
      return NextResponse.json({ error: "Your booking was saved, but checkout is temporarily unavailable.", bookingSaved: true, reference: booking.reference, invitationDelayed }, { status: 502 });
    }
    const checkoutExpiresAt = checkoutExpiry(result.data?.attributes?.expires_at);
    const activated = await admin.rpc("activate_booking_checkout", {
      requested_booking_id: booking.id,
      requested_checkout_session_id: checkoutId,
      requested_checkout_url: checkoutUrl,
      requested_checkout_expires_at: checkoutExpiresAt,
    });
    if (activated.error) throw activated.error;
    const marked = await admin.rpc("mark_paymongo_checkout", {
      requested_payment_id: prepared.payment.id,
      requested_checkout_session_id: checkoutId,
      requested_checkout_url: checkoutUrl,
      requested_checkout_expires_at: checkoutExpiresAt,
      requested_payment_intent_id: null,
    });
    if (marked.error) throw marked.error;
    const agreementPath = acceptance ? `/portal/agreements/${acceptance.id}` : null;
    const promoText = discountPercentageOnline > 0 ? ` (Promo: ${discountPercentageOnline}% off)` : "";
    const emailSent = await sendBookingConfirmation({ to: email, firstName: profile.first_name, reference: booking.reference, service: `${input.session}${addonDescription.length ? ` + ${addonDescription.join(", ")}` : ""}`, date, time: bookingTimeSummary, location: bookingLocation, paymentSummary: `${input.pay === "deposit" ? "Deposit and add-ons" : input.pay === "bnpl" ? "BillEase full payment" : "Full payment"}: PHP ${(paymentDue / 100).toLocaleString("en-PH")}${promoText}`, portalUrl: `${origin}/sign-in?next=%2Fportal%2Fbookings`, ...(currentTerms ? { termsVersionLabel: currentTerms.versionLabel, termsUrl: `${origin}/booking-terms` } : {}), ...(agreementPath ? { agreementUrl: `${origin}/sign-in?next=${encodeURIComponent(agreementPath)}` } : {}), clientId: booking.client_id, profileId: booking.client_profile_id, bookingId: booking.id });
    if (!emailSent) await auditCustomerEvent({ action: "booking_confirmation_delayed", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: booking.id, metadata: { retry_required: true } });
    return NextResponse.json({ checkoutUrl, reference: booking.reference, invitationDelayed, confirmationDelayed: !emailSent });
  } catch (error) {
    if (isBookingSlotConflict(error)) return NextResponse.json({ error: bookingConflictMessage(), conflict: true }, { status: 409 });
    if (error instanceof Error && error.message.startsWith("BOOKING_TERMS_ACCEPTANCE_FAILED:")) return NextResponse.json({ error: "Your booking was saved, but the terms acceptance could not be recorded. No payment was initiated. Please try again." }, { status: 409 });
    console.error("[paymongo-checkout] Booking submission failed", { message: error instanceof Error ? error.message : "unknown error" });
    return NextResponse.json({ error: "Unable to submit the booking right now." }, { status: 503 });
  }
}
