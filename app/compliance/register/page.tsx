export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { getComplianceRegister } from "@/lib/server/compliance-data";

const COMP_ST: Record<string, { bg: string; c: string; l: string }> = {
  expired: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)", l: "Expired" },
  action: { bg: "var(--color-attention-bg)", c: "var(--color-attention-text)", l: "Action required" },
  duesoon: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)", l: "Due soon" },
  submitted: { bg: "var(--color-info-bg)", c: "var(--color-info-text)", l: "Submitted" },
  review: { bg: "var(--color-info-bg)", c: "var(--color-info-text)", l: "Under review" },
  compliant: { bg: "var(--color-success-bg)", c: "var(--color-success-text)", l: "Compliant" },
  na: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)", l: "N/A" },
};

export default async function ComplianceRegisterPage() {
  const register = await getComplianceRegister();

  return (
    <div className="p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
            Compliance register
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Sorted by urgency · government identifiers are masked
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New record
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[2fr_1.3fr_1.1fr_1fr_1.1fr_1.2fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Requirement</div>
          <div>Agency</div>
          <div>Reg. no.</div>
          <div>Next / expiry</div>
          <div>Est. fee</div>
          <div>Status</div>
        </div>
        {register.map((c) => {
          const st = COMP_ST[c.status] ?? COMP_ST.compliant;
          return (
            <div
              key={c.id}
              className="grid min-h-[62px] grid-cols-[2fr_1.3fr_1.1fr_1fr_1.1fr_1.2fr] items-center border-b border-[var(--color-border)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div>
                <div className="font-semibold" style={{ color: st.c }}>
                  {c.requirement}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {c.category} · {c.frequency} · {c.responsiblePerson}
                </div>
              </div>
              <div className="text-[var(--color-text-primary)]">{c.agency}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{c.referenceNumber ?? "—"}</div>
              <div className="text-xs text-[var(--color-text-primary)]">{c.expiresOn ?? "—"}</div>
              <div>
                <div className="text-xs text-[var(--color-text-primary)]">{c.estimatedCost ?? "—"}</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Actual {c.actualCost ?? "—"}</div>
              </div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: st.bg, color: st.c }}
                >
                  {st.l}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Fees are a planning estimate — confirm with the issuing agency. Tabaco City computes business-permit
        charges from classification, activities, gross receipts and assessments. The BIR ₱500 annual registration
        fee is excluded (collection ceased 22 Jan 2024).
      </p>
    </div>
  );
}
