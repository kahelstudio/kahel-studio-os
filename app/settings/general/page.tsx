const WORKSPACE_INFO = [
  { label: "Workspace name", value: "Kahel Studio" },
  { label: "Domain", value: "kahelstudio.com" },
  { label: "Timezone", value: "Asia/Manila (GMT+8)" },
  { label: "Currency", value: "PHP · ₱ · centavos" },
  { label: "Date format", value: "DD MMM YYYY" },
  { label: "Booking reference", value: "KS-YYYY-XXXX" },
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
    </div>
  );
}
