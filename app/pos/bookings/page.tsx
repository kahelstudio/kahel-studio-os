"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { BOOKINGS, BOOKING_STATUS, type BookingStatusId } from "@/lib/sample-data";
import { useToast } from "@/components/toast/toast-provider";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { id: BookingStatusId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "inquiry", label: "Inquiry" },
  { id: "quoted", label: "Quoted" },
  { id: "confirmed", label: "Confirmed" },
  { id: "progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

export default function PosBookingsPage() {
  const { fireToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<BookingStatusId | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = BOOKINGS.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!b.account.toLowerCase().includes(q) && !b.ref.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-full p-5 sm:p-7 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">Bookings</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Select a booking to collect payment or view details</p>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
          <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or ref…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)} className={cn(
            "h-8 rounded-control px-3 text-xs font-semibold transition-colors",
            statusFilter === f.id ? "bg-[var(--color-kahel-500)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
          )}>{f.label}</button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No bookings match this filter</p>
          </div>
        ) : filtered.map((booking) => {
          const status = BOOKING_STATUS[booking.status];
          const balance = booking.payment?.balance;
          const canCollect = balance && balance !== "₱0.00";

          return (
            <article key={booking.ref} className="flex min-h-[280px] flex-col rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold tracking-[0.08em] text-[var(--color-kahel-500)]">#{booking.ref.replace("KS-", "")}</span>
                <span className="rounded-pill px-2.5 py-1 text-xs font-semibold" style={{ background: status.bg, color: status.text }}>
                  {status.label}
                </span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-semibold text-[var(--color-text-primary)]">{booking.account}</h2>
                  <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">{booking.type} · {booking.date}</p>
                  {booking.sessionDetails && (
                    <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{booking.sessionDetails.location} · {booking.sessionDetails.sessionType}</p>
                  )}
                </div>
                <span className="shrink-0 font-display text-[26px] font-bold tabular-nums text-[var(--color-text-primary)]">
                  {balance ?? "—"}
                </span>
              </div>
              <p className="mt-3 text-[15px] text-[var(--color-text-muted)]">
                {booking.payment ? `${booking.payment.total} total · ${booking.payment.deposit} paid` : "Quote pending"}
              </p>
              <div className="mt-auto flex gap-2 pt-5">
                {booking.linkedProjectRef && (
                  <span className="text-xs text-[var(--color-text-muted)]">Project {booking.linkedProjectRef}</span>
                )}
                {canCollect && (
                  <button
                    type="button"
                    onClick={() => fireToast(`Collecting ${balance} from ${booking.account}`, "success")}
                    className="ml-auto h-10 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
                  >
                    Collect {balance}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
