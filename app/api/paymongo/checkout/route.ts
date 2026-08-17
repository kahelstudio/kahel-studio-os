import { NextResponse } from "next/server";
import { auditCustomerEvent, consumeCustomerRateLimit, createCustomerProfile, ensureCustomerAccount, getProfileByEmail, hasTrustedOrigin, isValidEmail, normalizeEmail, normalizeMobile } from "@/lib/server/customer-auth";
import { sendBookingConfirmation } from "@/lib/server/customer-email";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getCurrentBookingTerms } from "@/lib/server/legal-documents";
import { isValidPhMobile } from "@/lib/phone";

export const runtime = "nodejs";

const packagePrices: Record<string, number> = { Theme: 3000, Express: 2500, Group: 2199, Duo: 1800, Solo: 1500, "Mini Session": 999, "Baby Shower": 5000, "Engagement Party": 6000, Birthday: 7000, Christening: 8000, Debut: 10000, "Anniversary Celebration": 10000 };
const studioSessionDurations: Record<string, number> = { Theme: 60, Express: 60, Group: 60, Duo: 60, Solo: 60, "Mini Session": 30 };
const studioAddonPrices: Record<string, number> = { "Extra Pax": 200, "+5 Edited Photos": 300, "HMUA (Hair & Makeup)": 1300, "Additional Hour": 800, "Extra Outfit": 300, "Rush Edit": 100 };
const eventAddonPrices: Record<string, number> = { "Additional hour of coverage": 3500, "Second photographer": 8000, "Same-day edit (reel)": 6000, "Express 7-day delivery": 5000, "Printed album, 20 spreads": 7500 };

function serviceCode(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "session";
}

async function resolveServiceId(admin: ReturnType<typeof getSupabaseAdmin>, name: string) {
  const code = serviceCode(name);
  const { data: existing } = await admin.from("services").select("id").eq("code", code).maybeSingle<{ id: string }>();
  if (existing?.id) return existing.id;
  const { data: created } = await admin.from("services").upsert({ code, name, active: true }, { onConflict: "code" }).select("id").single<{ id: string }>();
  return created?.id ?? "00000000-0000-0000-0000-000000000000";
}
type CheckoutRequest = { name?: unknown; email?: unknown; mobile?: unknown; session?: unknown; date?: unknown; time?: unknown; location?: unknown; promoCode?: unknown; pay?: unknown; addons?: unknown; termsAcceptance?: unknown };
type BookingRow = { id: string; client_id: string; client_profile_id: string; reference: string; paymongo_checkout_url: string | null };
type CashBookingRow = { id: string; client_id: string; client_profile_id: string; reference: string };
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

function buildBookingInsert(fields: {
  clientId: string; profileId: string; idempotencyKey: string; requestFingerprint: string;
  reference: string; session: string; serviceId: string; date: string; time: string;
  location: string; paymentType: string; subtotalAmount: number; totalAmount: number;
}) {
  return {
    client_id: fields.clientId, client_profile_id: fields.profileId,
    idempotency_key: fields.idempotencyKey, request_fingerprint: fields.requestFingerprint,
    reference: fields.reference, service_type: fields.session, service_id: fields.serviceId,
    service_date: fields.date, service_time: fields.time, location: fields.location,
    payment_type: fields.paymentType, subtotal_amount_php: fields.subtotalAmount,
    total_amount_php: fields.totalAmount, payment_status: "pending",
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
  if (!short(input.name, 120) || !isValidEmail(email) || !(mobile.startsWith("+63") && isValidPhMobile(mobile.slice(3))) || !short(input.session, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || (input.pay !== "deposit" && input.pay !== "full" && input.pay !== "cash")) return NextResponse.json({ error: "Complete the required booking details before checkout." }, { status: 400 });
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

  const addonDescription = addons.map((addon) => `${addon.name} × ${addon.quantity}`);
  const studioDuration = studioSessionDurations[input.session];
  const [startHour, startMinute] = time.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  if (studioDuration && (startMinutes < 8 * 60 || startMinutes + studioDuration > 17 * 60)) return NextResponse.json({ error: "Select a studio time between 8:00 AM and 5:00 PM." }, { status: 400 });
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

    if (input.pay === "cash") {
      const cashPrior = await admin.from("bookings").select("id,client_id,client_profile_id,reference").eq("idempotency_key", idempotencyKey).maybeSingle<CashBookingRow>();
      if (cashPrior.error) throw cashPrior.error;
      if (cashPrior.data) { if (acceptedTerms) await acceptTerms(admin, cashPrior.data.id, acceptedTerms, idempotencyKey, request); return NextResponse.json({ reference: cashPrior.data.reference, requestSaved: true }); }
      const { data: conflict } = await admin.from("bookings").select("id").eq("service_date", date).eq("service_time", time).not("status", "in", '("cancelled","inquiry")').maybeSingle();
      if (conflict) return NextResponse.json({ error: "This date and time is no longer available. Please select a different slot." }, { status: 409 });
      const names = splitName(input.name);
      const profile = await getProfileByEmail(email) ?? await createCustomerProfile({ ...names, email, mobile });
      const reference = `KS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const serviceId = await resolveServiceId(admin, input.session);

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

      const fingerprintHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(idempotencyKey));
      const requestFingerprint = [...new Uint8Array(fingerprintHash)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const inserted = await admin.from("bookings").insert(buildBookingInsert({ clientId: profile.client_id, profileId: profile.id, idempotencyKey, requestFingerprint, reference, session: input.session, serviceId, date, time, location: bookingLocation, paymentType: "cash", subtotalAmount, totalAmount: totalAmountCash })).select("id,client_id,client_profile_id,reference").single<CashBookingRow>();
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
      await sendBookingConfirmation({ to: email, firstName: profile.first_name, reference, service: `${input.session}${addonDescription.length ? ` + ${addonDescription.join(", ")}` : ""}`, date, time, location: bookingLocation, paymentSummary: paymentSummaryCash, portalUrl: `${origin}/sign-in?next=%2Fportal%2Fbookings`, ...(currentTerms ? { termsVersionLabel: currentTerms.versionLabel, termsUrl: `${origin}/booking-terms` } : {}), ...(cashAgreementPath ? { agreementUrl: `${origin}/sign-in?next=${encodeURIComponent(cashAgreementPath)}` } : {}), clientId: profile.client_id, profileId: profile.id, bookingId: cashBooking.id });
      return NextResponse.json({ reference, requestSaved: true });
    }

    if (!secretKey || !/^sk_(test|live)_/.test(secretKey) || (String(process.env.APP_ENV) !== "production" && secretKey.startsWith("sk_live_"))) return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
    const prior = await admin.from("bookings").select("id,client_id,client_profile_id,reference,paymongo_checkout_url").eq("idempotency_key", idempotencyKey).maybeSingle<BookingRow>();
    if (prior.error) throw prior.error;

    if (!prior.data) {
      const { data: conflict } = await admin.from("bookings").select("id").eq("service_date", date).eq("service_time", time).not("status", "in", '("cancelled","inquiry")').maybeSingle();
      if (conflict) return NextResponse.json({ error: "This date and time is no longer available. Please select a different slot." }, { status: 409 });
    }

    const names = splitName(input.name);
    const profile = await getProfileByEmail(email) ?? await createCustomerProfile({ ...names, email, mobile });
    const reference = prior.data?.reference ?? `KS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const serviceId = await resolveServiceId(admin, input.session);

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

    if (prior.data?.paymongo_checkout_url) {
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

    if (!prior.data) {
      const { data: conflict } = await admin.from("bookings").select("id").eq("service_date", date).eq("service_time", time).not("status", "in", '("cancelled","inquiry")').maybeSingle();
      if (conflict) return NextResponse.json({ error: "This date and time is no longer available. Please select a different slot." }, { status: 409 });
    }

    const packageAmountDue = Math.round(discountedPackageAmountOnline * (input.pay === "deposit" ? 0.5 : 1));
    let booking = prior.data;
    if (!booking) {
      const fingerprintHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(idempotencyKey));
      const requestFingerprint = [...new Uint8Array(fingerprintHash)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const inserted = await admin.from("bookings").insert(buildBookingInsert({ clientId: profile.client_id, profileId: profile.id, idempotencyKey, requestFingerprint, reference, session: input.session, serviceId, date, time, location: bookingLocation, paymentType: input.pay, subtotalAmount, totalAmount: totalAmountOnline })).select("id,client_id,client_profile_id,reference,paymongo_checkout_url").single<BookingRow>();
      if (inserted.error) {
        const concurrent = await admin.from("bookings").select("id,client_id,client_profile_id,reference,paymongo_checkout_url").eq("idempotency_key", idempotencyKey).maybeSingle<BookingRow>();
        if (!concurrent.data) throw inserted.error;
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
    }

    const acceptance = acceptedTerms ? await acceptTerms(admin, booking.id, acceptedTerms, idempotencyKey, request) : null;

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
    const paymongoResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { attributes: {
        billing: { name: input.name.trim(), email, phone: mobile },
        cancel_url: `${origin}/?checkout=cancelled`, description: input.session,
        line_items: [{ amount: packageAmountDue, currency: "PHP", name: `${input.session} ${input.pay === "deposit" ? "50% deposit" : "full payment"}${discountPercentageOnline ? ` (${discountPercentageOnline}% promo)` : ""}`, quantity: 1 }, ...addonLineItems],
        metadata: { booking_id: booking.id, booking_date: date, booking_time: time, payment_type: input.pay, discount_percentage: discountPercentageOnline },
        payment_method_types: ["card", "gcash", "paymaya", "grab_pay", "qrph"], reference_number: booking.reference, send_email_receipt: false, show_description: true, show_line_items: true,
        success_url: `${origin}/?checkout=success&reference=${encodeURIComponent(booking.reference)}`,
      } } }), cache: "no-store",
    });
    const result = await paymongoResponse.json() as { data?: { id?: string; attributes?: { checkout_url?: string } }; errors?: Array<{ detail?: string }> };
    const checkoutUrl = result.data?.attributes?.checkout_url;
    if (!paymongoResponse.ok || !checkoutUrl) {
      await admin.from("bookings").update({ checkout_creation_started_at: null }).eq("id", booking.id).eq("client_id", booking.client_id);
      return NextResponse.json({ error: "Your booking was saved, but checkout is temporarily unavailable.", bookingSaved: true, reference: booking.reference, invitationDelayed }, { status: 502 });
    }
    const updated = await admin.from("bookings").update({ paymongo_checkout_session_id: result.data?.id ?? null, paymongo_checkout_url: checkoutUrl, checkout_creation_started_at: null }).eq("id", booking.id).eq("client_id", booking.client_id);
    if (updated.error) throw updated.error;
    const agreementPath = acceptance ? `/portal/agreements/${acceptance.id}` : null;
    const paymentDue = packageAmountDue + addonTotal;
    const promoText = discountPercentageOnline > 0 ? ` (Promo: ${discountPercentageOnline}% off)` : "";
    const emailSent = await sendBookingConfirmation({ to: email, firstName: profile.first_name, reference: booking.reference, service: `${input.session}${addonDescription.length ? ` + ${addonDescription.join(", ")}` : ""}`, date, time, location: bookingLocation, paymentSummary: `${input.pay === "deposit" ? "Deposit and add-ons" : "Full payment"}: PHP ${(paymentDue / 100).toLocaleString("en-PH")}${promoText}`, portalUrl: `${origin}/sign-in?next=%2Fportal%2Fbookings`, ...(currentTerms ? { termsVersionLabel: currentTerms.versionLabel, termsUrl: `${origin}/booking-terms` } : {}), ...(agreementPath ? { agreementUrl: `${origin}/sign-in?next=${encodeURIComponent(agreementPath)}` } : {}), clientId: booking.client_id, profileId: booking.client_profile_id, bookingId: booking.id });
    if (!emailSent) await auditCustomerEvent({ action: "booking_confirmation_delayed", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: booking.id, metadata: { retry_required: true } });
    return NextResponse.json({ checkoutUrl, reference: booking.reference, invitationDelayed, confirmationDelayed: !emailSent });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BOOKING_TERMS_ACCEPTANCE_FAILED:")) return NextResponse.json({ error: "Your booking was saved, but the terms acceptance could not be recorded. No payment was initiated. Please try again." }, { status: 409 });
    return NextResponse.json({ error: "Unable to submit the booking right now." }, { status: 503 });
  }
}
