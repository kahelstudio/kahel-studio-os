import { authorizePayments, isUuid, operationalPaymentError } from "../../_shared";
import { getPaymentReceipt } from "@/lib/server/payments-data";
import { sendPaymentReceipt } from "@/lib/server/payment-receipt-email";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
type Context = { params: Promise<{ paymentId: string }> };

export async function GET(request: Request, { params }: Context) {
  const auth = await authorizePayments(request);
  if ("response" in auth) return auth.response;
  try {
    const { paymentId } = await params;
    if (!isUuid(paymentId)) return Response.json({ error: "Invalid payment ID." }, { status: 400 });
    const data = await getPaymentReceipt(paymentId);
    if (!data) return Response.json({ error: "Payment was not found." }, { status: 404 });
    const payment = data.payment as Record<string, unknown>;
    return Response.json({ payment: { id: payment.id, status: payment.status, amount_centavos: payment.amount_centavos, paid_at: payment.paid_at }, receipt: data.receipt, lines: data.lines }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return operationalPaymentError(error); }
}

export async function POST(request: Request, { params }: Context) {
  const auth = await authorizePayments(request, true);
  if ("response" in auth) return auth.response;
  try {
    const { paymentId } = await params;
    if (!isUuid(paymentId)) return Response.json({ error: "Invalid payment ID." }, { status: 400 });
    const data = await getPaymentReceipt(paymentId);
    if (!data?.receipt) return Response.json({ error: "A confirmed receipt was not found for this payment." }, { status: 404 });
    const payment = data.payment as Record<string, unknown>;
    const receipt = data.receipt as Record<string, unknown>;
    const admin = getSupabaseAdmin();
    const booking = await admin.from("bookings").select("client_id,client_profile_id").eq("id", String(payment.booking_id)).maybeSingle<{ client_id: string; client_profile_id: string }>();
    if (booking.error || !booking.data) throw booking.error ?? new Error("Booking not found.");
    const profile = await admin.from("client_profiles").select("email,email_verified_at").eq("id", booking.data.client_profile_id).eq("status", "active").maybeSingle<{ email: string; email_verified_at: string | null }>();
    if (profile.error) throw profile.error;
    if (!profile.data?.email) return Response.json({ error: "The customer does not have an active email address." }, { status: 409 });
    if (!profile.data.email_verified_at) return Response.json({ error: "Verify the customer email address before resending a receipt." }, { status: 409 });
    const recipientDomain = profile.data.email.split("@")[1]?.toLowerCase() ?? "unknown";
    const attempted = await admin.from("staff_audit_log").insert({ actor_id: auth.principal.userId, actor_name: auth.principal.email, event: "Payment receipt resend attempted", event_type: "billing", entity_type: "payment", entity_id: paymentId, metadata: { receipt_number: String(receipt.receipt_number), recipient_domain: recipientDomain } });
    if (attempted.error) throw attempted.error;
    const sent = await sendPaymentReceipt({
      to: profile.data.email,
      receiptNumber: String(receipt.receipt_number),
      customerName: String(receipt.client_name),
      bookingReference: String(receipt.booking_reference),
      invoiceReference: typeof receipt.invoice_reference === "string" ? receipt.invoice_reference : null,
      method: String(receipt.payment_method),
      amountCentavos: Number(receipt.amount_centavos),
      cashReceivedCentavos: receipt.cash_received_centavos === null ? null : Number(receipt.cash_received_centavos),
      changeCentavos: receipt.change_centavos === null ? null : Number(receipt.change_centavos),
      issuedAt: String(receipt.issued_at),
      lines: data.lines.map((line) => ({ description: line.description, quantity: line.quantity, totalCentavos: line.totalCentavos })),
      clientId: booking.data.client_id, profileId: booking.data.client_profile_id, bookingId: String(payment.booking_id),
      invoiceId: typeof payment.invoice_id === "string" ? payment.invoice_id : undefined, paymentId, source: "staff",
    });
    if (!sent) {
      const failed = await admin.from("staff_audit_log").insert({ actor_id: auth.principal.userId, actor_name: auth.principal.email, event: "Payment receipt resend failed", event_type: "billing", entity_type: "payment", entity_id: paymentId, metadata: { receipt_number: String(receipt.receipt_number), recipient_domain: recipientDomain, retry_required: true } });
      if (failed.error) console.error("[payments-api] Receipt delivery and failure audit both failed", { paymentId, code: failed.error.code });
      return Response.json({ error: "Receipt email could not be delivered. The payment and receipt remain recorded." }, { status: 502 });
    }
    const audit = await admin.from("staff_audit_log").insert({ actor_id: auth.principal.userId, actor_name: auth.principal.email, event: "Payment receipt resent", event_type: "billing", entity_type: "payment", entity_id: paymentId, metadata: { receipt_number: String(receipt.receipt_number), recipient_domain: recipientDomain } });
    if (audit.error) console.error("[payments-api] Receipt sent but audit write failed", { paymentId, code: audit.error.code });
    return Response.json({ sent: true, receiptNumber: receipt.receipt_number }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return operationalPaymentError(error);
  }
}
