"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { POLICY_ACK_STATEMENT, POLICY_META, POLICY_NOTE, POLICY_SECTIONS } from "@/lib/sample-data";
import { PolicySections } from "@/components/policies/policy-sections";
import { useToast } from "@/components/toast/toast-provider";

const STORAGE_KEY = "ks_policyAcked";

export default function CompanyPoliciesPage() {
  const { fireToast } = useToast();
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    // One-time sync from localStorage (an external system) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAcked(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function acknowledge() {
    setAcked(true);
    localStorage.setItem(STORAGE_KEY, "1");
    fireToast("Company Policies acknowledged", "success");
  }

  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Company policies
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            The Kahel Studio handbook — read and acknowledge the version that applies to your role.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-pill bg-[var(--color-indigo-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-indigo-800)]">
            {POLICY_META.ver}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">{POLICY_META.eff}</span>
        </div>
      </div>

      {acked ? (
        <div className="mt-[22px] flex items-center gap-3 rounded-card border border-[#B7E6CC] bg-[var(--color-success-bg)] px-[18px] py-3.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success-text)]" strokeWidth={1.75} />
          <span className="text-sm font-medium text-[var(--color-success-text)]">
            You acknowledged Company Policies v1.0 · 22 Jul 2026
          </span>
        </div>
      ) : (
        <div className="mt-[22px] flex items-center gap-3 rounded-card border border-[#F0D9A0] bg-[var(--color-warning-bg)] px-[18px] py-3.5">
          <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-warning-text)]" strokeWidth={1.75} />
          <span className="text-sm font-medium text-[var(--color-warning-text)]">
            Please read the handbook and acknowledge it at the bottom.
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-3 rounded-card border border-[#FADBB0] bg-[#FFF9F5] px-[18px] py-3.5">
        <Info className="h-4 w-4 shrink-0 text-[var(--color-kahel-700)]" strokeWidth={1.75} />
        <span className="text-[13px] leading-[1.5] text-[#8A3B12]">{POLICY_NOTE}</span>
      </div>

      <PolicySections sections={POLICY_SECTIONS} />

      <div className="mt-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="font-display text-base font-semibold">Employee acknowledgement</div>
        <p className="mt-2.5 text-sm leading-[1.6] text-[#4A4640]">{POLICY_ACK_STATEMENT}</p>
        <div className="mt-[18px] flex flex-wrap items-center gap-3.5">
          {!acked ? (
            <button
              onClick={acknowledge}
              className="flex h-11 items-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
            >
              <CheckCircle2 className="h-4 w-4" /> I acknowledge v1.0
            </button>
          ) : (
            <span className="inline-flex h-11 items-center gap-2 rounded-control bg-[var(--color-success-bg)] px-[18px] text-sm font-semibold text-[var(--color-success-text)]">
              <CheckCircle2 className="h-4 w-4" /> Acknowledged
            </span>
          )}
          <span className="text-xs text-[var(--color-text-muted)]">Eusebio Barrun · {POLICY_META.ver}</span>
        </div>
      </div>
    </div>
  );
}
