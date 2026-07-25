import { PREFERENCES_GENERAL } from "@/lib/sample-data";

export default function PreferencesGeneralPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Preferences
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Personal to your account — separate from workspace settings
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PREFERENCES_GENERAL.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-ink-100)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
