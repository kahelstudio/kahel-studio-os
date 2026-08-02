import { ArrowRight, CalendarDays, Gift } from "lucide-react";

export type LoyaltyRewardStatus =
  | "earned"
  | "available"
  | "reserved"
  | "redeemed"
  | "cancelled"
  | "reinstated"
  | "expired";

export type LoyaltyEligibleBooking = {
  id: string;
  bookingRef: string;
  title: string;
  bookedAt: string;
};

export type LoyaltyRewardHistoryItem = {
  id: string;
  title: string;
  status: LoyaltyRewardStatus;
  date: string;
  bookingRef?: string;
};

export type LoyaltySummary = {
  programTitle: string;
  active: boolean;
  threshold: number;
  eligibleCount: number;
  cycleProgress: number;
  remaining: number;
  available: number;
  reserved: number;
  redeemed: number;
  lifetime: number;
  eligibleBookingHistory: LoyaltyEligibleBooking[];
  rewardsHistory: LoyaltyRewardHistoryItem[];
  termsVersion: string;
  termsEffectiveDate: string;
  termsUrl: string;
  bookingUrl: string;
  redeemUrl: string;
};

export type LoyaltyDashboardProps = {
  summary: LoyaltySummary;
};

const statusStyles: Record<LoyaltyRewardStatus, string> = {
  earned: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  available: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  reserved: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  redeemed: "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]",
  cancelled: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
  reinstated: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  expired: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function EmptyHistory({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">{children}</p>;
}

export function LoyaltyDashboard({ summary }: LoyaltyDashboardProps) {
  const progressMaximum = Math.max(1, summary.threshold);
  const progressNow = Math.min(progressMaximum, Math.max(0, summary.cycleProgress));
  const progressWidth = `${(progressNow / progressMaximum) * 100}%`;
  const termsHref = summary.termsUrl || "/client-portal/loyalty/terms";

  return (
    <section aria-labelledby="loyalty-title" className="text-[var(--color-text-primary)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[13px] font-semibold uppercase tracking-[.16em] text-[#FF5300]">Loyalty rewards</p>
          <h2 id="loyalty-title" className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-[-.025em] sm:text-[36px]">
            {summary.programTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            Eligible bookings bring you closer to your next reward. Track your progress and use available rewards here.
          </p>
        </div>
        <a
          href={summary.bookingUrl}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30"
        >
          Book a session <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {!summary.active && (
        <div role="status" className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-warning-bg)] px-5 py-4 text-sm text-[var(--color-warning-text)]">
          <strong className="font-semibold">Rewards are paused.</strong> Your progress and reward history are safe, but new eligible bookings will not be counted until the program resumes.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Current reward cycle</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">{summary.cycleProgress}</span> of {summary.threshold} eligible bookings
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-display text-2xl font-semibold tabular-nums">{summary.remaining}</p>
            <p className="text-xs text-[var(--color-text-muted)]">remaining</p>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label={`${summary.programTitle} reward cycle: ${summary.cycleProgress} of ${summary.threshold} eligible bookings`}
          aria-valuemin={0}
          aria-valuemax={progressMaximum}
          aria-valuenow={progressNow}
          className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
        >
          <div className="h-full bg-[#FF5300]" style={{ width: progressWidth }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
          {summary.eligibleCount} eligible {summary.eligibleCount === 1 ? "booking" : "bookings"} recorded in total.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Available", summary.available],
          ["Reserved", summary.reserved],
          ["Redeemed", summary.redeemed],
          ["Lifetime earned", summary.lifetime],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--color-text-muted)]">{label}</p>
            <p className="mt-3 font-display text-[30px] font-semibold leading-none tabular-nums">{value}</p>
          </article>
        ))}
      </div>

      {summary.available > 0 && summary.active && (
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[#FF5300] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">You have {summary.available} available {summary.available === 1 ? "reward" : "rewards"}.</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Choose a reward before completing your next booking.</p>
          </div>
          <a href={summary.redeemUrl} className="inline-flex min-h-11 items-center justify-center rounded-[9px] bg-[#FF5300] px-5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30">
            Use a reward
          </a>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="eligible-bookings-title">
          <h3 id="eligible-bookings-title" className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[.16em]">Eligible booking history</h3>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {summary.eligibleBookingHistory.length === 0 ? <EmptyHistory>No eligible bookings yet.</EmptyHistory> : summary.eligibleBookingHistory.map((booking) => (
              <article key={booking.id} className="flex items-start gap-3 border-b border-[var(--color-border)] px-4 py-4 last:border-0 sm:px-5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{booking.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{booking.bookingRef} · {formatDate(booking.bookedAt)}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#FF5300]">+1</span>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="rewards-history-title">
          <h3 id="rewards-history-title" className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[.16em]">Rewards history</h3>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {summary.rewardsHistory.length === 0 ? <EmptyHistory>No reward activity yet.</EmptyHistory> : summary.rewardsHistory.map((reward) => (
              <article key={reward.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-4 py-4 last:border-0 sm:px-5">
                <div className="min-w-[150px] flex-1">
                  <p className="text-sm font-semibold">{reward.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{formatDate(reward.date)}{reward.bookingRef ? ` · ${reward.bookingRef}` : ""}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[reward.status]}`}>{reward.status}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-8 border-t border-[var(--color-border)] pt-5 text-xs leading-5 text-[var(--color-text-muted)]">
        Terms version {summary.termsVersion}, effective {formatDate(summary.termsEffectiveDate)}.{" "}
        <a href={termsHref} className="inline-flex min-h-11 items-center font-semibold text-[var(--color-kahel-700)] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30">
          Read loyalty program terms
        </a>
      </footer>
    </section>
  );
}
