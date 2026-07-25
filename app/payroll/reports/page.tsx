import { FileText } from "lucide-react";
import { PAYROLL_REPORTS } from "@/lib/sample-data";

export default function PayrollReportsPage() {
  return (
    <div className="max-w-[1100px] p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Reports
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Every payroll report, grouped by purpose
      </p>

      <div className="mt-6 grid grid-cols-2 gap-5">
        {PAYROLL_REPORTS.map((g) => (
          <div key={g.group} className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-ink-100)] px-5 py-3.5 font-display text-[13px] font-semibold uppercase tracking-[0.16em]">
              {g.group}
            </div>
            {g.items.map((item) => (
              <button
                key={item}
                className="flex w-full items-center gap-3 border-b border-[var(--color-ink-50)] px-5 py-3 text-left text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
              >
                <FileText className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" strokeWidth={1.75} />
                {item}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
