import { after, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getPaymentReceipt } from "@/lib/server/payments-data";
import { sendPaymentReceipt } from "@/lib/server/payment-receipt-email";

export const runtime = "nodejs";

const REPLAY_TOLERANCE_SECONDS = 5 * 60;
const PAID_EVENT = "checkout_session.payment.paid";
const FAILURE_EVENTS = new Set(["checkout_session.payment.failed", "checkout_session.expired"]);

type JsonObject = Record<string, unknown>;
type ParsedEvent = {
  eventId: string;
  eventType: string;
  eventOccurredAt: string;
  checkoutId: string;
  metadataPaymentId: string | null;
  bookingId: string | null;
  reference: string | null;
  amount: number | null;
  currency: string | null;
  paymentId: string | null;
  paymentIntentId: string | null;
  paymentMethod: string | null;
  description: string | null;
  paidAt: string | null;
  availableAt: string | null;
  creditedAt: string | null;
  livemode: boolean | null;
};
type PaidCheckout = ParsedEvent & { paymentId: string; paidAt: string };
type BookingRow = {
  id: string;
  reference: string;
  payment_type: string;
  currency: string;
  total_amount_php: number;
  paid_amount_php: number;
  payment_status: string;
  paymongo_checkout_session_id: string | null;
  paymongo_payment_id: string | null;
  paymongo_payment_intent_id: string | null;
  paymongo_payment_method: string | null;
  paymongo_payment_description: string | null;
  paymongo_paid_at: string | null;
  paymongo_available_at: string | null;
  paymongo_credited_at: string | null;
};

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integer(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function timestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    if (/^\d+(?:\.\d+)?$/.test(value)) return timestamp(Number(value));
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function firstTimestamp(...values: unknown[]): string | null {
  for (const value of values) {
    const parsed = timestamp(value);
    if (parsed) return parsed;
  }
  return null;
}

export function parsePayMongoEvent(payload: unknown, receivedAt = new Date()): ParsedEvent | null {
  const root = object(payload);
  const eventData = object(root?.data);
  const eventAttributes = object(eventData?.attributes);
  const checkoutData = object(eventAttributes?.data);
  const checkout = object(checkoutData?.attributes);
  const eventId = text(eventData?.id);
  const eventType = text(eventAttributes?.type);
  const checkoutId = text(checkoutData?.id);
  if (!eventId || !eventType || !checkoutId || !checkout) return null;

  const metadata = object(checkout.metadata);
  const payments = Array.isArray(checkout.payments) ? checkout.payments : [];
  const paymentData = object(payments[0]);
  const payment = object(paymentData?.attributes);
  const source = object(payment?.source);
  const amount = integer(payment?.amount_paid) ?? integer(payment?.amount) ?? integer(checkout.amount_paid) ?? integer(checkout.amount);
  const currency = text(payment?.currency) ?? text(checkout.currency);
  const paidAt = firstTimestamp(payment?.paid_at, checkout.paid_at);
  const eventOccurredAt = firstTimestamp(eventAttributes?.created_at, eventAttributes?.occurred_at, eventAttributes?.updated_at, paidAt) ?? receivedAt.toISOString();

  return {
    eventId,
    eventType,
    eventOccurredAt,
    checkoutId,
    metadataPaymentId: text(metadata?.payment_id),
    bookingId: text(metadata?.booking_id),
    reference: text(checkout.reference_number),
    amount,
    currency: currency?.toUpperCase() ?? null,
    paymentId: text(paymentData?.id),
    paymentIntentId: text(payment?.payment_intent_id) ?? text(object(checkout.payment_intent)?.id),
    paymentMethod: text(checkout.payment_method_used) ?? text(source?.type),
    description: text(payment?.description) ?? text(checkout.description),
    paidAt,
    availableAt: firstTimestamp(payment?.available_at, checkout.available_at),
    creditedAt: firstTimestamp(payment?.credited_at, checkout.credited_at),
    livemode: typeof eventAttributes?.livemode === "boolean" ? eventAttributes.livemode : null,
  };
}

export function paidCheckout(payload: unknown, receivedAt = new Date()): PaidCheckout | null {
  const parsed = parsePayMongoEvent(payload, receivedAt);
  if (!parsed || parsed.eventType !== PAID_EVENT || !parsed.paymentId || !parsed.paidAt) return null;
  return parsed as PaidCheckout;
}

async function hmac(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameSignature(expected: string, actual: string | undefined) {
  if (!actual || !/^[a-f\d]{64}$/i.test(actual)) return false;
  let difference = 0;
  const normalized = actual.toLowerCase();
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ normalized.charCodeAt(index);
  return difference === 0;
}

export async function verifySignature(body: string, signatureHeader: string, secret: string, now = Date.now()): Promise<boolean> {
  const currentSignature = await hmac(secret, body);
  if (sameSignature(currentSignature, signatureHeader.trim())) return true;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((result, part) => {
    const separator = part.indexOf("=");
    if (separator > 0) result[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
    return result;
  }, {});
  if (!/^\d+$/.test(parts.t ?? "")) return false;
  const signedAt = Number(parts.t);
  const nowSeconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(signedAt) || Math.abs(nowSeconds - signedAt) > REPLAY_TOLERANCE_SECONDS) return false;
  const legacySignature = await hmac(secret, `${parts.t}.${body}`);
  return sameSignature(legacySignature, parts.te) || sameSignature(legacySignature, parts.li);
}

function safePayload(event: ParsedEvent) {
  return {
    event: { id: event.eventId, type: event.eventType, occurred_at: event.eventOccurredAt },
    checkout: { id: event.checkoutId },
    payment: { id: event.paymentId, intent_id: event.paymentIntentId },
    reference: event.reference,
    method: event.paymentMethod,
    timestamps: { paid_at: event.paidAt, available_at: event.availableAt, credited_at: event.creditedAt },
    amount: event.amount,
    currency: event.currency,
    routing: { payment_id: event.metadataPaymentId, booking_id: event.bookingId },
    booking_id: event.bookingId,
    payment_id: event.metadataPaymentId,
  };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("hex");
}

function retryable(error: unknown, eventId?: string) {
  console.error("[paymongo-webhook] Persistence failed:", eventId, error);
  return NextResponse.json({ error: "Webhook persistence failed." }, { status: 503 });
}

function acknowledge() {
  return NextResponse.json({ received: true });
}

async function processLedgerEvent(event: ParsedEvent) {
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  if (event.eventType === PAID_EVENT) {
    if (!event.paymentId || !event.paidAt || event.amount === null || event.currency !== "PHP") {
      return NextResponse.json({ error: "Invalid paid event." }, { status: 400 });
    }
    const result = await rpc("confirm_paymongo_payment", {
      requested_provider_event_id: event.eventId,
      requested_checkout_session_id: event.checkoutId,
      requested_metadata_payment_id: event.metadataPaymentId,
      requested_provider_payment_id: event.paymentId,
      requested_payment_intent_id: event.paymentIntentId,
      requested_amount_centavos: event.amount,
      requested_paid_at: event.paidAt,
      requested_event_occurred_at: event.eventOccurredAt,
      requested_payment_method_detail: event.paymentMethod,
      requested_description: event.description,
      requested_available_at: event.availableAt,
      requested_payload: safePayload(event),
    });
    if (result.error) return retryable(result.error, event.eventId);
    const payment = result.data as { id?: string; booking_id?: string } | null;
    if (payment?.id && payment.booking_id) after(() => sendConfirmedPaymentReceipt(payment.id!, payment.booking_id!));
  } else if (FAILURE_EVENTS.has(event.eventType)) {
    const result = await rpc("fail_or_expire_provider_payment", {
      requested_provider_event_id: event.eventId,
      requested_checkout_session_id: event.checkoutId,
      requested_metadata_payment_id: event.metadataPaymentId,
      requested_event_type: event.eventType,
      requested_event_occurred_at: event.eventOccurredAt,
      requested_payload: safePayload(event),
    });
    if (result.error) return retryable(result.error, event.eventId);
    const payment = result.data as { booking_id?: string } | null;
    if (payment?.booking_id) {
      const released = await rpc("release_failed_booking_checkout", {
        requested_booking_id: payment.booking_id,
        requested_checkout_session_id: event.checkoutId,
        requested_payment_status: event.eventType === "checkout_session.expired" ? "expired" : "failed",
      });
      if (released.error) return retryable(released.error, event.eventId);
    }
  }
  return NextResponse.json({ received: true });
}

async function sendConfirmedPaymentReceipt(paymentId: string, bookingId: string) {
  try {
    const data = await getPaymentReceipt(paymentId);
    if (!data?.receipt) return;
    const receipt = data.receipt as Record<string, unknown>;
    const admin = getSupabaseAdmin();
    const booking = await admin.from("bookings").select("client_id,client_profile_id").eq("id", bookingId).maybeSingle<{ client_id: string; client_profile_id: string }>();
    if (!booking.data) return;
    const profile = await admin.from("client_profiles").select("email").eq("id", booking.data.client_profile_id).eq("status", "active").maybeSingle<{ email: string }>();
    if (!profile.data?.email) return;
    await sendPaymentReceipt({
      to: profile.data.email,
      receiptNumber: String(receipt.receipt_number),
      customerName: String(receipt.client_name),
      bookingReference: String(receipt.booking_reference),
      invoiceReference: typeof receipt.invoice_reference === "string" ? receipt.invoice_reference : null,
      method: receipt.payment_method === "billease" ? "Buy Now Pay Later" : String(receipt.payment_method),
      amountCentavos: Number(receipt.amount_centavos),
      cashReceivedCentavos: receipt.cash_received_centavos === null ? null : Number(receipt.cash_received_centavos),
      changeCentavos: receipt.change_centavos === null ? null : Number(receipt.change_centavos),
      issuedAt: String(receipt.issued_at),
      lines: data.lines.map((line) => ({ description: line.description, quantity: line.quantity, totalCentavos: line.totalCentavos })),
      clientId: booking.data.client_id,
      profileId: booking.data.client_profile_id,
      bookingId,
      paymentId,
      source: "system",
    });
  } catch (error) {
    console.error("[paymongo-webhook] Receipt delivery was deferred", { paymentId, error: error instanceof Error ? error.message : "unknown error" });
  }
}

async function processLegacyBooking(event: PaidCheckout) {
  const admin = getSupabaseAdmin();
  const selected = await admin.from("bookings")
    .select("id,reference,payment_type,currency,total_amount_php,paid_amount_php,payment_status,paymongo_checkout_session_id,paymongo_payment_id,paymongo_payment_intent_id,paymongo_payment_method,paymongo_payment_description,paymongo_paid_at,paymongo_available_at,paymongo_credited_at")
    .eq("id", event.bookingId!)
    .maybeSingle<BookingRow>();
  if (selected.error) return retryable(selected.error, event.eventId);
  const booking = selected.data;
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const requirement = await admin.from("booking_agreement_requirements").select("status,acceptance_id").eq("booking_id", booking.id).maybeSingle<{ status: string; acceptance_id: string | null }>();
  if (requirement.error) return retryable(requirement.error, event.eventId);
  if (requirement.data?.status !== "accepted" || !requirement.data.acceptance_id) return NextResponse.json({ error: "Booking agreement acceptance is required before confirmation." }, { status: 409 });
  if (!booking.paymongo_checkout_session_id || booking.paymongo_checkout_session_id !== event.checkoutId || !event.reference || booking.reference !== event.reference) {
    return NextResponse.json({ error: "Checkout does not match booking." }, { status: 409 });
  }

  if (event.currency && event.currency !== "PHP") {
    return NextResponse.json({ error: "Payment currency does not match booking." }, { status: 409 });
  }
  // Deposit checkouts charge 50% of the package + 100% of add-ons, which differs from
  // total_amount_php × 0.5 when add-ons are present. Accept any partial amount; reject
  // full-payment mismatches and any out-of-range deposit amounts.
  if (event.amount !== null) {
    const amountValid = booking.payment_type === "deposit"
      ? event.amount > 0 && event.amount < booking.total_amount_php
      : event.amount === booking.total_amount_php;
    if (!amountValid) return NextResponse.json({ error: "Payment amount does not match booking." }, { status: 409 });
  }
  const paidAmount = event.amount ?? (booking.payment_type === "deposit" ? Math.round(booking.total_amount_php * 0.5) : booking.total_amount_php);
  const paymentStatus = paidAmount < booking.total_amount_php ? "partially_paid" : "paid";
  const unchanged = booking.paid_amount_php === paidAmount
    && booking.payment_status === paymentStatus
    && booking.paymongo_payment_id === event.paymentId
    && booking.paymongo_payment_intent_id === event.paymentIntentId
    && booking.paymongo_payment_method === event.paymentMethod
    && booking.paymongo_payment_description === event.description
    && booking.paymongo_paid_at === event.paidAt
    && booking.paymongo_available_at === event.availableAt
    && booking.paymongo_credited_at === event.creditedAt;
  if (unchanged) return NextResponse.json({ received: true });

  const updated = await admin.from("bookings").update({
    paid_amount_php: paidAmount,
    payment_status: paymentStatus,
    paymongo_payment_id: event.paymentId,
    paymongo_payment_intent_id: event.paymentIntentId,
    paymongo_payment_method: event.paymentMethod,
    paymongo_payment_description: event.description,
    paymongo_paid_at: event.paidAt,
    paymongo_available_at: event.availableAt,
    paymongo_credited_at: event.creditedAt,
    status: "confirmed",
    updated_at: new Date().toISOString(),
  }).eq("id", booking.id).eq("paymongo_checkout_session_id", event.checkoutId);
  if (updated.error) return retryable(updated.error, event.eventId);
  return NextResponse.json({ received: true });
}

async function processLegacyFailure(event: ParsedEvent) {
  const result = await getSupabaseAdmin().rpc("release_failed_booking_checkout", {
    requested_booking_id: event.bookingId!,
    requested_checkout_session_id: event.checkoutId,
    requested_payment_status: event.eventType === "checkout_session.expired" ? "expired" : "failed",
  });
  if (result.error) return retryable(result.error, event.eventId);
  return acknowledge();
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const signatureHeader = request.headers.get("Paymongo-Signature");
  const body = await request.text();
  if (!signatureHeader || !(await verifySignature(body, signatureHeader, webhookSecret))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    console.error("[paymongo-webhook] Ignored a signed malformed JSON payload.");
    return acknowledge();
  }
  const event = parsePayMongoEvent(payload);
  if (!event) {
    console.error("[paymongo-webhook] Ignored a signed payload without a supported event envelope.");
    return acknowledge();
  }
  const environment = String(process.env.APP_ENV);
  if ((environment === "production" && event.livemode !== true) || (environment === "staging" && event.livemode === true)) {
    return NextResponse.json({ error: "Webhook mode does not match this environment." }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const inbox = await admin.rpc("enqueue_provider_webhook_event", {
      requested_provider: "paymongo",
      requested_event_id: event.eventId,
      requested_event_type: event.eventType,
      requested_fingerprint: await sha256(body),
      requested_safe_payload: safePayload(event),
    });
    if (inbox.error) return retryable(inbox.error, event.eventId);
    if ((inbox.data as { status?: string } | null)?.status === "processed") return acknowledge();

    let result: NextResponse;
    if (event.metadataPaymentId && (event.eventType === PAID_EVENT || FAILURE_EVENTS.has(event.eventType))) {
      result = await processLedgerEvent(event);
    } else if (event.bookingId && event.eventType === PAID_EVENT) {
      const paid = paidCheckout(payload);
      result = paid ? await processLegacyBooking(paid) : NextResponse.json({ error: "Invalid paid event." }, { status: 400 });
    } else if (event.bookingId && FAILURE_EVENTS.has(event.eventType)) {
      result = await processLegacyFailure(event);
    } else result = acknowledge();

    const completion = await admin.rpc("finish_provider_webhook_event", {
      requested_provider: "paymongo",
      requested_event_id: event.eventId,
      requested_succeeded: result.ok,
      requested_last_error: result.ok ? null : `Processing returned HTTP ${result.status}`,
    });
    if (completion.error) return retryable(completion.error, event.eventId);
    if (result.status >= 500) return result;
    if (!result.ok) console.error("[paymongo-webhook] Ignored non-retryable event:", event.eventId, event.eventType, result.status);
    return acknowledge();
  } catch (error) {
    return retryable(error, event.eventId);
  }
}
