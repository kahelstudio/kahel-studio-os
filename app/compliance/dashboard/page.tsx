import { Info } from "lucide-react";
import { COMPLIANCE_SUMMARY } from "@/lib/sample-data";

export default function ComplianceDashboardPage() {
  return (
    <div className="max-w-[1240px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Compliance
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Manage permits, renewals, statutory filings and business requirements
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-control border border-[var(--color-kahel-200)] bg-[var(--color-kahel-50)] px-3.5 py-2.5 text-[13px] text-[var(--color-kahel-700)]">
        <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Administrative tracker only — marking an item complete does not by itself mean Kahel Studio is legally
        compliant. Access limited to Super Admin &amp; authorised Admin.
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {COMPLIANCE_SUMMARY.map((s) => (
          <div key={s.label} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[22px]">
            <div className="text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
              {s.label}
            </div>
            <div className="mt-2.5 font-display text-[30px] font-bold tracking-[-0.02em]" style={{ color: s.tone }}>
              {s.value}
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-[18px] flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--color-indigo-500)]" />
        Reminders auto-sent to Super Admin &amp; assignee at 90 / 60 / 30 / 14 / 7 days before each deadline — a
        linked staff task is created when action is required.
      </div>
    </div>
  );
}
