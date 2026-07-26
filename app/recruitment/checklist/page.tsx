import { OFFBOARDING_CHECKLIST } from "@/lib/sample-data";

export default function RecruitmentChecklistPage() {
  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Exit checklist
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        The standard steps every departure runs through
      </p>

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
  );
}
