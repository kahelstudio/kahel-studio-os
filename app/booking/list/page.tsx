export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { BOOKING_STATUS } from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import { getRealBookings } from "@/lib/server/bookings-data";
import { ActionButton } from "@/components/shared/action-button";

const FILTERS = ["All", "Quoted", "Confirmed", "In progress", "This month"];

export default async function BookingListPage() {
  const bookings = await getRealBookings().catch(() => []);
  const active = bookings.filter((b) => b.status !== "cancelled").length;
  const awaiting = bookings.filter((b) => b.status === "quoted" || b.status === "inquiry").length;

  return (
    <div className="p-10 pt-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            Bookings
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {active} active · {awaiting} awaiting confirmation
          </p>
        </div>
        <ActionButton label="New booking form" className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New booking
        </ActionButton>
      </div>

      <div className="mb-3.5 flex gap-2">
        {FILTERS.map((f, i) => (
          <ActionButton
            key={f}
            label={`Filter by ${f}`}
            className={cn(
              "h-8 rounded-pill border px-3.5 text-[13px] font-medium cursor-pointer",
              i === 0
                ? "border-[var(--color-kahel-500)] bg-[var(--color-kahel-50)] text-[var(--color-kahel-700)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            )}
          >
            {f}
          </ActionButton>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1.1fr_1.6fr_1.4fr_1fr_1fr] items-center bg-[var(--color-canvas)] px-[18px] text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Reference</div>
          <div>Account</div>
          <div>Session</div>
          <div>Status</div>
          <div className="text-right">Total</div>
        </div>
        {bookings.length === 0 && (
          <div className="px-[18px] py-12 text-center text-sm text-[var(--color-text-muted)]">
            No bookings yet. The checkout form will populate this list.
          </div>
        )}
        {bookings.map((b) => {
          const status = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.quoted;
          return (
            <Link
              key={b.ref}
              href={`/booking/list/${b.ref}`}
              className="grid h-14 grid-cols-[1.1fr_1.6fr_1.4fr_1fr_1fr] items-center border-b border-[var(--color-border)] px-[18px] text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="text-[13px] text-[var(--color-text-secondary)]">{b.ref}</div>
              <div className="truncate font-semibold text-[var(--color-text-primary)]">{b.account}</div>
              <div className="text-[var(--color-text-secondary)]">
                {b.type}
                <div className="text-xs text-[var(--color-text-muted)]">{b.date}</div>
              </div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: status.bg, color: status.text }}
                >
                  {status.label}
                </span>
              </div>
              <div className="text-right font-display font-semibold text-[var(--color-text-primary)]">{b.total}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}