import { Plus } from "lucide-react";
import { COMPLIANCE_REGISTER } from "@/lib/sample-data";

export default function ComplianceRegisterPage() {
  return (
    <div className="max-w-[1320px] p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
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
        {COMPLIANCE_REGISTER.map((c) => (
          <div
            key={c.req}
            className="grid min-h-[62px] grid-cols-[2fr_1.3fr_1.1fr_1fr_1.1fr_1.2fr] items-center border-b border-[var(--color-ink-100)] px-5 text-[13px] last:border-b-0 hover:bg-[var(--color-canvas)]"
          >
            <div>
              <div className="font-semibold" style={{ color: c.stColor }}>
                {c.req}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {c.cat} · {c.freq} · {c.who}
              </div>
            </div>
            <div className="text-[var(--color-ink-700)]">{c.agency}</div>
            <div className="font-mono text-xs text-[var(--color-text-muted)]">{c.num}</div>
            <div className="text-xs text-[var(--color-ink-700)]">{c.expiry}</div>
            <div>
              <div className="text-xs text-[var(--color-ink-700)]">{c.est}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Actual {c.act}</div>
            </div>
            <div>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: c.stBg, color: c.stColor }}
              >
                {c.stL}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Fees are a planning estimate — confirm with the issuing agency. Tabaco City computes business-permit
        charges from classification, activities, gross receipts and assessments. The BIR ₱500 annual registration
        fee is excluded (collection ceased 22 Jan 2024).
      </p>
    </div>
  );
}
