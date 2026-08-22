import "server-only";

import { sendTransactionalEmail } from "./transactional-email-service";
type ReceiptLine = { description: string; quantity: number; totalCentavos: number };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const peso = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);

export async function sendPaymentReceipt(input: { to: string; receiptNumber: string; customerName: string; bookingReference: string; invoiceReference: string | null; method: string; amountCentavos: number; cashReceivedCentavos: number | null; changeCentavos: number | null; issuedAt: string; lines: ReceiptLine[]; clientId?: string; profileId?: string; bookingId?: string; invoiceId?: string; paymentId?: string; source?: "system" | "staff" }) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.BOOKING_EMAIL_FROM;
    if (!apiKey || !from) return false;
    const replyTo = process.env.BOOKING_EMAIL_REPLY_TO ?? from;
    const items = input.lines.map((line) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e1dd">${line.quantity} x ${escapeHtml(line.description)}</td><td style="padding:8px 0;border-bottom:1px solid #e5e1dd;text-align:right">${escapeHtml(peso(line.totalCentavos))}</td></tr>`).join("");
    const cash = input.cashReceivedCentavos === null ? "" : `<p>Cash received: <strong>${escapeHtml(peso(input.cashReceivedCentavos))}</strong><br>Change: <strong>${escapeHtml(peso(input.changeCentavos ?? 0))}</strong></p>`;
    const textLines = input.lines.map((line) => `${line.quantity} x ${line.description}: ${peso(line.totalCentavos)}`).join("\n");
    return sendTransactionalEmail({
      templateKey: "payment-receipt", logicalIdempotencyKey: `payment-receipt-${input.paymentId ?? input.receiptNumber}`,
      triggerKey: "payment.receipt", source: input.source, clientId: input.clientId, recipientProfileId: input.profileId,
      bookingId: input.bookingId, invoiceId: input.invoiceId, paymentId: input.paymentId, recipientName: input.customerName,
      recipientSnapshot: { name: input.customerName, email: input.to }, renderContext: { receiptNumber: input.receiptNumber },
      message: {
      to: input.to,
      from,
      replyTo,
      subject: `Kahel Studio receipt ${input.receiptNumber}`,
      html: `<div style="background:#f5f3ef;padding:24px;font:15px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dedbd5;padding:28px"><h1 style="margin:0;font-size:26px">Payment receipt</h1><p><strong>${escapeHtml(input.receiptNumber)}</strong><br>${escapeHtml(new Date(input.issuedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" }))}</p><p>Customer: ${escapeHtml(input.customerName)}<br>Booking: ${escapeHtml(input.bookingReference)}${input.invoiceReference ? `<br>Invoice: ${escapeHtml(input.invoiceReference)}` : ""}</p><table style="width:100%;border-collapse:collapse">${items}</table><p style="font-size:18px">Amount paid: <strong>${escapeHtml(peso(input.amountCentavos))}</strong><br>Method: ${escapeHtml(input.method)}</p>${cash}<p style="color:#666">This confirms the payment status recorded by Kahel Studio. It is not an official BIR invoice or receipt. Reply to this email if you need assistance.</p></div></div>`,
      text: `Kahel Studio payment receipt\n${input.receiptNumber}\nCustomer: ${input.customerName}\nBooking: ${input.bookingReference}${input.invoiceReference ? `\nInvoice: ${input.invoiceReference}` : ""}\n\n${textLines}\n\nAmount paid: ${peso(input.amountCentavos)}\nMethod: ${input.method}${input.cashReceivedCentavos === null ? "" : `\nCash received: ${peso(input.cashReceivedCentavos)}\nChange: ${peso(input.changeCentavos ?? 0)}`}\n\nThis confirms the payment status recorded by Kahel Studio. It is not an official BIR invoice or receipt.`,
      },
    });
  } catch {
    return false;
  }
}
