export const dynamic = "force-dynamic";

import { getPayments, getPaymentCounts } from "@/lib/server/payments-data";
import { KpiStrip } from "@/components/finance/kpi-strip";
import { Info } from "lucide-react";

export default async function PaymentsPage() {
  const [payments, counts] = await Promise.all([getPayments(), getPaymentCounts()]);

  const kpis = [
    { label: "Total received", value: payments.kpis[0].value, change: payments.kpis[0].change },
    { label: "Pending", value: `${counts.pending} bookings`, change: "Awaiting payment" },
    { label: "Paid", value: `${counts.paid} bookings`, change: `of ${counts.total}` },
    { label: "Payment rate", value: counts.total ? `${Math.round((counts.paid / counts.total) * 100)}%` : "—", change: "Paid / total" },
  ];

  return (
    <div className="p-12 pt-9">
      <div>
        <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
          Payments
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Every money movement in and out — cleared and pending
        </p>
      </div>

      <KpiStrip kpis={kpis} />

      <div className="mt-5 overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-16 min-w-[1180px] grid-cols-[1.3fr_1.9fr_0.6fr_0.7fr_2.4fr_0.8fr_1fr] items-center border-b border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-5 text-sm font-semibold text-[var(--color-text-primary)]">
          <div>Payment method</div>
          <div>Payment ID</div>
          <div>Amount</div>
          <div>Status</div>
          <div>Description</div>
          <div>Paid at</div>
          <div>Settlement status</div>
        </div>
        {payments.rows.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
            No payments received yet. Paid bookings will appear here.
          </div>
        )}
        {payments.rows.map((r) => (
          <div
            key={r.paymentId ?? r.ref}
            className="grid min-h-[76px] min-w-[1180px] grid-cols-[1.3fr_1.9fr_0.6fr_0.7fr_2.4fr_0.8fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-[15px] last:border-b-0"
            style={{ background: "color-mix(in srgb, var(--color-success-bg) 38%, var(--color-surface))" }}
          >
            <div>{r.method}</div>
            <div className="min-w-0 pr-4">
              <div className="truncate font-semibold text-[var(--color-success-text)]">{r.paymentId ?? r.ref}</div>
              {r.paymentIntentId && <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{r.paymentIntentId}</div>}
            </div>
            <div className="font-medium">{r.amt}</div>
            <div>
              <span
                className="inline-flex min-h-8 items-center rounded-pill px-3 text-[11px] font-bold uppercase"
                style={{ background: r.stBg, color: r.stColor }}
              >
                {r.stLabel}
              </span>
            </div>
            <div className="pr-4">{r.description}</div>
            <div>{r.paidAt}</div>
            <div className="flex items-center gap-1.5 font-medium">
              {r.settlementStatus}
              <Info className="h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-label="Settlement timing is provided by PayMongo" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
