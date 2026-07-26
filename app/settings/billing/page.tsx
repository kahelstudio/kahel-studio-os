import { Info } from "lucide-react";
import { BILLING_ROWS } from "@/lib/sample-data";

export default function SettingsBillingPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Billing &amp; BIR
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Active invoice booklet and payment provider
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {BILLING_ROWS.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px]">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-medium">{r.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-[15px]">
          <span className="text-sm text-[var(--color-text-secondary)]">Payment provider</span>
          <span className="text-sm font-semibold">PayMongo · connected</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-card border border-[#FADBB0] bg-[var(--color-kahel-50)] px-5 py-4">
        <Info className="h-4 w-4 shrink-0 text-[var(--color-kahel-700)]" strokeWidth={1.75} />
        <div className="text-[13px] text-[var(--color-text-secondary)]">
          54 serials remain in the active booklet. The system records serials and scans — it never generates a BIR
          invoice.
        </div>
      </div>
    </div>
  );
}
