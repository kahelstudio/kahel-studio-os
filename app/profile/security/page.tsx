import { SECURITY_ITEMS, SECURITY_SESSIONS } from "@/lib/sample-data";

export default function ProfileSecurityPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Security
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Sign-in, verification, and active sessions
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {SECURITY_ITEMS.map((s) => (
          <div key={s.label} className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
            <div>
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{s.sub}</div>
            </div>
            <button className="ml-auto h-[34px] shrink-0 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold hover:border-[var(--color-border-strong)]">
              {s.action}
            </button>
          </div>
        ))}
      </div>

      <div className="mb-4 mt-9 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        Active sessions
      </div>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {SECURITY_SESSIONS.map((s) => (
          <div key={s.device} className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
            <div>
              <div className="text-sm font-semibold">{s.device}</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{s.meta}</div>
            </div>
            {s.current ? (
              <span className="ml-auto rounded-pill bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success-text)]">
                This device
              </span>
            ) : (
              <button className="ml-auto h-8 rounded-control border border-[var(--color-border)] px-3 text-[13px] font-semibold text-[var(--color-danger-text)] hover:border-[var(--color-danger)]">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
