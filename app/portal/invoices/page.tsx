export const dynamic = "force-dynamic";

import { getPortalInvoices, getInvoicePaymentsByClient } from "@/lib/server/customer-portal-data";
import { requireCustomerIdentity } from "@/lib/server/customer-auth";

const peso = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(centavos / 100);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(value)) : "—";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", digital: "Digital", card: "Card", gcash: "GCash",
  paymaya: "Maya", qrph: "QR Ph", billease: "BillEase", legacy_import: "Manual",
};

const PURPOSE_LABELS: Record<string, string> = {
  balance: "Balance", add_on: "Add-on", balance_and_add_on: "Balance + Add-on", legacy_import: "Payment",
};

export default async function PortalInvoicesPage() {
  const identity = await requireCustomerIdentity("/portal/invoices");
  const [rows, payments] = await Promise.all([
    getPortalInvoices(),
    getInvoicePaymentsByClient(identity.clientId),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Invoices</h1>
      <p className="mt-2 text-text-secondary">Customer-safe invoice and balance details.</p>

      {rows.length ? (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-surface-muted text-text-secondary">
              <tr>
                <th className="p-4">Reference</th>
                <th className="p-4">Status</th>
                <th className="p-4">Total</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-4 font-mono">{row.reference}</td>
                  <td className="p-4 capitalize">{row.status.replaceAll("_", " ")}</td>
                  <td className="p-4">{peso(row.totalAmount)}</td>
                  <td className="p-4 font-semibold">{peso(row.totalAmount - row.paidAmount)}</td>
                  <td className="p-4">{date(row.dueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-text-secondary">No invoices yet.</p>
      )}

      {payments.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Payment history</h2>
          <p className="mt-1 text-sm text-text-secondary">Confirmed payments against your bookings.</p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead className="bg-surface-muted text-text-secondary">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="p-4">{date(payment.paidAt ?? payment.createdAt)}</td>
                    <td className="p-4">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</td>
                    <td className="p-4">{PURPOSE_LABELS[payment.paymentPurpose] ?? payment.paymentPurpose.replaceAll("_", " ")}</td>
                    <td className="p-4 font-semibold">{peso(payment.amountCentavos)}</td>
                    <td className="p-4 capitalize">{payment.status.replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
