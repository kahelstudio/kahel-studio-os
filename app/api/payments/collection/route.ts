import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizePayments, isUuid, operationalPaymentError, PaymentApiError, readPaymentJson } from "../_shared";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { inventoryQuantityError } from "@/lib/payments";

export const runtime = "nodejs";

type LooseTable = { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
type PaymentRpcDatabase = {
  public: {
    Tables: Record<"payment_line_items" | "bookings" | "clients" | "client_profiles" | "receipts", LooseTable>;
    Views: Record<string, never>;
    Functions: {
      prepare_payment_collection: { Args: Record<string, unknown>; Returns: PreparedResult };
      collect_cash_payment_with_register: { Args: Record<string, unknown>; Returns: PaymentResult };
      cancel_unbound_payment: { Args: Record<string, unknown>; Returns: PaymentResult };
      mark_paymongo_checkout: { Args: Record<string, unknown>; Returns: PaymentResult };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
type PaymentResult = { id: string; booking_id: string; status: string; amount_centavos: number; paid_at?: string | null; provider_checkout_session_id?: string | null; checkout_url?: string | null };
type PreparedResult = { payment: PaymentResult; invoice_id: string | null };
type PreparedLine = { id: string; line_type: string; product_id: string | null; description: string; quantity: number; unit_price_centavos: number; total_centavos: number };
type PayMongoResponse = { data?: { id?: string; attributes?: { checkout_url?: string; expires_at?: number | string; payment_intent?: { id?: string } | string } }; errors?: Array<{ detail?: string }> };

const safeMethods = new Set(["card", "gcash", "paymaya", "qrph", "billease"]);

function database() {
  return getSupabaseAdmin() as unknown as SupabaseClient<PaymentRpcDatabase>;
}

function requiredCentavos(value: unknown, name: string, allowZero = false) {
  if (!Number.isSafeInteger(value) || (allowZero ? Number(value) < 0 : Number(value) <= 0) || Number(value) > 2_147_483_647) throw new PaymentApiError(`${name} must be ${allowZero ? "a non-negative" : "a positive"} integer number of centavos.`);
  return Number(value);
}

function paymentMethods() {
  const configured = process.env.PAYMONGO_PAYMENT_METHODS?.split(",").map((item) => item.trim().toLowerCase()).filter((item) => safeMethods.has(item));
  return configured?.length ? [...new Set(configured)] : ["card", "gcash", "paymaya", "qrph", "billease"];
}

function paymongoExpiry(value: number | string | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value * 1000).toISOString();
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

export async function POST(request: Request) {
  const auth = await authorizePayments(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!auth.principal.userId) throw new PaymentApiError("Sign in with an active staff account to collect payment.", 403);
    const body = await readPaymentJson(request);
    if (!isUuid(body.bookingId)) throw new PaymentApiError("A valid booking ID is required.");
    const method = body.method ?? body.paymentMethod;
    if (method !== "cash" && method !== "paymongo") throw new PaymentApiError("Payment method must be cash or PayMongo.");
    const balanceCentavos = requiredCentavos(body.balanceCentavos ?? body.balanceAmountCentavos ?? 0, "Balance amount", true);
    if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim().length < 8 || body.idempotencyKey.trim().length > 200) throw new PaymentApiError("A valid idempotency key is required.");
    if (body.note !== undefined && body.note !== null && (typeof body.note !== "string" || body.note.length > 2000)) throw new PaymentApiError("Note must be text no longer than 2,000 characters.");
    if (body.createInvoice !== undefined && typeof body.createInvoice !== "boolean") throw new PaymentApiError("Create invoice must be true or false.");
    const receiptRequested = body.receipt ?? body.receiptRequested ?? true;
    if (typeof receiptRequested !== "boolean") throw new PaymentApiError("Receipt must be true or false.");
    if (body.addOns !== undefined && (!Array.isArray(body.addOns) || body.addOns.length > 100)) throw new PaymentApiError("Add-ons must be an array of at most 100 items.");
    const addOns = (body.addOns ?? []) as unknown[];
    const normalizedAddOns = addOns.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new PaymentApiError("Each add-on must be an object.");
      const item = value as Record<string, unknown>;
      if (!isUuid(item.productId)) throw new PaymentApiError("Each add-on requires a valid product ID.");
      const quantityError = inventoryQuantityError(item.quantity);
      if (quantityError) throw new PaymentApiError(`Add-on ${quantityError.toLowerCase()}`);
      return { product_id: item.productId, quantity: Number(item.quantity) };
    });
    let cashReceived: number | null = null;
    if (method === "cash") {
      if (body.confirmed !== true) throw new PaymentApiError("Confirm the cash count before posting payment.");
      if (!isUuid(body.registerSessionId)) throw new PaymentApiError("Select an open cash register before posting payment.");
      cashReceived = requiredCentavos(body.cashReceivedCentavos, "Cash received");
    }
    const secretKey = method === "paymongo" ? process.env.PAYMONGO_SECRET_KEY : null;
    if (method === "paymongo" && (!secretKey || !/^sk_(test|live)_/.test(secretKey) || (String(process.env.APP_ENV) !== "production" && secretKey.startsWith("sk_live_")))) throw new PaymentApiError("PayMongo checkout is not configured.", 503);
    const admin = database();

    if (method === "cash") {
      const posted = await admin.rpc("collect_cash_payment_with_register", {
        requested_register_session_id: body.registerSessionId, requested_booking_id: body.bookingId,
        requested_balance_component_centavos: balanceCentavos, requested_idempotency_key: body.idempotencyKey.trim(), requested_add_ons: normalizedAddOns,
        requested_create_invoice: body.createInvoice ?? false, requested_note: typeof body.note === "string" ? body.note : null,
        requested_receipt: receiptRequested, requested_actor_id: auth.principal.userId,
        requested_cash_received_centavos: cashReceived, requested_paid_at: new Date().toISOString(),
      });
      if (posted.error || !posted.data) throw posted.error ?? new Error("Cash collection returned no payment.");
      const receipt = await admin.from("receipts").select("id,payment_id,receipt_number,booking_reference,invoice_reference,payment_method,amount_centavos,cash_received_centavos,change_centavos,issued_at").eq("payment_id", posted.data.id).maybeSingle<Record<string, unknown>>();
      if (receipt.error) throw receipt.error;
      return Response.json({ payment: { id: posted.data.id, bookingId: posted.data.booking_id, status: posted.data.status, amountCentavos: posted.data.amount_centavos, paidAt: posted.data.paid_at ?? null }, receipt: receipt.data, registerSessionId: body.registerSessionId }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const preparedResult = await admin.rpc("prepare_payment_collection", {
      requested_booking_id: body.bookingId,
      requested_processor: "paymongo",
      requested_source: "staff",
      requested_payment_method: "digital",
      requested_balance_component_centavos: balanceCentavos,
      requested_idempotency_key: body.idempotencyKey.trim(),
      requested_add_ons: normalizedAddOns,
      requested_create_invoice: body.createInvoice ?? false,
      requested_note: typeof body.note === "string" ? body.note : null,
      requested_receipt: receiptRequested,
      requested_actor_id: auth.principal.userId,
    });
    if (preparedResult.error || !preparedResult.data?.payment) throw preparedResult.error ?? new Error("Payment preparation returned no payment.");
    const prepared = preparedResult.data;
    const payment = prepared.payment;

    if (payment.checkout_url && payment.provider_checkout_session_id) return Response.json({ paymentId: payment.id, status: payment.status, checkoutUrl: payment.checkout_url, checkoutSessionId: payment.provider_checkout_session_id, reused: true }, { headers: { "Cache-Control": "private, no-store" } });
    if (payment.status !== "pending") throw new PaymentApiError("This payment request can no longer create a checkout. Use a new request key.", 409);
    const cancelPrepared = async () => {
      const cancelled = await admin.rpc("cancel_unbound_payment", { requested_payment_id: payment.id, requested_actor_id: auth.principal.userId });
      if (cancelled.error) console.error("[payments-api] Failed to cancel unbound payment", { paymentId: payment.id, error: cancelled.error });
    };
    const [lineResult, bookingResult] = await Promise.all([
      admin.from("payment_line_items").select("id,line_type,product_id,description,quantity,unit_price_centavos,total_centavos").eq("payment_id", payment.id).order("created_at").returns<PreparedLine[]>(),
      admin.from("bookings").select("id,reference,client_id,client_profile_id").eq("id", payment.booking_id).single<{ id: string; reference: string; client_id: string; client_profile_id: string }>(),
    ]);
    if (lineResult.error || !lineResult.data?.length || bookingResult.error || !bookingResult.data) {
      await cancelPrepared();
      throw lineResult.error ?? bookingResult.error ?? new Error(!lineResult.data?.length ? "Prepared payment has no lines." : "Booking was not found.");
    }
    const [clientResult, profileResult] = await Promise.all([
      admin.from("clients").select("name").eq("id", bookingResult.data.client_id).single<{ name: string }>(),
      admin.from("client_profiles").select("email,mobile").eq("id", bookingResult.data.client_profile_id).single<{ email: string; mobile: string | null }>(),
    ]);
    if (clientResult.error || profileResult.error || !clientResult.data || !profileResult.data) {
      await cancelPrepared();
      throw clientResult.error ?? profileResult.error ?? new Error("Customer details were not found.");
    }
    const origin = (process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
        method: "POST", signal: controller.signal, cache: "no-store",
        headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`, "Content-Type": "application/json", "Idempotency-Key": body.idempotencyKey.trim() },
        body: JSON.stringify({ data: { attributes: {
          billing: { name: clientResult.data.name, email: profileResult.data.email, phone: profileResult.data.mobile ?? undefined },
          cancel_url: `${origin}/payments?checkout=cancelled&paymentId=${encodeURIComponent(payment.id)}`,
          success_url: `${origin}/payments?checkout=success&paymentId=${encodeURIComponent(payment.id)}`,
          description: `Payment for booking ${bookingResult.data.reference}`,
          line_items: lineResult.data.map((line) => ({ amount: line.unit_price_centavos, currency: "PHP", name: line.description, quantity: line.quantity })),
          metadata: { payment_id: payment.id, booking_id: payment.booking_id, invoice_id: prepared.invoice_id ?? "" },
          payment_method_types: paymentMethods(), reference_number: bookingResult.data.reference,
          send_email_receipt: false, show_description: true, show_line_items: true,
        } } }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new PaymentApiError("PayMongo checkout timed out. Retry with the same request key.", 504);
      throw new PaymentApiError("PayMongo checkout result is unknown. Retry with the same request key.", 502);
    } finally { clearTimeout(timeout); }
    const provider = await providerResponse.json().catch(() => ({})) as PayMongoResponse;
    const checkoutId = provider.data?.id;
    const checkoutUrl = provider.data?.attributes?.checkout_url;
    if (!providerResponse.ok) {
      console.error("[payments-api] PayMongo checkout failed", { status: providerResponse.status, detail: provider.errors?.[0]?.detail });
      await cancelPrepared();
      throw new PaymentApiError("PayMongo rejected checkout creation. Retry with a new request key.", 502);
    }
    if (!checkoutId || !checkoutUrl) throw new PaymentApiError("PayMongo checkout result is incomplete. Retry with the same request key.", 502);
    const intent = provider.data?.attributes?.payment_intent;
    const marked = await admin.rpc("mark_paymongo_checkout", { requested_payment_id: payment.id, requested_checkout_session_id: checkoutId, requested_checkout_url: checkoutUrl, requested_checkout_expires_at: paymongoExpiry(provider.data?.attributes?.expires_at), requested_payment_intent_id: typeof intent === "string" ? intent : intent?.id ?? null });
    if (marked.error || !marked.data) throw marked.error ?? new Error("Checkout could not be recorded.");
    return Response.json({ paymentId: payment.id, status: marked.data.status, checkoutUrl, checkoutSessionId: checkoutId }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return operationalPaymentError(error);
  }
}
