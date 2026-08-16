import { IT_POLICY_SECTIONS, POLICY_META } from "@/lib/sample-data";
import { PolicySections } from "@/components/policies/policy-sections";

export default function ItPolicyPage() {
  return (
    <div className="max-w-[900px]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
            IT policy
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Responsible use of Kahel Studio devices, accounts, networks and data.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-pill bg-[var(--color-indigo-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-indigo-800)]">
            {POLICY_META.ver}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">{POLICY_META.eff}</span>
        </div>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      <PolicySections sections={IT_POLICY_SECTIONS} />
    </div>
    </div>
  );
}
