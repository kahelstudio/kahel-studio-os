import { Download } from "lucide-react";
import { FINANCE_SALES, FINANCE_SALES_KPIS } from "@/lib/sample-data";
import { KpiStrip } from "@/components/finance/kpi-strip";

export default function FinanceSalesPage() {
  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Sales
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Money in — retail sales and booking payments received
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)]">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <KpiStrip kpis={FINANCE_SALES_KPIS} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.1fr_1.8fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Description</div>
          <div>Method</div>
          <div>Date</div>
          <div className="text-right">Amount</div>
        </div>
        {FINANCE_SALES.map((r) => (
          <div
            key={r.ref}
            className="grid h-[54px] grid-cols-[1.1fr_1.8fr_1fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs font-medium text-[var(--color-text-primary)]">{r.ref}</div>
            <div className="font-medium">{r.desc}</div>
            <div className="text-[var(--color-text-secondary)]">{r.method}</div>
            <div className="text-[var(--color-text-secondary)]">{r.date}</div>
            <div className="text-right font-semibold text-[var(--color-success-text)]">{r.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
