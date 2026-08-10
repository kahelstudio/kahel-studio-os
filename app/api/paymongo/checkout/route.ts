import { NextResponse } from "next/server";
import { auditCustomerEvent, consumeCustomerRateLimit, createCustomerProfile, ensureCustomerAccount, getProfileByEmail, hasTrustedOrigin, isValidEmail, normalizeEmail, normalizeMobile } from "@/lib/server/customer-auth";
import { sendBookingConfirmation } from "@/lib/server/customer-email";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const packagePrices: Record<string, number> = { Theme: 3000, Express: 2500, Group: 2199, Duo: 1800, Solo: 1500, "Mini Session": 999, "Baby Shower": 5000, "Engagement Party": 6000, Birthday: 7000, Christening: 8000, Debut: 10000, "Anniversary Celebration": 10000 };
const studioSessionDurations: Record<string, number> = { Theme: 60, Express: 60, Group: 60, Duo: 60, Solo: 60, "Mini Session": 30 };

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
type CheckoutRequest = { name?: unknown; email?: unknown; mobile?: unknown; session?: unknown; date?: unknown; time?: unknown; location?: unknown; pay?: unknown };
type BookingRow = { id: string; client_id: string; client_profile_id: string; reference: string; paymongo_checkout_url: string | null };
const short = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "Customer" };
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to submit this booking." }, { status: 403 });
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey || !/^sk_(test|live)_/.test(secretKey) || (String(process.env.APP_ENV) !== "production" && secretKey.startsWith("sk_live_"))) return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
  let input: CheckoutRequest;
  try { input = await request.json() as CheckoutRequest; } catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  const mobile = typeof input.mobile === "string" ? normalizeMobile(input.mobile) : "";
  const date = typeof input.date === "string" ? input.date : "";
  const time = typeof input.time === "string" ? input.time : "";
  if (!short(input.name, 120) || !isValidEmail(email) || !/^\+639\d{9}$/.test(mobile) || !short(input.session, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(time) || (input.pay !== "deposit" && input.pay !== "full")) return NextResponse.json({ error: "Complete the required booking details before checkout." }, { status: 400 });
  const packagePrice = packagePrices[input.session];
  if (!packagePrice) return NextResponse.json({ error: "Selected package is unavailable." }, { status: 400 });
  const studioDuration = studioSessionDurations[input.session];
  const [startHour, startMinute] = time.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  if (studioDuration && (startMinutes < 8 * 60 || startMinutes + studioDuration > 17 * 60)) return NextResponse.json({ error: "Select a studio time between 8:00 AM and 5:00 PM." }, { status: 400 });
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) return NextResponse.json({ error: "Refresh the page and submit the booking again." }, { status: 400 });

  try {
    if (!await consumeCustomerRateLimit(request, "customer_booking", email, 6, "1 hour")) return NextResponse.json({ error: "Please wait before submitting another booking." }, { status: 429 });
    const admin = getSupabaseAdmin();
    const prior = await admin.from("bookings").select("id,client_id,client_profile_id,reference,paymongo_checkout_url").eq("idempotency_key", idempotencyKey).maybeSingle<BookingRow>();
    if (prior.error) throw prior.error;
    if (prior.data?.paymongo_checkout_url) return NextResponse.json({ checkoutUrl: prior.data.paymongo_checkout_url, reference: prior.data.reference, reused: true });

    const names = splitName(input.name);
    const profile = await getProfileByEmail(email) ?? await createCustomerProfile({ ...names, email, mobile });
    const reference = prior.data?.reference ?? `KS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const serviceId = await resolveServiceId(admin, input.session);
    const totalAmount = packagePrice * 100;
    const amountDue = Math.round(totalAmount * (input.pay === "deposit" ? 0.5 : 1));
    let booking = prior.data;
    if (!booking) {
      const fingerprintHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(idempotencyKey));
      const requestFingerprint = [...new Uint8Array(fingerprintHash)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const inserted = await admin.from("bookings").insert({
        client_id: profile.client_id,
        client_profile_id: profile.id,
        idempotency_key: idempotencyKey,
        request_fingerprint: requestFingerprint,
        reference,
        service_type: input.session,
        service_id: serviceId,
        service_date: date,
        service_time: time,
        location: typeof input.location === "string" && input.location.trim() ? input.location.trim().slice(0, 500) : "Kahel Studio, Cobo, Tabaco City",
        payment_type: input.pay,
        subtotal_amount_php: totalAmount,
        total_amount_php: totalAmount,
        payment_status: "pending",
      }).select("id,client_id,client_profile_id,reference,paymongo_checkout_url").single<BookingRow>();
      if (inserted.error) {
        const concurrent = await admin.from("bookings").select("id,client_id,client_profile_id,reference,paymongo_checkout_url").eq("idempotency_key", idempotencyKey).maybeSingle<BookingRow>();
        if (!concurrent.data) throw inserted.error;
        booking = concurrent.data;
      } else booking = inserted.data;
      await auditCustomerEvent({ action: "booking_created", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: booking.id });
    }

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
    const paymongoResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { attributes: {
        billing: { name: input.name.trim(), email, phone: mobile },
        cancel_url: `${origin}/?checkout=cancelled`, description: input.session,
        line_items: [{ amount: amountDue, currency: "PHP", name: `${input.session} ${input.pay === "deposit" ? "50% deposit" : "full payment"}`, quantity: 1 }],
        metadata: { booking_id: booking.id, booking_date: date, booking_time: time, payment_type: input.pay },
        payment_method_types: ["card", "gcash", "qrph"], reference_number: booking.reference, send_email_receipt: true, show_description: true, show_line_items: true,
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
    const emailSent = await sendBookingConfirmation({ to: email, firstName: profile.first_name, reference: booking.reference, service: input.session, date, time, portalUrl: `${origin}/sign-in?next=%2Fportal%2Fbookings` });
    if (!emailSent) await auditCustomerEvent({ action: "booking_confirmation_delayed", clientId: profile.client_id, profileId: profile.id, entityType: "booking", entityId: booking.id, metadata: { retry_required: true } });
    return NextResponse.json({ checkoutUrl, reference: booking.reference, invitationDelayed, confirmationDelayed: !emailSent });
  } catch {
    return NextResponse.json({ error: "Unable to submit the booking right now." }, { status: 503 });
  }
}
