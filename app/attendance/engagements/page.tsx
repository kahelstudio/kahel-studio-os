export const dynamic = "force-dynamic";

import { TriangleAlert } from "lucide-react";
import { getRealBookings } from "@/lib/server/bookings-data";
import { getPayrollEmployees } from "@/lib/server/payroll-data";
import { ActionButton } from "@/components/shared/action-button";

export default async function AttendanceEngagementsPage() {
  const [bookings, employees] = await Promise.all([getRealBookings(), getPayrollEmployees()]);

  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "progress"
  );

  const pendingEmployees = employees.filter((e) => e.status === "pending" || e.status !== "active");
  const pendingCount = pendingEmployees.length;

  return (
    <div className="max-w-[1000px]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6">
      <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
        Engagements
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Active bookings and freelance staff records — copyright assignment required before payout
      </p>
      </header>

      <div className="px-4 sm:px-6 pb-12">
      {activeBookings.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="grid h-11 grid-cols-[2fr_1.4fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
            <div>Client / Booking</div>
            <div>Type</div>
            <div>Date</div>
            <div>Status</div>
          </div>
          {activeBookings.map((b) => (
            <div
              key={b.ref}
              className="grid h-14 grid-cols-[2fr_1.4fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div>
                <div className="font-semibold">{b.account}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{b.ref}</div>
              </div>
              <div className="text-[var(--color-text-secondary)]">{b.type}</div>
              <div className="text-[var(--color-text-primary)]">{b.date}</div>
              <div>
                <span className="rounded-pill bg-[var(--color-attention-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-attention-text)]">
                  {b.status === "confirmed" ? "Confirmed" : "In progress"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-card border border-[#FADBB0] bg-[var(--color-kahel-50)] px-5 py-4">
          <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-kahel-700)]" strokeWidth={1.75} />
          <div className="text-sm">
            <span className="font-semibold text-[var(--color-kahel-700)]">{pendingCount} staff record{pendingCount !== 1 ? "s" : ""}</span>{" "}
            <span className="text-[var(--color-text-secondary)]">
              {pendingEmployees[0]?.name ?? "A team member"}&rsquo;s copyright assignment is unsigned; payout is on hold
            </span>
          </div>
          <ActionButton label="Send copyright assignment for signature" className="ml-auto h-[34px] shrink-0 rounded-control border border-[#FCE6D3] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-kahel-700)]">
            Send to sign
          </ActionButton>
        </div>
      )}
    </div>
    </div>
  );
}
