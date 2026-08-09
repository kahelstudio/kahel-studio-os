export const dynamic = "force-dynamic";

import { Download, TrendingUp, TriangleAlert, Plus } from "lucide-react";
import { getPayrollOverview } from "@/lib/server/payroll-data";
import { ActionButton } from "@/components/shared/action-button";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PayrollOverviewPage() {
  const overview = await getPayrollOverview();
  const { currentRun, kpis } = overview;

  return (
    <div className="p-10 pb-14 pt-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Payroll
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-[15px] text-[var(--color-text-secondary)]">
              Current period · {currentRun?.periodLabel ?? "—"}
            </span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-ink-300)]" />
            {currentRun && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning-text)]">
                <TriangleAlert className="h-3.5 w-3.5" /> {currentRun.status}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <ActionButton href="/payroll/reports" className="flex h-10 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm font-semibold hover:border-[var(--color-border-strong)]">
            <TrendingUp className="h-4 w-4" /> Reports
          </ActionButton>
          <ActionButton label="Export payroll" className="flex h-10 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm font-semibold hover:border-[var(--color-border-strong)]">
            <Download className="h-4 w-4" /> Export
          </ActionButton>
          <OperationCreateButton kind="payroll-run" className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
            <Plus className="h-4 w-4" /> Create pay run
          </OperationCreateButton>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <KpiBox label="Total employees" value={String(kpis.employeeCount)} tag="ACTIVE" i={0} />
        <KpiBox label="Average salary" value={formatPHP(kpis.avgSalary)} tag="MONTHLY" i={1} />
        <KpiBox label="Payroll MTD" value={formatPHP(kpis.totalPayrollMtd)} tag="GROSS" i={2} />
        <KpiBox label="Next run" value={formatDate(kpis.nextRunDate)} tag="EST" i={3} />
      </div>

      <div className="mt-3.5 grid grid-cols-4 gap-3.5">
        <SecStat label="Employees" value={String(kpis.employeeCount)} sub="Active payroll" accent="var(--color-text-secondary)" />
        <SecStat
          label="Average salary"
          value={formatPHP(kpis.avgSalary)}
          sub="Monthly gross"
          accent="var(--color-text-secondary)"
        />
        <SecStat label="Payroll MTD" value={formatPHP(kpis.totalPayrollMtd)} sub="Current month" accent="var(--color-teal-700)" />
        <SecStat label="Next run" value={formatDate(kpis.nextRunDate)} sub="Estimated" accent="var(--color-indigo-700)" />
      </div>

      {currentRun && (
        <div className="mt-7 grid grid-cols-[1.6fr_1fr] items-start gap-[18px]">
          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-[22px] py-5">
              <div>
                <div className="text-xs text-[var(--color-text-muted)]">{currentRun.reference}</div>
                <div className="mt-1 font-display text-xl font-semibold">Current pay run</div>
                <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                  {currentRun.periodLabel}
                </div>
              </div>
              <span className="shrink-0 rounded-pill bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning-text)]">
                {currentRun.status}
              </span>
            </div>
            <div className="grid grid-cols-4 border-b border-[var(--color-border)]">
              <MiniStat label="Cutoff" value={currentRun.periodLabel} />
              <MiniStat label="Payment date" value={formatDate(currentRun.paymentDate)} border />
              <MiniStat label="Employees" value={`${currentRun.employeeCount} included`} border />
              <MiniStat label="Prepared by" value={currentRun.preparedBy} border />
            </div>
            <div className="border-b border-[var(--color-border)] px-[22px] py-[18px]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
                  Preparation progress
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Step {currentRun.stepsDone} of {currentRun.stepsTotal} ·{" "}
                  {currentRun.stepsTotal > 0 ? Math.round((currentRun.stepsDone / currentRun.stepsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-[var(--color-surface-muted)]">
                <div
                  className="h-full rounded-pill bg-[var(--color-kahel-500)]"
                  style={{
                    width: `${currentRun.stepsTotal > 0 ? Math.round((currentRun.stepsDone / currentRun.stepsTotal) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 border-b border-[var(--color-border)]">
              <MiniStat label="Gross pay" value={formatPHP(currentRun.grossTotal)} bold />
              <MiniStat label="Deductions" value={formatPHP(currentRun.deductionsTotal)} bold border />
              <MiniStat label="Employer share" value={formatPHP(currentRun.employerShare)} bold border />
              <div className="border-l border-[var(--color-border)] bg-[var(--color-kahel-50)] px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-kahel-700)]">
                  Net pay
                </div>
                <div className="mt-1.5 font-display text-lg font-bold text-[var(--color-kahel-700)]">
                  {formatPHP(currentRun.netTotal)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-[22px] py-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-warning-text)]">
                <TriangleAlert className="h-4 w-4" /> {currentRun.status === "draft" ? "Ready for review" : "In progress"}
              </div>
              <ActionButton label="Review attendance" className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-[18px] text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
                Review attendance →
              </ActionButton>
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-5 py-4">
              <TriangleAlert className="h-4 w-4 text-[var(--color-warning-text)]" strokeWidth={1.75} />
              <span className="font-display text-base font-semibold">Attention required</span>
              <span className="ml-auto rounded-pill bg-[var(--color-warning-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warning-text)]">
                0
              </span>
            </div>
            <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No outstanding issues
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiBox({ label, value, tag, i }: { label: string; value: string; tag: string; i: number }) {
  return (
    <div className="px-6 py-5" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
          {label}
        </div>
        <span className="rounded-pill bg-[var(--color-warning-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--color-warning-text)]">
          {tag}
        </span>
      </div>
      <div className="mt-3 font-display text-[29px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
        {value}
      </div>
    </div>
  );
}

function SecStat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[18px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]" style={{ color: accent }}>
        {label}
      </div>
      <div className="mt-2.5 font-display text-[23px] font-bold text-[var(--color-text-primary)]">{value}</div>
      <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, border, bold }: { label: string; value: string; border?: boolean; bold?: boolean }) {
  return (
    <div className={`px-5 py-3.5 ${border ? "border-l border-[var(--color-border)]" : ""}`}>
      <div className="text-[11px] uppercase tracking-[0.03em] text-[var(--color-text-muted)]">{label}</div>
      <div className={`mt-1 text-sm ${bold ? "font-display font-bold text-base" : "font-semibold"}`}>{value}</div>
    </div>
  );
}
