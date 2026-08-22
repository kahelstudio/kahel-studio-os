export const dynamic = "force-dynamic";

import { getWaitlistEntries } from "@/lib/server/waitlist-data";
import { WaitlistTable } from "@/components/booking/waitlist-actions";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "notified", label: "Notified" },
  { value: "converted", label: "Converted" },
  { value: "cancelled", label: "Cancelled / expired" },
];

export default async function BookingWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "waiting" } = await searchParams;
  const filterStatus = STATUS_TABS.some((t) => t.value === status) ? status : "waiting";

  let entries: Awaited<ReturnType<typeof getWaitlistEntries>> = [];
  let fetchError = false;
  try {
    entries = await getWaitlistEntries(filterStatus === "all" ? undefined : filterStatus);
  } catch {
    fetchError = true;
  }

  const rows = entries.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    serviceName: e.serviceName,
    preferredStart: e.preferredStart,
    preferredEnd: e.preferredEnd,
    timeOfDay: e.timeOfDay,
    status: e.status,
    createdAt: e.createdAt,
    notifiedAt: e.notifiedAt,
  }));

  return (
    <div className="max-w-[1200px]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9 pt-[34px] px-4 sm:px-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
            Waitlist
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Clients who couldn&apos;t find a suitable time — notify manually when a slot opens
          </p>
        </div>
        <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">
          Manual notifications only
        </span>
      </header>

      <div className="px-4 sm:px-6 pb-12">
        {/* Status tabs */}
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
          {STATUS_TABS.map((tab) => (
            <a
              key={tab.value}
              href={`?status=${tab.value}`}
              className="inline-flex h-10 shrink-0 items-center px-4 text-sm font-semibold"
              style={
                filterStatus === tab.value
                  ? { color: "var(--color-kahel-700)", borderBottom: "2px solid var(--color-kahel-500)" }
                  : { color: "var(--color-text-secondary)" }
              }
            >
              {tab.label}
            </a>
          ))}
        </div>

        <div className="mt-5">
          {fetchError ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Unable to load waitlist data. Check your database connection and RLS policies.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-8 text-center">
              <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                {filterStatus === "waiting" ? "No one on the waitlist right now" : `No ${filterStatus} entries`}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {filterStatus === "waiting"
                  ? "Clients who click “Join waitlist” on the booking page will appear here."
                  : "Entries in this status will appear here once they're updated."}
              </p>
            </div>
          ) : (
            <WaitlistTable initialRows={rows} />
          )}
        </div>
      </div>
    </div>
  );
}
