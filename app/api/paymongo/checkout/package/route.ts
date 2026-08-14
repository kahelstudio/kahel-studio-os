import { NextResponse } from "next/server";
import { auditCustomerEvent, consumeCustomerRateLimit, createCustomerProfile, ensureCustomerAccount, getProfileByEmail, hasTrustedOrigin, isValidEmail, normalizeEmail, normalizeMobile } from "@/lib/server/customer-auth";
import { sendBookingConfirmation } from "@/lib/server/customer-email";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getCurrentBookingTerms } from "@/lib/server/legal-documents";

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

type PackageRequest = {
  name?: unknown; email?: unknown; mobile?: unknown;
  studioSession?: unknown; studioDate?: unknown; studioTime?: unknown; studioAddons?: unknown;
  eventSession?: unknown; eventDate?: unknown; eventTime?: unknown; eventLocation?: unknown; eventAddons?: unknown;
  pay?: unknown; promoCode?: unknown; termsAcceptance?: unknown;
};

type CreatedBooking = { id: string; client_id: string; client_profile_id: string; reference: string };

const short = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function termsInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as { accepted?: unknown; versionId?: unknown; contentHash?: unknown };
  return input.accepted === true && typeof input.versionId === "string" && /^[0-9a-f-]{36}$/i.test(input.versionId) && typeof input.contentHash === "string" && /^[0-9a-f]{64}$/.test(input.contentHash)
    ? { versionId: input.versionId, contentHash: input.contentHash }
    : null;
}

function parseAddons(raw: unknown, prices: Record<string, number>) {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).flatMap((addon) => {
    if (!addon || typeof addon !== "object") return [];
    const { name, quantity } = addon as { name?: unknown; quantity?: unknown };
    return typeof name === "string" && Number.isInteger(quantity) && Number(quantity) >= 1 && Number(quantity) <= 10 && prices[name]
      ? [{ name, quantity: Number(quantity), price: prices[name] }]
      : [];
  }).slice(0, 10);
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
    requested_evidence_metadata: { request_id: request.headers.get("cf-ray")?.slice(0, 100) || crypto.randomUUID(), channel: "web", booking_type: "pre_event_package" },
  });
  if (result.error) throw new Error(`BOOKING_TERMS_ACCEPTANCE_FAILED:${result.error.message}`);
  return result.data;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "Customer" };
}

function makeReference() {
  return `KS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function makeFingerprint(key: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to submit this booking." }, { status: 403 });

  let input: PackageRequest;
  try { input = await request.json() as PackageRequest; } catch { return NextResponse.json({ error: "Invalid booking request." }, { status: 400 }); }

  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const mobile = typeof input.mobile === "string" ? normalizeMobile(input.mobile) : "";
  const studioDate = typeof input.studioDate === "string" ? input.studioDate : "";
  const studioTime = typeof input.studioTime === "string" ? input.studioTime : "";
  const eventDate = typeof input.eventDate === "string" ? input.eventDate : "";
  const eventTime = typeof input.eventTime === "string" ? input.eventTime : "";

  if (
    !short(input.name, 120) || !isValidEmail(email) || !/^\+639\d{9}$/.test(mobile) ||
    !short(input.studioSession, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(studioDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(studioTime) ||
    !short(input.eventSession, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(eventTime) ||
    (input.pay !== "deposit" && input.pay !== "full" && input.pay !== "cash")
  ) return NextResponse.json({ error: "Complete all required booking details before submitting." }, { status: 400 });

  if (!studioSessionDurations[input.studioSession as string]) return NextResponse.json({ error: "Selected studio session is unavailable." }, { status: 400 });
  if (packagePrices[input.studioSession as string] === undefined) return NextResponse.json({ error: "Selected studio session is unavailable." }, { status: 400 });
  if (packagePrices[input.eventSession as string] === undefined) return NextResponse.json({ error: "Selected event package is unavailable." }, { status: 400 });
  if (studioSessionDurations[input.eventSession as string]) return NextResponse.json({ error: "Select an event package (not a studio session) for the event date." }, { status: 400 });

  const studioDuration = studioSessionDurations[input.studioSession as string];
  const [studioStartHour, studioStartMin] = studioTime.split(":").map(Number);
  const studioStartMinutes = studioStartHour * 60 + studioStartMin;
  if (studioStartMinutes < 8 * 60 || studioStartMinutes + studioDuration > 17 * 60) return NextResponse.json({ error: "Select a studio time between 8:00 AM and 5:00 PM." }, { status: 400 });

  if (studioDate === eventDate && studioTime === eventTime) return NextResponse.json({ error: "The pre-event shoot and event must be on different dates or times." }, { status: 400 });

  const studioAddons = parseAddons(input.studioAddons, studioAddonPrices);
  const eventAddons = parseAddons(input.eventAddons, eventAddonPrices);
  if (Array.isArray(input.studioAddons) && studioAddons.length !== input.studioAddons.length) return NextResponse.json({ error: "One or more selected studio add-ons are unavailable." }, { status: 400 });
  if (Array.isArray(input.eventAddons) && eventAddons.length !== input.eventAddons.length) return NextResponse.json({ error: "One or more selected event add-ons are unavailable." }, { status: 400 });

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) return NextResponse.json({ error: "Refresh the page and submit the booking again." }, { status: 400 });

  const acceptedTerms = termsInput(input.termsAcceptance);
  if (!acceptedTerms) return NextResponse.json({ error: "Accept the current Booking Terms and Conditions before continuing." }, { status: 428 });

  const currentTerms = await getCurrentBookingTerms();
  if (!currentTerms) return NextResponse.json({ error: "Booking terms are temporarily unavailable. No booking has been saved." }, { status: 503 });
  if (acceptedTerms.versionId !== currentTerms.id || acceptedTerms.contentHash !== currentTerms.contentHash) return NextResponse.json({ error: "The Booking Terms and Conditions changed. Review the current version and accept it before continuing." }, { status: 409 });

  const eventLocation = typeof input.eventLocation === "string" && input.eventLocation.trim() ? input.eventLocation.trim().slice(0, 500) : "To be confirmed";
  const studioLocation = "Kahel Studio, Cobo, Tabaco City";

  const studioIdempotencyKey = `${idempotencyKey}:studio`;
  const eventIdempotencyKey = `${idempotencyKey}:event`;

  try {
    if (!await consumeCustomerRateLimit(request, "customer_booking", email, 6, "1 hour")) return NextResponse.json({ error: "Please wait before submitting another booking." }, { status: 429 });
    const admin = getSupabaseAdmin();

    // Idempotency: return early if both bookings already exist
    const [studioExisting, eventExisting] = await Promise.all([
      admin.from("bookings").select("id,reference").eq("idempotency_key", studioIdempotencyKey).maybeSingle<{ id: string; reference: string }>(),
      admin.from("bookings").select("id,reference").eq("idempotency_key", eventIdempotencyKey).maybeSingle<{ id: string; reference: string }>(),
    ]);
    if (studioExisting.data && eventExisting.data) {
      return NextResponse.json({ studioReference: studioExisting.data.reference, eventReference: eventExisting.data.reference, requestSaved: true });
    }

    // Conflict check: ensure neither date+time is already taken
    const [studioConflict, eventConflict] = await Promise.all([
      admin.from("bookings").select("id").eq("service_date", studioDate).eq("service_time", studioTime).not("status", "in", '("cancelled","inquiry")').maybeSingle(),
      admin.from("bookings").select("id").eq("service_date", eventDate).eq("service_time", eventTime).not("status", "in", '("cancelled","inquiry")').maybeSingle(),
    ]);
    if (studioConflict.data) return NextResponse.json({ error: "The pre-event shoot date and time is no longer available. Please select a different slot." }, { status: 409 });
    if (eventConflict.data) return NextResponse.json({ error: "The event date and time is no longer available. Please select a different slot." }, { status: 409 });

    const names = splitName(input.name as string);
    const profile = await getProfileByEmail(email) ?? await createCustomerProfile({ ...names, email, mobile });

    const studioPrice = packagePrices[input.studioSession as string];
    const studioAddonTotal = studioAddons.reduce((sum, a) => sum + a.price * a.quantity * 100, 0);
    const studioSubtotal = studioPrice * 100;
    const studioTotal = studioSubtotal + studioAddonTotal;

    const eventPrice = packagePrices[input.eventSession as string];
    const eventAddonTotal = eventAddons.reduce((sum, a) => sum + a.price * a.quantity * 100, 0);
    const eventSubtotal = eventPrice * 100;
    const eventTotal = eventSubtotal + eventAddonTotal;

    const [studioFingerprint, eventFingerprint] = await Promise.all([
      makeFingerprint(studioIdempotencyKey),
      makeFingerprint(eventIdempotencyKey),
    ]);

    const studioReference = makeReference();
    const eventReference = makeReference();

    const [studioInserted, eventInserted] = await Promise.all([
      admin.from("bookings").insert({
        client_id: profile.client_id, client_profile_id: profile.id,
        idempotency_key: studioIdempotencyKey, request_fingerprint: studioFingerprint,
        reference: studioReference, service_type: input.studioSession as string,
        service_id: await resolveServiceId(admin, input.studioSession as string),
        service_date: studioDate, service_time: studioTime, location: studioLocation,
        payment_type: input.pay, subtotal_amount_php: studioSubtotal, total_amount_php: studioTotal,
        payment_status: "pending",
      }).select("id,client_id,client_profile_id,reference").single<CreatedBooking>(),

      admin.from("bookings").insert({
        client_id: profile.client_id, client_profile_id: profile.id,
        idempotency_key: eventIdempotencyKey, request_fingerprint: eventFingerprint,
        reference: eventReference, service_type: input.eventSession as string,
        service_id: await resolveServiceId(admin, input.eventSession as string),
        service_date: eventDate, service_time: eventTime, location: eventLocation,
        payment_type: input.pay, subtotal_amount_php: eventSubtotal, total_amount_php: eventTotal,
        payment_status: "pending",
      }).select("id,client_id,client_profile_id,reference").single<CreatedBooking>(),
    ]);

    if (studioInserted.error) throw studioInserted.error;
    if (eventInserted.error) throw eventInserted.error;

    const studioBooking = studioInserted.data;
    const eventBooking = eventInserted.data;

    // Cross-link the two bookings
    await Promise.all([
      admin.from("bookings").update({ linked_booking_id: eventBooking.id }).eq("id", studioBooking.id),
      admin.from("bookings").update({ linked_booking_id: studioBooking.id }).eq("id", eventBooking.id),
    ]);

    // Accept terms for both bookings
    await Promise.all([
      acceptTerms(admin, studioBooking.id, acceptedTerms, studioIdempotencyKey, request),
      acceptTerms(admin, eventBooking.id, acceptedTerms, eventIdempotencyKey, request),
    ]);

    await Promise.all([
      auditCustomerEvent({ action: "booking_created", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: studioBooking.id }),
      auditCustomerEvent({ action: "booking_created", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: eventBooking.id }),
    ]);

    if (!profile.user_id) {
      try { await ensureCustomerAccount(profile, "booking"); }
      catch { await auditCustomerEvent({ action: "invitation_failed", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: studioBooking.id, metadata: { retry_required: true } }); }
    }

    const origin = process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const studioAddonDesc = studioAddons.map((a) => `${a.name} × ${a.quantity}`);
    const eventAddonDesc = eventAddons.map((a) => `${a.name} × ${a.quantity}`);

    await sendBookingConfirmation({
      to: email,
      firstName: profile.first_name,
      reference: studioReference,
      service: `Pre-Event Package — ${input.studioSession as string}${studioAddonDesc.length ? ` + ${studioAddonDesc.join(", ")}` : ""} (pre-event shoot) & ${input.eventSession as string}${eventAddonDesc.length ? ` + ${eventAddonDesc.join(", ")}` : ""} (event)`,
      date: studioDate,
      time: studioTime,
      location: studioLocation,
      paymentSummary: "We'll contact you to confirm both bookings and arrange payment.",
      portalUrl: `${origin}/sign-in?next=%2Fportal%2Fbookings`,
      termsVersionLabel: currentTerms.versionLabel,
      termsUrl: `${origin}/booking-terms`,
      clientId: profile.client_id,
      profileId: profile.id,
      bookingId: studioBooking.id,
    });

    return NextResponse.json({ studioReference, eventReference, requestSaved: true });
  } catch (error) {
    console.error("Package booking error:", error);
    return NextResponse.json({ error: "Unable to save your booking. Please try again." }, { status: 500 });
  }
}
