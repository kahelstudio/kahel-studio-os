import { Plus } from "lucide-react";
import { PAYROLL_RUNS } from "@/lib/sample-data";

export default function PayrollRunsPage() {
  return (
    <div className="max-w-[1320px] p-10 pb-14 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Pay runs
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Every payroll cycle, current and historical
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> Create pay run
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.3fr_1.3fr_1fr_1fr_1fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Period</div>
          <div>Pay date</div>
          <div className="text-right">Gross</div>
          <div className="text-right">Deductions</div>
          <div className="text-right">Net</div>
          <div>Status</div>
        </div>
        {PAYROLL_RUNS.map((r) => (
          <div
            key={r.ref}
            className="grid h-14 grid-cols-[1.3fr_1.3fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-[var(--color-ink-100)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div className="font-mono text-[13px] text-[var(--color-text-primary)]">{r.ref}</div>
            <div className="text-[var(--color-ink-700)]">{r.period}</div>
            <div className="text-[var(--color-ink-700)]">{r.pay}</div>
            <div className="text-right font-display font-semibold">{r.gross}</div>
            <div className="text-right text-[var(--color-danger-text)]">{r.ded}</div>
            <div className="text-right font-display font-semibold">{r.net}</div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: r.stBg, color: r.stColor }}
              >
                {r.stLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
