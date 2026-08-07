export default function PreferencesNotificationsPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Notifications
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">What reaches you, and how</p>

      <div className="mt-8 flex flex-col items-center justify-center rounded-card border border-dashed border-[var(--color-border)] py-14 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Notification preferences coming soon</p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Per-user notification controls will appear here in a future update.
        </p>
      </div>
    </div>
  );
}
