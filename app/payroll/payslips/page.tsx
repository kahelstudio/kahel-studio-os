import { getLatestPayrollRunId, getPayrollPayslips } from "@/lib/server/payroll-data";

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default async function PayrollPayslipsPage() {
  const runId = await getLatestPayrollRunId();
  const payslips = runId ? await getPayrollPayslips(runId) : [];

  const statusColors: Record<string, { bg: string; color: string }> = {
    generated: { bg: "var(--color-info-bg)", color: "var(--color-info-text)" },
    published: { bg: "var(--color-success-bg)", color: "var(--color-success-text)" },
    viewed: { bg: "var(--color-success-bg)", color: "var(--color-success-text)" },
    downloaded: { bg: "var(--color-success-bg)", color: "var(--color-success-text)" },
    draft: { bg: "var(--color-warning-bg)", color: "var(--color-warning-text)" },
  };

  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Payslips
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Generated payslips across every pay run
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.4fr_1.6fr_1.2fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Employee</div>
          <div>Period</div>
          <div className="text-right">Net pay</div>
          <div>Status</div>
        </div>
        {payslips.map((p) => {
          const st = statusColors.generated;
          return (
            <div
              key={p.id}
              className="grid h-14 grid-cols-[1.4fr_1.6fr_1.2fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="text-xs text-[var(--color-text-muted)]">{p.id.slice(0, 12)}</div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-[var(--color-text-primary)]">{p.runId.slice(0, 10)}</div>
              <div className="text-right font-display font-semibold">{formatPHP(p.netPay)}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: st.bg, color: st.color }}
                >
                  Generated
                </span>
              </div>
            </div>
          );
        })}
        {payslips.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No payslips available. Run a payroll first.
          </div>
        )}
      </div>
    </div>
  );
}
