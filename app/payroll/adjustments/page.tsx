export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getPayrollAdjustments } from "@/lib/server/payroll-data";

function formatPHP(n: number) {
  const sign = n < 0 ? "−" : "+";
  return `${sign}₱${Math.abs(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default async function PayrollAdjustmentsPage() {
  const adjustments = await getPayrollAdjustments();

  const statusColors: Record<string, { bg: string; color: string }> = {
    applied: { bg: "var(--color-success-bg)", color: "var(--color-success-text)" },
    approved: { bg: "var(--color-info-bg)", color: "var(--color-info-text)" },
    awaiting: { bg: "var(--color-warning-bg)", color: "var(--color-warning-text)" },
    rejected: { bg: "var(--color-danger-bg)", color: "var(--color-danger-text)" },
    reversed: { bg: "var(--color-indigo-100)", color: "var(--color-indigo-800)" },
    draft: { bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)" },
  };

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
        {adjustments.map((a) => {
          const st = statusColors[a.status] ?? { bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)" };
          const dirColor = a.direction === "Earning" ? "var(--color-success-text)" : "var(--color-danger-text)";
          const amountDisplay = a.direction === "Earning" ? formatPHP(a.amount) : formatPHP(-Math.abs(a.amount));
          return (
            <div
              key={a.id}
              className="grid h-14 grid-cols-[1fr_1.6fr_1.4fr_1fr_1fr_1.2fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="text-xs text-[var(--color-text-muted)]">{a.reference}</div>
              <div className="font-semibold">{a.employeeName}</div>
              <div className="text-[var(--color-text-primary)]">{a.kind}</div>
              <div className="text-right font-display font-semibold" style={{ color: dirColor }}>
                {amountDisplay}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">{a.runRef}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: st.bg, color: st.color }}
                >
                  {a.status}
                </span>
              </div>
            </div>
          );
        })}
        {adjustments.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No adjustments yet.
          </div>
        )}
      </div>
    </div>
  );
}
