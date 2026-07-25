import { Download, TrendingUp, TriangleAlert, Plus } from "lucide-react";
import { PAYROLL_ATTENTION, PAYROLL_PRIMARY_KPIS, PAYROLL_SEC_STATS } from "@/lib/sample-data";

export default function PayrollOverviewPage() {
  return (
    <div className="max-w-[1260px] p-10 pb-14 pt-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Payroll
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-[15px] text-[var(--color-text-secondary)]">Current period · 16–31 Jul 2026</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-ink-300)]" />
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning-text)]">
              <TriangleAlert className="h-3.5 w-3.5" /> Attendance review
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">Updated 22 Jul · 14:20</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="flex h-10 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm font-semibold hover:border-[var(--color-border-strong)]">
            <TrendingUp className="h-4 w-4" /> Reports
          </button>
          <button className="flex h-10 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm font-semibold hover:border-[var(--color-border-strong)]">
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
            <Plus className="h-4 w-4" /> Create pay run
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PAYROLL_PRIMARY_KPIS.map((k, i) => (
          <div key={k.label} className="px-6 py-5" style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-ink-100)" }}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
                {k.label}
              </div>
              <span className="rounded-pill bg-[var(--color-warning-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--color-warning-text)]">
                {k.tag}
              </span>
            </div>
            <div className="mt-3 font-display text-[29px] font-bold tracking-[-0.02em] text-[var(--color-ink-800)]">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-4 gap-3.5">
        {PAYROLL_SEC_STATS.map((s) => (
          <div key={s.label} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[18px]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]" style={{ color: s.accent }}>
              {s.label}
            </div>
            <div className="mt-2.5 font-display text-[23px] font-bold text-[var(--color-ink-800)]">{s.value}</div>
            <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-[1.6fr_1fr] items-start gap-[18px]">
        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-ink-100)] px-[22px] py-5">
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">PAY-2026-07-B</div>
              <div className="mt-1 font-display text-xl font-semibold">Current pay run</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                16–31 July 2026 · second cutoff
              </div>
            </div>
            <span className="shrink-0 rounded-pill bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning-text)]">
              Attendance review
            </span>
          </div>
          <div className="grid grid-cols-4 border-b border-[var(--color-ink-100)]">
            <MiniStat label="Cutoff" value="16–31 Jul" />
            <MiniStat label="Payment date" value="31 Jul 2026" border />
            <MiniStat label="Employees" value="5 included" border />
            <MiniStat label="Prepared by" value="M. Reyes" border />
          </div>
          <div className="border-b border-[var(--color-ink-100)] px-[22px] py-[18px]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
                Preparation progress
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">Step 3 of 9 · 60%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-[var(--color-ink-100)]">
              <div className="h-full w-[60%] rounded-pill bg-[var(--color-kahel-500)]" />
            </div>
          </div>
          <div className="grid grid-cols-4 border-b border-[var(--color-ink-100)]">
            <MiniStat label="Gross pay" value="₱55,420.00" bold />
            <MiniStat label="Deductions" value="₱7,865.50" bold border />
            <MiniStat label="Employer share" value="₱6,142.00" bold border />
            <div className="border-l border-[var(--color-ink-100)] bg-[#FFF9F5] px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-kahel-700)]">
                Net pay
              </div>
              <div className="mt-1.5 font-display text-lg font-bold text-[var(--color-kahel-700)]">₱47,554.50</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 px-[22px] py-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-warning-text)]">
              <TriangleAlert className="h-4 w-4" /> 3 outstanding issues · 2 blocking
            </div>
            <button className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-[18px] text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
              Review attendance →
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2.5 border-b border-[var(--color-ink-100)] px-5 py-4">
            <TriangleAlert className="h-4 w-4 text-[var(--color-warning-text)]" strokeWidth={1.75} />
            <span className="font-display text-base font-semibold">Attention required</span>
            <span className="ml-auto rounded-pill bg-[var(--color-warning-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warning-text)]">
              {PAYROLL_ATTENTION.length}
            </span>
          </div>
          {PAYROLL_ATTENTION.map((a) => (
            <div key={a.emp} className="border-b border-[var(--color-ink-100)] px-5 py-3.5 last:border-b-0">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.dot }} />
                <span className="text-sm font-semibold">{a.emp}</span>
                <span
                  className="ml-auto rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: a.sevBg, color: a.sevColor }}
                >
                  {a.sevLabel}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-medium">{a.issue}</div>
              <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {a.detail} · due {a.date} · {a.who}
              </div>
              <button className="mt-2.5 h-8 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold hover:border-[var(--color-kahel-700)] hover:text-[var(--color-kahel-700)]">
                {a.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, border, bold }: { label: string; value: string; border?: boolean; bold?: boolean }) {
  return (
    <div className={`px-5 py-3.5 ${border ? "border-l border-[var(--color-ink-100)]" : ""}`}>
      <div className="text-[11px] uppercase tracking-[0.03em] text-[var(--color-text-muted)]">{label}</div>
      <div className={`mt-1 text-sm ${bold ? "font-display font-bold text-base" : "font-semibold"}`}>{value}</div>
    </div>
  );
}
