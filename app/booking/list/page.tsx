export const dynamic = "force-dynamic";

import Link from "next/link";
import { BOOKING_STATUS } from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import { getRealBookings } from "@/lib/server/bookings-data";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "quoted", label: "Quoted" },
  { id: "confirmed", label: "Confirmed" },
  { id: "progress", label: "In progress" },
  { id: "month", label: "This month" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export default async function BookingListPage({ searchParams }: { searchParams: Promise<{ filter?: string | string[] }> }) {
  const allBookings = await getRealBookings().catch(() => []);
  const requestedFilter = (await searchParams).filter;
  const filter = FILTERS.some((item) => item.id === requestedFilter) ? requestedFilter as FilterId : "all";
  const monthParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const month = `${monthParts.year}-${monthParts.month}`;
  const bookings = allBookings.filter((booking) => {
    if (filter === "all") return true;
    if (filter === "month") return booking.serviceDate.startsWith(month);
    return booking.status === filter;
  });
  const active = allBookings.filter((b) => b.status !== "cancelled").length;
  const awaiting = allBookings.filter((b) => b.status === "quoted" || b.status === "inquiry").length;

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
        <OperationCreateButton kind="booking" className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          +New Booking
        </OperationCreateButton>
      </div>

      <div className="mb-3.5 flex gap-6 overflow-x-auto">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "all" ? "/booking/list" : `/booking/list?filter=${item.id}`}
            aria-current={filter === item.id ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 pb-2 pt-1 text-[13px] font-semibold transition-colors",
              filter === item.id
                ? "border-[#FF5300] text-[#FF5300]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {item.label}
          </Link>
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
            {filter === "all" ? "No bookings yet. The checkout form will populate this list." : `No ${FILTERS.find((item) => item.id === filter)?.label.toLowerCase()} bookings found.`}
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
