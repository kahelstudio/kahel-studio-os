"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FolderKanban } from "lucide-react";
import {
  BOOKING_STATUS,
  BOOKING_STEPS_ORDER,
  type BookingRow,
  type BookingStatusId,
} from "@/lib/sample-data";
import { useToast } from "@/components/toast/toast-provider";

const STEP_LABELS: Record<BookingStatusId, string> = {
  inquiry: "Inquiry",
  quoted: "Quoted",
  confirmed: "Confirmed",
  progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function BookingDetailClient({ booking }: { booking: BookingRow }) {
  const [status, setStatus] = useState<BookingStatusId>(booking.status);
  const { fireToast } = useToast();
  const statusMeta = BOOKING_STATUS[status];
  const curIndex = BOOKING_STEPS_ORDER.indexOf(status);

  function confirmBooking() {
    setStatus("confirmed");
    fireToast(`${booking.ref} confirmed · deposit invoice sent`, "success");
  }

  return (
    <div className="max-w-[1040px] p-10 pb-10 pt-6">
      <Link
        href="/booking/list"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        ‹ Bookings
      </Link>

      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm text-[var(--color-text-secondary)]">{booking.ref}</div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink-800)]">
            {booking.account} · {booking.type.split(" — ")[0].split(" / ")[0]}
          </h1>
        </div>
        <span
          className="rounded-pill px-3.5 py-1.5 text-[13px] font-semibold"
          style={{ background: statusMeta.bg, color: statusMeta.text }}
        >
          {statusMeta.label}
        </span>
      </div>

      {curIndex >= 0 && (
        <div className="mt-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-[22px]">
          <div className="flex items-center justify-between">
            {BOOKING_STEPS_ORDER.map((step, i) => {
              const done = i < curIndex;
              const active = i === curIndex;
              const dotBg = done ? "#00A15C" : active ? "var(--color-kahel-500)" : "#fff";
              const dotColor = done || active ? "#fff" : "#9B9691";
              const dotBorder = done ? "#00A15C" : active ? "var(--color-kahel-500)" : "var(--color-border)";
              const labelColor = active ? "var(--color-ink-800)" : done ? "#005430" : "var(--color-text-muted)";
              const lineColor = done ? "#00A15C" : "var(--color-border)";
              const isLast = i === BOOKING_STEPS_ORDER.length - 1;
              return (
                <div key={step} className={isLast ? "flex min-w-0 items-center gap-3" : "flex min-w-0 flex-1 items-center gap-3"}>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-semibold"
                    style={{ background: dotBg, color: dotColor, borderColor: dotBorder }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <div className="min-w-0 whitespace-nowrap text-[13px] font-semibold" style={{ color: labelColor }}>
                    {STEP_LABELS[step]}
                  </div>
                  {!isLast && <div className="h-0.5 min-w-6 flex-1" style={{ background: lineColor }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-[1.5fr_1fr] gap-5">
        <div className="flex flex-col gap-4">
          {booking.sessionDetails && (
            <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="mb-3.5 font-display text-[15px] font-semibold">Session details</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Date & time" value={booking.sessionDetails.dateTime} />
                <Field label="Location" value={booking.sessionDetails.location} />
                <Field label="Session type" value={booking.sessionDetails.sessionType} />
                <Field label="Balance due on" value={booking.sessionDetails.balanceDueOn} />
              </div>
            </div>
          )}

          {booking.auditLog && (
            <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="border-b border-[var(--color-ink-100)] px-5 py-3.5 font-display text-[15px] font-semibold">
                Audit history
              </div>
              {booking.auditLog.map((e, i) => (
                <div key={i} className="flex gap-3.5 border-b border-[var(--color-ink-50)] px-5 py-3 text-[13px] last:border-b-0">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.dot }} />
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">{e.text}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{e.when}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {booking.payment && (
            <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="mb-3 font-display text-[15px] font-semibold">Payment</div>
              <Row label="Total" value={booking.payment.total} bold />
              <Row label="Deposit (50%)" value={booking.payment.deposit} />
              <div className="mt-1.5 flex justify-between border-t border-[var(--color-ink-100)] pt-1.5 text-sm">
                <span className="text-[var(--color-text-secondary)]">Balance</span>
                <span className="font-display font-semibold text-[var(--color-kahel-700)]">
                  {booking.payment.balance}
                </span>
              </div>
            </div>
          )}

          {status === "quoted" && (
            <div className="rounded-card border border-[#FADBB0] bg-[var(--color-kahel-50)] p-5">
              <div className="font-display text-[15px] font-semibold text-[var(--color-kahel-700)]">
                Ready to confirm?
              </div>
              <p className="my-1.5 text-[13px] leading-[19px] text-[var(--color-text-secondary)]">
                Sends the deposit invoice and locks the date. This is the moment that matters.
              </p>
              <button
                onClick={confirmBooking}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] font-display text-base font-semibold text-white hover:bg-[var(--color-kahel-600)]"
              >
                <CheckCircle2 className="h-[18px] w-[18px]" /> Confirm booking
              </button>
            </div>
          )}

          {curIndex >= BOOKING_STEPS_ORDER.indexOf("confirmed") && (
            <>
              <div className="rounded-card border border-[#A7E9C7] bg-[var(--color-success-bg)] p-5 text-center">
                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="font-display text-base font-semibold text-[var(--color-success-text)]">
                  Confirmed
                </div>
                <div className="mt-0.5 text-[13px] text-[var(--color-success-text)]">
                  Date locked · deposit invoice sent
                </div>
              </div>

              {(booking.linkedProjectRef || status === "confirmed") && (
                <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-[var(--color-indigo-100)] text-[var(--color-indigo-800)]">
                      <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="font-display text-sm font-semibold">Linked project</span>
                  </div>
                  <div className="font-mono text-xs text-[var(--color-text-secondary)]">
                    {booking.linkedProjectRef ?? `PRJ-${booking.ref.slice(3)}`}
                  </div>
                  <p className="my-0.5 text-xs leading-[17px] text-[var(--color-text-secondary)]">
                    Auto-created on confirmation. Production, team and deliverables live here.
                  </p>
                  <button className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-control border border-[var(--color-ink-300)] bg-[var(--color-surface)] text-[13px] font-semibold text-[var(--color-indigo-800)] hover:border-[var(--color-indigo-800)]">
                    Open project →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className={bold ? "font-display font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
