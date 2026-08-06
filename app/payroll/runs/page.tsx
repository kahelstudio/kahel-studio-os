export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getPayrollRuns } from "@/lib/server/payroll-data";

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PayrollRunsPage() {
  const runs = await getPayrollRuns();

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)", label: "Draft" },
    processing: { bg: "var(--color-attention-bg)", color: "var(--color-attention-text)", label: "Processing" },
    approved: { bg: "var(--color-info-bg)", color: "var(--color-info-text)", label: "Approved" },
    paid: { bg: "var(--color-success-bg)", color: "var(--color-success-text)", label: "Paid" },
  };

  return (
    <div className="p-10 pb-14 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
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
        <div className="grid h-11 grid-cols-[1fr_1.5fr_0.8fr_0.9fr_0.9fr_1.5fr_1.3fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Period</div>
          <div>Pay date</div>
          <div className="text-right">Gross</div>
          <div className="text-right">Deductions</div>
          <div className="text-right">Net</div>
          <div>Status</div>
        </div>
        {runs.map((r) => {
          const st = statusColors[r.status] ?? { bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)", label: r.status };
          return (
            <div
              key={r.id}
              className="grid h-14 grid-cols-[1fr_1.5fr_0.8fr_0.9fr_0.9fr_1.5fr_1.3fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="text-[13px] text-[var(--color-text-primary)]">{r.reference}</div>
              <div className="text-[var(--color-text-primary)]">{r.periodLabel}</div>
              <div className="text-[var(--color-text-primary)]">{formatDate(r.paymentDate)}</div>
              <div className="text-right font-display font-semibold">{formatPHP(r.grossTotal)}</div>
              <div className="text-right text-[var(--color-danger-text)]">{formatPHP(r.deductionsTotal)}</div>
              <div className="text-right font-display font-semibold">{formatPHP(r.netTotal)}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: st.bg, color: st.color }}
                >
                  {st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
