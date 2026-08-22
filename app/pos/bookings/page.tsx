"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { BOOKING_STATUS, type BookingStatusId } from "@/lib/sample-data";
import { useToast } from "@/components/toast/toast-provider";
import { cn } from "@/lib/utils";
import type { RealBookingRow } from "@/lib/server/bookings-data";

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
  const [bookings, setBookings] = useState<RealBookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json() as Promise<RealBookingRow[]>)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="app-page min-h-full p-5 sm:p-7 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">Bookings</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Select a booking to collect payment or view details</p>
        </div>

        <div className="flex items-end gap-6 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} className={cn(
              "shrink-0 pb-3 text-sm font-semibold capitalize transition-colors",
              statusFilter === f.id ? "text-[#FF5300] underline decoration-[#FF5300] decoration-4 underline-offset-[6px]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-6 py-16 text-center text-sm text-[var(--color-text-muted)]">Loading bookings...</div>
      )}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {!loading && filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No bookings match this filter</p>
          </div>
        ) : filtered.map((booking) => {
          const status = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.quoted;
          const balance = booking.payment?.balance;
          const canCollect = balance && balance !== "\u20B10" && balance !== "\u20B10.00";

          return (
            <article key={booking.ref} className="flex min-h-[280px] flex-col rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold tracking-[0.08em] text-[var(--color-kahel-500)]">#{booking.ref.replace("KS-", "")}</span>
                <span className="rounded-pill px-2.5 py-1 text-xs font-semibold" style={{ background: status.bg, color: status.text }}>
                  {status.label}
                </span>
              </div>
              <h2 className="mt-3 font-display text-[20px] font-semibold text-[var(--color-text-primary)] leading-tight">
                {booking.account}
              </h2>
              <div className="mt-2.5 flex-1 space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                <p>{booking.type}</p>
                <p>{booking.date}</p>
              </div>
              {booking.payment && (
                <div className="mt-4 space-y-1 rounded-lg bg-[var(--color-canvas)] p-3 text-[13px]">
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Total</span><span className="font-semibold">{booking.payment.total}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Deposit</span><span>{booking.payment.deposit}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Balance</span><span className={canCollect ? "font-bold text-[var(--color-danger-text)]" : ""}>{balance}</span></div>
                </div>
              )}
              {canCollect && (
                <button
                  onClick={() => {
                    if (booking.paymongo_checkout_url) {
                      window.open(booking.paymongo_checkout_url, "_blank");
                    } else {
                      fireToast("No checkout link available.", "danger");
                    }
                  }}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
                >
                  Collect {balance}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
