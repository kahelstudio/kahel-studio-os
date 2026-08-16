import { OFFBOARDING_CHECKLIST } from "@/lib/sample-data";

export default function RecruitmentChecklistPage() {
  return (
    <div className="max-w-[1000px]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6">
      <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
        Exit checklist
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        The standard steps every departure runs through
      </p>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {OFFBOARDING_CHECKLIST.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5 text-sm last:border-b-0"
          >
            <span className="h-[22px] w-[22px] shrink-0 rounded-[6px] border-[1.5px] border-[var(--color-border-strong)]" />
            <span className="font-medium">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
