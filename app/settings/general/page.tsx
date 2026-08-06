const WORKSPACE_INFO = [
  { label: "Workspace name", value: "Kahel Studio" },
  { label: "Domain", value: "kahelstudio.com" },
  { label: "Timezone", value: "Asia/Manila (GMT+8)" },
  { label: "Currency", value: "PHP · ₱ · centavos" },
  { label: "Date format", value: "DD MMM YYYY" },
  { label: "Booking reference", value: "KS-YYYY-XXXX" },
];

const NOTIFICATION_DEFAULTS = [
  { label: "Email receipts to clients", sub: "Send a copy on every completed sale", on: true },
  { label: "Deposit reminders", sub: "Nudge accounts 3 days before balance due", on: true },
  { label: "Low-stock alerts", sub: "Warn when a product drops below threshold", on: true },
  { label: "Weekly digest", sub: "Monday summary of the week ahead", on: false },
];

export default function SettingsGeneralPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        General
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Workspace basics and locale</p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {WORKSPACE_INFO.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 mt-9 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        Notifications
      </div>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {NOTIFICATION_DEFAULTS.map((t) => (
          <div key={t.label} className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
            <div>
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{t.sub}</div>
            </div>
            <div
              className="relative ml-auto h-6 w-[42px] shrink-0 rounded-pill"
              style={{ background: t.on ? "var(--color-success)" : "var(--color-ink-300)" }}
              aria-label={t.label}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                style={{ left: t.on ? "20px" : "2px" }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Notification preferences are applied workspace-wide. Per-user overrides coming in a future update.
      </p>
    </div>
  );
}
