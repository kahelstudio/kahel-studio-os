export const dynamic = "force-dynamic";

import { OperationCreateButton } from "@/components/shared/operation-create-button";
import { BookingsWorkspace } from "@/components/booking/bookings-workspace";
import { getBookingsWorkspaceRows } from "@/lib/server/bookings-workspace";
import { bookingFiltersFromSearchParams, bookingSummary } from "@/lib/bookings-workspace";

export default async function BookingListPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const normalized = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") normalized.set(key, value);
  }
  const rows = await getBookingsWorkspaceRows().catch(() => []);
  const initialFilters = bookingFiltersFromSearchParams(normalized);
  const summary = bookingSummary(rows);
  const selectedRef = normalized.get("ref");

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex justify-end bg-[var(--color-surface)] px-4 py-4 sm:px-6">
        <OperationCreateButton kind="booking" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          + New Booking
        </OperationCreateButton>
      </div>
      <BookingsWorkspace rows={rows} summary={summary} initialFilters={initialFilters} selectedRef={selectedRef} />
    </div>
  );
}
