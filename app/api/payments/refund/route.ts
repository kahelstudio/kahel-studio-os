import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizePayments, isUuid, operationalPaymentError, PaymentApiError, readPaymentJson } from "../_shared";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { Database } from "@/lib/server/supabase-database";

export const runtime = "nodejs";

function database() {
  return getSupabaseAdmin() as SupabaseClient<Database>;
}

export async function POST(request: Request) {
  const auth = await authorizePayments(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role !== "super_admin" || !auth.principal.userId) throw new PaymentApiError("Super Admin access is required for cash refunds.", 403);
    const body = await readPaymentJson(request);
    if (!isUuid(body.paymentId)) throw new PaymentApiError("A valid payment ID is required.");
    if (!isUuid(body.approvalRequestId)) throw new PaymentApiError("A valid approval request ID is required.");
    if (!Number.isSafeInteger(body.amountCentavos) || Number(body.amountCentavos) <= 0) throw new PaymentApiError("Refund amount must be a positive integer number of centavos.");
    if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim().length < 8 || body.idempotencyKey.trim().length > 200) throw new PaymentApiError("A valid idempotency key is required.");
    if (typeof body.reason !== "string" || body.reason.trim().length < 3 || body.reason.trim().length > 1000) throw new PaymentApiError("Refund reason must be 3 to 1,000 characters.");
    if (body.registerSessionId !== undefined && body.registerSessionId !== null && body.registerSessionId !== "" && !isUuid(body.registerSessionId)) throw new PaymentApiError("Cash register session is invalid.");

    const admin = database();
    const registerSessionId = typeof body.registerSessionId === "string" && body.registerSessionId ? body.registerSessionId : null;
    const [payment, approval, registerSession] = await Promise.all([
      admin.from("payments").select("id,booking_id,client_id,processor,source,payment_method,status,amount_centavos,refunded_amount_centavos,add_on_amount_centavos").eq("id", body.paymentId).maybeSingle(),
      admin.from("approval_requests").select("id,request_type,status,fulfillment_status,source_record_id,booking_id,client_id,amount_php").eq("id", body.approvalRequestId).maybeSingle(),
      registerSessionId ? admin.from("cash_register_sessions").select("id,status").eq("id", registerSessionId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (payment.error) throw payment.error;
    if (approval.error) throw approval.error;
    if (registerSession.error) throw registerSession.error;
    if (registerSessionId && (!registerSession.data || registerSession.data.status !== "open")) throw new PaymentApiError("The selected cash register is not open.", 409);
    const paymentRow = payment.data;
    const approvalRow = approval.data;
    if (!paymentRow || paymentRow.processor !== "none" || paymentRow.source === "legacy_import" || paymentRow.payment_method !== "cash" || paymentRow.add_on_amount_centavos !== 0 || !["paid", "partially_refunded"].includes(paymentRow.status)) throw new PaymentApiError("Only paid, nonlegacy cash balance payments can be refunded.", 409);
    if (!approvalRow || approvalRow.request_type !== "client_refund" || approvalRow.status !== "approved" || approvalRow.fulfillment_status === "paid" || approvalRow.source_record_id !== paymentRow.id || approvalRow.booking_id !== paymentRow.booking_id || approvalRow.client_id !== paymentRow.client_id || approvalRow.amount_php !== body.amountCentavos) throw new PaymentApiError("An approved payment-bound refund for the exact amount is required.", 409);
    if (Number(body.amountCentavos) > paymentRow.amount_centavos - paymentRow.refunded_amount_centavos) throw new PaymentApiError("Refund amount exceeds the refundable payment balance.", 409);

    const result = await admin.rpc("refund_cash_payment", {
      requested_payment_id: paymentRow.id,
      requested_approval_request_id: approvalRow.id,
      requested_amount_centavos: Number(body.amountCentavos),
      requested_actor_id: auth.principal.userId,
      requested_idempotency_key: body.idempotencyKey.trim(),
      requested_reason: body.reason.trim(),
      requested_register_session_id: registerSessionId,
    });
    if (result.error || !result.data) throw result.error ?? new Error("Cash refund returned no record.");
    return Response.json({ refund: result.data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return operationalPaymentError(error);
  }
}
