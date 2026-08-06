import { Info } from "lucide-react";

const BUSINESS_INFO = [
  { label: "Business name", value: "Kahel Studio" },
  { label: "TIN", value: "224-467-332-0000" },
  { label: "Tax type", value: "Non-VAT" },
  { label: "Official receipt type", value: "Physical Service Invoice" },
];

const BOOKLET_FIELDS = [
  { label: "Active booklet ATP", value: "—" },
  { label: "Serial range", value: "—" },
  { label: "Current serial", value: "—" },
];

export default function SettingsBillingPage() {
  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Billing &amp; BIR
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Active invoice booklet and payment provider
      </p>

      <div className="mb-4 mt-7 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        Business information
      </div>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {BUSINESS_INFO.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 mt-9 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        Invoice booklet
      </div>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {BOOKLET_FIELDS.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px]">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-medium text-[var(--color-text-muted)]">{r.value}</span>
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
          Booklet details (ATP number, serial range, current serial) must be entered by an admin when a new BIR
          receipt book is activated. Emailed receipts must state they are not official BIR receipts.
        </div>
      </div>
    </div>
  );
}
