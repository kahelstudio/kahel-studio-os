import { TriangleAlert } from "lucide-react";

export default function AttendanceEngagementsPage() {
  return (
    <div className="max-w-[1000px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Engagements
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Freelance staff records — copyright assignment required before payout
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-card border border-[#FADBB0] bg-[var(--color-kahel-50)] px-5 py-4">
        <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-kahel-700)]" strokeWidth={1.75} />
        <div className="text-sm">
          <span className="font-semibold text-[var(--color-kahel-700)]">1 engagement</span>{" "}
          <span className="text-[var(--color-text-secondary)]">
            — Miguel Padua&rsquo;s copyright assignment is unsigned; payout is on hold
          </span>
        </div>
        <button className="ml-auto h-[34px] shrink-0 rounded-control border border-[#FCE6D3] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-kahel-700)]">
          Send to sign
        </button>
      </div>
    </div>
  );
}
