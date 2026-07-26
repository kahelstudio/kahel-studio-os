import { Plus } from "lucide-react";
import { FINANCE_INVOICES, FINANCE_KPIS } from "@/lib/sample-data";
import { KpiStrip } from "@/components/finance/kpi-strip";

export default function FinanceInvoicesPage() {
  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Invoice records
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Recorded from printed BIR booklets — the system never generates an invoice
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Record serial
        </button>
      </div>

      <KpiStrip kpis={FINANCE_KPIS} />

      <div className="mt-5 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>BIR serial</div>
          <div>Source</div>
          <div>Kind</div>
          <div>Issued</div>
          <div className="text-right">Amount</div>
        </div>
        {FINANCE_INVOICES.map((r) => (
          <div
            key={r.serial}
            className="grid h-[52px] grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-[13px] font-medium text-[var(--color-text-primary)]">{r.serial}</div>
            <div className="text-[13px] text-[var(--color-text-secondary)]">{r.ref}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: r.kindBg, color: r.kindColor }}
              >
                {r.kindLabel}
              </span>
            </div>
            <div className="text-[var(--color-text-secondary)]">{r.issued}</div>
            <div className="text-right font-display font-semibold">{r.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
