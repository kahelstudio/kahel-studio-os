"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, FolderKanban, Pencil, Check, X } from "lucide-react";
import {
  BOOKING_STATUS,
  BOOKING_STEPS_ORDER,
  type BookingRow,
  type BookingStatusId,
} from "@/lib/sample-data";
import { useToast } from "@/components/toast/toast-provider";
import { cancelBooking, updateBookingStatus, saveDepositVerificationId } from "./actions";

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
  const [isPending, startTransition] = useTransition();
  const [verificationId, setVerificationId] = useState(booking.payment?.depositVerificationId ?? "");
  const [editingVerif, setEditingVerif] = useState(false);
  const [verifDraft, setVerifDraft] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const verifInputRef = useRef<HTMLInputElement>(null);
  const { fireToast } = useToast();
  const statusMeta = BOOKING_STATUS[status];
  const curIndex = BOOKING_STEPS_ORDER.indexOf(status);

  function confirmBooking() {
    startTransition(async () => {
      try {
        await updateBookingStatus(booking.ref, "confirmed");
        setStatus("confirmed");
        fireToast(`${booking.ref} confirmed · deposit invoice sent`, "success");
      } catch {
        fireToast("Failed to confirm booking. Please try again.", "danger");
      }
    });
  }

  function startEditVerif() {
    setVerifDraft(verificationId);
    setEditingVerif(true);
    setTimeout(() => verifInputRef.current?.focus(), 0);
  }

  function cancelEditVerif() {
    setEditingVerif(false);
  }

  function submitVerif() {
    const next = verifDraft.trim();
    startTransition(async () => {
      try {
        await saveDepositVerificationId(booking.ref, next);
        setVerificationId(next);
        setEditingVerif(false);
        fireToast("Verification ID saved", "success");
      } catch {
        fireToast("Failed to save verification ID.", "danger");
      }
    });
  }

  function submitCancellation() {
    if (!cancellationReason.trim()) return;
    startTransition(async () => {
      try {
        await cancelBooking(booking.ref, cancellationReason);
        setStatus("cancelled");
        setCancelling(false);
        fireToast("Booking cancelled and schedule released.", "success");
      } catch (error) {
        fireToast(error instanceof Error ? error.message : "Failed to cancel booking.", "danger");
      }
    });
  }

  return (
    <div className="max-w-[1040px] p-4 pb-8 pt-5 sm:p-6 sm:pb-10 xl:p-10 xl:pt-6">
      <Link
        href="/booking/list"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        ‹ Bookings
      </Link>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="text-sm text-[var(--color-text-secondary)]">{booking.ref}</div>
          <h1 className="font-display text-[clamp(1.5rem,6vw,1.75rem)] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)]">
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
        <div className="mt-5 overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 sm:px-6 sm:py-[22px]">
          <div className="flex min-w-[680px] items-center justify-between">
            {BOOKING_STEPS_ORDER.map((step, i) => {
              const done = i < curIndex;
              const active = i === curIndex;
              const dotBg = done ? "#00A15C" : active ? "var(--color-kahel-500)" : "#fff";
              const dotColor = done || active ? "#fff" : "#9B9691";
              const dotBorder = done ? "#00A15C" : active ? "var(--color-kahel-500)" : "var(--color-border)";
              const labelColor = active ? "var(--color-text-primary)" : done ? "#005430" : "var(--color-text-muted)";
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

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
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
              <div className="border-b border-[var(--color-border)] px-5 py-3.5 font-display text-[15px] font-semibold">
                Audit history
              </div>
              {booking.auditLog.map((e, i) => (
                <div key={i} className="flex gap-3.5 border-b border-[var(--color-border)] px-5 py-3 text-[13px] last:border-b-0">
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
              <div className="mt-1.5 flex justify-between border-t border-[var(--color-border)] pt-1.5 text-sm">
                <span className="text-[var(--color-text-secondary)]">Balance</span>
                <span className="font-display font-semibold text-[var(--color-kahel-700)]">
                  {booking.payment.balance}
                </span>
              </div>
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                <div className="mb-1 text-xs text-[var(--color-text-muted)]">Downpayment verification ID</div>
                {editingVerif ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={verifInputRef}
                      value={verifDraft}
                      onChange={(e) => setVerifDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitVerif(); if (e.key === "Escape") cancelEditVerif(); }}
                      placeholder="e.g. GCash ref, bank ref…"
                      className="h-8 flex-1 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-2.5 text-sm focus:border-[var(--color-kahel-500)] focus:outline-none"
                    />
                    <button
                      onClick={submitVerif}
                      disabled={isPending}
                      aria-label="Save"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-[var(--color-kahel-500)] text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={cancelEditVerif}
                      aria-label="Cancel"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-control border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditVerif}
                    className="group flex w-full items-center justify-between rounded-control px-0 py-0.5 text-left hover:text-[var(--color-text-primary)]"
                  >
                    <span className={verificationId ? "text-sm font-medium text-[var(--color-text-primary)]" : "text-sm text-[var(--color-text-muted)]"}>
                      {verificationId || "Not set — tap to add"}
                    </span>
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>
          )}

          {(status === "inquiry" || status === "quoted") && (
            <div className="rounded-card border border-[#FADBB0] bg-[var(--color-kahel-50)] p-5">
              <div className="font-display text-[15px] font-semibold text-[var(--color-kahel-700)]">
                Ready to confirm?
              </div>
              <p className="my-1.5 text-[13px] leading-[19px] text-[var(--color-text-secondary)]">
                {status === "quoted"
                  ? "Sends the deposit invoice and locks the date. This is the moment that matters."
                  : "Lock in the date and move this booking to confirmed. You can send an invoice separately."}
              </p>
              <button
                onClick={confirmBooking}
                disabled={isPending}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] font-display text-base font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60"
              >
                <CheckCircle2 className="h-[18px] w-[18px]" />
                {isPending ? "Confirming…" : "Confirm booking"}
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
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {booking.linkedProjectRef ?? `PRJ-${booking.ref.slice(3)}`}
                  </div>
                  <p className="my-0.5 text-xs leading-[17px] text-[var(--color-text-secondary)]">
                    Auto-created on confirmation. Production, team and deliverables live here.
                  </p>
                  <button className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-control border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[13px] font-semibold text-[var(--color-indigo-800)] hover:border-[var(--color-indigo-800)]">
                    Open project →
                  </button>
                </div>
              )}
            </>
          )}

          {status !== "cancelled" && status !== "completed" && (
            <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="font-display text-[15px] font-semibold">Cancel booking</div>
              <p className="mt-1 text-[13px] leading-5 text-[var(--color-text-secondary)]">Cancellation preserves the booking, payment, and audit history while releasing its active resource reservation.</p>
              {cancelling ? <div className="mt-3 grid gap-3"><label className="grid gap-1.5 text-sm font-semibold">Cancellation reason<textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} required maxLength={500} rows={3} className="rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 font-normal" /></label><div className="flex gap-2"><button type="button" onClick={() => setCancelling(false)} disabled={isPending} className="min-h-11 flex-1 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Keep booking</button><button type="button" onClick={submitCancellation} disabled={isPending || !cancellationReason.trim()} className="min-h-11 flex-1 rounded-control bg-[var(--color-danger-text)] px-3 text-sm font-semibold text-white disabled:opacity-60">{isPending ? "Cancelling..." : "Confirm cancellation"}</button></div></div> : <button type="button" onClick={() => setCancelling(true)} className="mt-3 min-h-11 w-full rounded-control border border-[var(--color-danger-text)] px-4 text-sm font-semibold text-[var(--color-danger-text)]">Cancel this booking</button>}
            </div>
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
