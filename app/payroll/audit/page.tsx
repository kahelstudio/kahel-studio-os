import { PAYROLL_AUDIT } from "@/lib/sample-data";

export default function PayrollAuditPage() {
  return (
    <div className="max-w-[1200px] p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Audit log
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Immutable record of every payroll-affecting change — read-only
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PAYROLL_AUDIT.map((e, i) => (
          <div key={i} className="flex flex-wrap items-start gap-3.5 border-b border-[var(--color-ink-100)] px-5 py-4 text-sm last:border-b-0">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.dot }} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{e.ev}</div>
              <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {e.actor} · {e.ref} · {e.prev} → {e.next} · {e.reason}
              </div>
            </div>
            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{e.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
