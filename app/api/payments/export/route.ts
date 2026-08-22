import { authorizePayments, csvCell, operationalPaymentError } from "../_shared";
import { getPaymentWorkspace } from "@/lib/server/payments-data";

export const runtime = "nodejs";

function businessDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function GET(request: Request) {
  const auth = await authorizePayments(request);
  if ("response" in auth) return auth.response;
  try {
    const { transactions } = await getPaymentWorkspace();
    const csv = [
      ["Payment ID", "Booking reference", "Invoice reference", "Receipt number", "Customer", "Phone", "Method", "Status", "Settlement", "Amount PHP", "Refunded PHP", "Provider payment ID", "Provider intent ID", "Provider checkout ID", "Paid at", "Created at"],
      ...transactions.map((row) => [row.id, row.bookingReference, row.invoiceReference, row.receiptNumber, row.customerName, row.customerPhone, row.paymentMethodDetail ?? row.paymentMethod, row.status, row.settlementStatus, (row.amountCentavos / 100).toFixed(2), (row.refundedAmountCentavos / 100).toFixed(2), row.providerPaymentId, row.providerPaymentIntentId, row.providerCheckoutSessionId, row.paidAt, row.createdAt]),
    ].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kahel-payments-${businessDate()}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return operationalPaymentError(error); }
}
