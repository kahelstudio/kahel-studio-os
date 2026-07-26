import { PAYROLL_SETTINGS_GROUPS } from "@/lib/sample-data";

export default function PayrollSettingsPage() {
  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Payroll settings
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Schedule, calculation rules, and controls for this workspace
      </p>

      <div className="mt-6 grid grid-cols-2 gap-5">
        {PAYROLL_SETTINGS_GROUPS.map((g) => (
          <div key={g.title} className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-ink-100)] px-5 py-3.5 font-display text-[15px] font-semibold">
              {g.title}
            </div>
            {g.items.map((item) => (
              <div key={item.l} className="flex items-center justify-between border-b border-[var(--color-ink-50)] px-5 py-3 text-sm last:border-b-0">
                <span className="text-[var(--color-text-secondary)]">{item.l}</span>
                <span className="font-semibold">{item.v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
