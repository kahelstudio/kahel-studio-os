import { Plus } from "lucide-react";
import { PAYROLL_ADJUSTMENTS } from "@/lib/sample-data";

export default function PayrollAdjustmentsPage() {
  return (
    <div className="p-10 pb-14 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Adjustments
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            One-off earnings and deductions applied to a pay run
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New adjustment
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1fr_1.6fr_1.4fr_1fr_1fr_1.2fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Ref</div>
          <div>Employee</div>
          <div>Kind</div>
          <div className="text-right">Amount</div>
          <div>Pay run</div>
          <div>Status</div>
        </div>
        {PAYROLL_ADJUSTMENTS.map((a) => (
          <div
            key={a.ref}
            className="grid h-14 grid-cols-[1fr_1.6fr_1.4fr_1fr_1fr_1.2fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="text-xs text-[var(--color-text-muted)]">{a.ref}</div>
            <div className="font-semibold">{a.emp}</div>
            <div className="text-[var(--color-text-primary)]">{a.kind}</div>
            <div className="text-right font-display font-semibold" style={{ color: a.dirColor }}>
              {a.amt}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">{a.run}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: a.stBg, color: a.stColor }}
              >
                {a.stL}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
