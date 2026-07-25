export default function SettingsTeamPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Team &amp; roles
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Phase 1 is owner-only — multi-user arrives with a later phase
      </p>

      <div className="mt-6 flex items-center gap-3.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-base font-semibold text-[var(--color-indigo-800)]">
          EB
        </div>
        <div>
          <div className="text-[15px] font-semibold">Eusebio Barrun</div>
          <div className="text-[13px] text-[var(--color-text-secondary)]">Owner · full access</div>
        </div>
        <span className="ml-auto rounded-pill bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success-text)]">
          Active
        </span>
      </div>

      <div className="mt-4 rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center">
        <div className="font-display text-base font-semibold text-[var(--color-ink-600)]">
          Invites open in a later phase
        </div>
        <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
          Staff apps and roles are deferred from Phase 1.
        </div>
      </div>
    </div>
  );
}
