import { FINANCE_PAYMENTS, FINANCE_PAYMENT_KPIS } from "@/lib/sample-data";
import { KpiStrip } from "@/components/finance/kpi-strip";

export default function FinancePaymentsPage() {
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

      <KpiStrip kpis={FINANCE_PAYMENT_KPIS} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.1fr_1.7fr_0.8fr_1.3fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Party</div>
          <div>Type</div>
          <div>Method</div>
          <div>Status</div>
          <div className="text-right">Amount</div>
        </div>
        {FINANCE_PAYMENTS.map((r) => (
          <div
            key={r.ref}
            className="grid h-[54px] grid-cols-[1.1fr_1.7fr_0.8fr_1.3fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs font-medium text-[var(--color-text-primary)]">{r.ref}</div>
            <div className="font-medium">{r.party}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: r.dirBg, color: r.dirColor }}
              >
                {r.dirLabel}
              </span>
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">{r.method}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: r.stBg, color: r.stColor }}
              >
                {r.stLabel}
              </span>
            </div>
            <div className="text-right font-medium" style={{ color: r.dirColor }}>
              {r.dirSign}
              {r.amt}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
