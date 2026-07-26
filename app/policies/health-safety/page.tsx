"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { HEALTH_AND_SAFETY_ACK_STATEMENT, HEALTH_AND_SAFETY_POLICY_SECTIONS } from "@/lib/sample-data";
import { PolicySections } from "@/components/policies/policy-sections";
import { useToast } from "@/components/toast/toast-provider";

const STORAGE_KEY = "ks_healthSafetyPolicyAcked";

export default function HealthSafetyPolicyPage() {
  const { fireToast } = useToast();
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    // One-time sync from localStorage (an external system) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAcknowledged(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function acknowledge() {
    setAcknowledged(true);
    localStorage.setItem(STORAGE_KEY, "1");
    fireToast("Health & Safety Policy acknowledged", "success");
  }

  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Staff Health &amp; Safety Policy
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Clean, safe and healthy studio practices for staff, clients and visitors.
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Applies to all employees, freelancers, interns and authorised contractors.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-pill bg-[var(--color-indigo-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-indigo-800)]">
            Version 1.0
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">Effective date: [Insert date]</span>
          <span className="text-xs text-[var(--color-text-muted)]">Policy owner: Kahel Studio Management</span>
        </div>
      </div>

      {acknowledged ? (
        <div className="mt-[22px] flex items-center gap-3 rounded-card border border-[#B7E6CC] bg-[var(--color-success-bg)] px-[18px] py-3.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success-text)]" strokeWidth={1.75} />
          <span className="text-sm font-medium text-[var(--color-success-text)]">
            You acknowledged Staff Health &amp; Safety Policy v1.0
          </span>
        </div>
      ) : (
        <div className="mt-[22px] flex items-center gap-3 rounded-card border border-[#F0D9A0] bg-[var(--color-warning-bg)] px-[18px] py-3.5">
          <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-warning-text)]" strokeWidth={1.75} />
          <span className="text-sm font-medium text-[var(--color-warning-text)]">
            Please read the policy and acknowledge it at the bottom.
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-3 rounded-card border border-[var(--color-kahel-200)] bg-[var(--color-kahel-50)] px-[18px] py-3.5">
        <Info className="h-4 w-4 shrink-0 text-[var(--color-kahel-700)]" strokeWidth={1.75} />
        <span className="text-[13px] leading-[1.5] text-[var(--color-kahel-700)]">
          This policy applies both on-site at Zone 1, Cobo, Tabaco City, Albay and at any off-site location where staff are
          performing work for Kahel Studio. Report hazards immediately to your supervisor or the management team.
        </span>
      </div>

      <PolicySections sections={HEALTH_AND_SAFETY_POLICY_SECTIONS} />

      <div className="mt-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="font-display text-base font-semibold">Staff acknowledgement</div>
        <p className="mt-2.5 text-sm leading-[1.6] text-[var(--color-text-primary)]">{HEALTH_AND_SAFETY_ACK_STATEMENT}</p>
        <div className="mt-[18px] flex flex-wrap items-center gap-3.5">
          {!acknowledged ? (
            <button onClick={acknowledge} className="flex h-11 items-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
              <CheckCircle2 className="h-4 w-4" /> I acknowledge v1.0
            </button>
          ) : (
            <span className="inline-flex h-11 items-center gap-2 rounded-control bg-[var(--color-success-bg)] px-[18px] text-sm font-semibold text-[var(--color-success-text)]">
              <CheckCircle2 className="h-4 w-4" /> Acknowledged
            </span>
          )}
          <span className="text-xs text-[var(--color-text-muted)]">Version 1.0</span>
        </div>
      </div>
    </div>
  );
}
