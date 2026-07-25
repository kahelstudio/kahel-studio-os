import { IT_POLICY_SECTIONS, POLICY_META } from "@/lib/sample-data";
import { PolicySections } from "@/components/policies/policy-sections";

export default function ItPolicyPage() {
  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
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
      </div>

      <PolicySections sections={IT_POLICY_SECTIONS} />
    </div>
  );
}
