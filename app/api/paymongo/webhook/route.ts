import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type PayMongoEvent = {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        attributes?: {
          description?: string;
          paid_at?: number;
          payment_method_used?: string;
          payments?: Array<{ id: string; attributes?: { available_at?: number; credited_at?: number; description?: string; paid_at?: number; payment_intent_id?: string; source?: { type?: string } } }>;
          metadata?: Record<string, unknown>;
          reference_number?: string;
        };
      };
    };
  };
};
type PaidCheckout = { bookingId: string; paymentId: string | null; paymentIntentId: string | null; paymentMethod: string | null; description: string | null; paidAt: string | null; availableAt: string | null; creditedAt: string | null };
type BookingRow = { id: string; payment_type: string; total_amount_php: number; paid_amount_php: number; payment_status: string; paymongo_payment_id: string | null; paymongo_payment_intent_id: string | null; paymongo_payment_method: string | null; paymongo_payment_description: string | null; paymongo_paid_at: string | null; paymongo_available_at: string | null; paymongo_credited_at: string | null };

function timestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : null;
}

function paidCheckout(event: PayMongoEvent): PaidCheckout | null {
  const attrs = event.data?.attributes;
  if (!attrs || attrs.type !== "checkout_session.payment.paid") return null;

  const checkout = attrs.data?.attributes;
  if (!checkout) return null;
  const bookingId = checkout.metadata?.booking_id;
  if (typeof bookingId !== "string" || !bookingId) return null;
  const payment = checkout.payments?.[0];

  return {
    bookingId,
    paymentId: payment?.id ?? null,
    paymentIntentId: payment?.attributes?.payment_intent_id ?? null,
    paymentMethod: checkout.payment_method_used ?? payment?.attributes?.source?.type ?? null,
    description: payment?.attributes?.description ?? checkout.description ?? null,
    paidAt: timestamp(payment?.attributes?.paid_at ?? checkout.paid_at),
    availableAt: timestamp(payment?.attributes?.available_at),
    creditedAt: timestamp(payment?.attributes?.credited_at),
  };
}

async function hmac(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameSignature(expected: string, actual: string | undefined) {
  if (!actual || !/^[a-f\d]{64}$/i.test(actual)) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i += 1) difference |= expected.charCodeAt(i) ^ actual.toLowerCase().charCodeAt(i);
  return difference === 0;
}

async function verifySignature(body: string, signatureHeader: string, secret: string): Promise<boolean> {
  const currentSignature = await hmac(secret, body);
  if (sameSignature(currentSignature, signatureHeader.trim())) return true;

  // Older PayMongo endpoints send t, te, and li fields signed as "timestamp.body".
  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  const timestamp = parts.t;
  if (!timestamp) return false;
  const legacySignature = await hmac(secret, `${timestamp}.${body}`);
  return sameSignature(legacySignature, parts.te) || sameSignature(legacySignature, parts.li);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const signatureHeader = request.headers.get("Paymongo-Signature");
  const body = await request.text();
  if (!signatureHeader || !(await verifySignature(body, signatureHeader, webhookSecret))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PayMongoEvent;
  try {
    event = JSON.parse(body) as PayMongoEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const checkout = paidCheckout(event);
  if (!checkout) return NextResponse.json({ received: true });

  const admin = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await admin.from("bookings")
    .select("id,payment_type,total_amount_php,paid_amount_php,payment_status,paymongo_payment_id,paymongo_payment_intent_id,paymongo_payment_method,paymongo_payment_description,paymongo_paid_at,paymongo_available_at,paymongo_credited_at")
    .eq("id", checkout.bookingId)
    .maybeSingle<BookingRow>();

  if (fetchError || !existing) {
    console.error("[paymongo-webhook] Booking not found:", checkout.bookingId, fetchError);
    return NextResponse.json({ received: true, warning: "Booking not found." });
  }
  const paidAmount = existing.payment_type === "deposit" ? Math.round(existing.total_amount_php * 0.5) : existing.total_amount_php;
  const paymentStatus = paidAmount < existing.total_amount_php ? "partially_paid" : "paid";
  if (existing.paid_amount_php === paidAmount && existing.payment_status === paymentStatus && existing.paymongo_payment_id === checkout.paymentId && existing.paymongo_payment_intent_id === checkout.paymentIntentId && existing.paymongo_payment_method === checkout.paymentMethod && existing.paymongo_payment_description === checkout.description && existing.paymongo_paid_at === checkout.paidAt && existing.paymongo_available_at === checkout.availableAt && existing.paymongo_credited_at === checkout.creditedAt) {
    return NextResponse.json({ received: true });
  }

  const { error: updateError } = await admin.from("bookings").update({
    paid_amount_php: paidAmount,
    payment_status: paymentStatus,
    paymongo_payment_id: checkout.paymentId,
    paymongo_payment_intent_id: checkout.paymentIntentId,
    paymongo_payment_method: checkout.paymentMethod,
    paymongo_payment_description: checkout.description,
    paymongo_paid_at: checkout.paidAt,
    paymongo_available_at: checkout.availableAt,
    paymongo_credited_at: checkout.creditedAt,
    status: "confirmed",
    updated_at: new Date().toISOString(),
  }).eq("id", checkout.bookingId);
  if (updateError) {
    console.error("[paymongo-webhook] Failed to update booking:", checkout.bookingId, updateError);
    return NextResponse.json({ received: true, warning: "Failed to update booking payment status." });
  }

  return NextResponse.json({ received: true });
}
