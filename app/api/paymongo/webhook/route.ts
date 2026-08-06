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
          payments?: Array<{ id: string }>;
          metadata?: Record<string, unknown>;
          reference_number?: string;
        };
      };
    };
  };
};
type BookingUpdate = {
  payment_status: string;
  paymongo_payment_intent_id: string | null;
  status: string;
  updated_at: string;
};


function bookingUpdate(event: PayMongoEvent): BookingUpdate | null {
  const attrs = event.data?.attributes;
  if (!attrs || attrs.type !== "checkout_session.payment.paid") return null;

  const checkout = attrs.data?.attributes;
  if (!checkout) return null;

  return {
    payment_status: "paid",
    paymongo_payment_intent_id: checkout.payments?.[0]?.id ?? null,
    status: "confirmed",
    updated_at: new Date().toISOString(),
  };
}

async function verifySignature(request: Request): Promise<boolean> {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const signatureHeader = request.headers.get("Paymongo-Signature");
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.te;
  if (!timestamp || !signature) return false;

  const body = await request.clone().text();
  const payload = `${timestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return computed === signature;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  if (!(await verifySignature(request))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PayMongoEvent;
  try {
    event = await request.json() as PayMongoEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const update = bookingUpdate(event);
  if (!update) return NextResponse.json({ received: true });

  const bookingId = event.data?.attributes?.data?.attributes?.metadata?.booking_id as string | undefined;
  const reference = event.data?.attributes?.data?.attributes?.reference_number;

  if (!bookingId || typeof bookingId !== "string") {
    return NextResponse.json({ error: "Missing booking reference in metadata." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await admin.from("bookings")
    .select("id,payment_status")
    .eq("id", bookingId)
    .maybeSingle<{ id: string; payment_status: string }>();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (existing.payment_status === "paid") {
    return NextResponse.json({ received: true });
  }

  const { error: updateError } = await admin.from("bookings").update(update).eq("id", bookingId);
  if (updateError) {
    return NextResponse.json({ error: "Failed to update booking payment status." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}