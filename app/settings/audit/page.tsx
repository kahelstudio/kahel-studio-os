import { SETTINGS_AUDIT } from "@/lib/sample-data";

export default function SettingsAuditPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Audit log
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Immutable record of workspace-level changes — security events, permission updates, billing and settings changes
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {SETTINGS_AUDIT.map((e, i) => (
          <div key={i} className="flex flex-wrap items-start gap-3.5 border-b border-[var(--color-border)] px-5 py-4 text-sm last:border-b-0">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.dot }} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{e.ev}</div>
              <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {e.actor} · {e.target} · {e.detail}
              </div>
            </div>
            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{e.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
