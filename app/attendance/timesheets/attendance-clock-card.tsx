"use client";

import { useEffect, useState } from "react";
import { Clock, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

type ClockPhase = "out" | "in" | "done";

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

// Manila has no DST, so "today in Manila" at a given wall-clock hour/minute can be
// computed with a fixed +8h offset regardless of the runtime's own local timezone.
function manilaTodayAt(hours: number, minutes: number) {
  const shifted = new Date(Date.now() + MANILA_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return Date.UTC(y, m, d, hours, minutes) - MANILA_OFFSET_MS;
}

function fmtTime(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(ms);
}

function fmtDateTime(ms: number) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(ms);
  return `${date} · ${fmtTime(ms)}`;
}

function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

const STATUS_META: Record<ClockPhase, { label: string; bg: string; c: string }> = {
  out: { label: "Not clocked in", bg: "#F1EFEC", c: "#6E6963" },
  in: { label: "On shift", bg: "#E0F7EC", c: "#005430" },
  done: { label: "Clocked out", bg: "#F1EFEC", c: "#6E6963" },
};

export function AttendanceClockCard() {
  const { fireToast } = useToast();
  const [phase, setPhase] = useState<ClockPhase>("in");
  const [clockIn, setClockIn] = useState(() => manilaTodayAt(9, 14));
  const [clockOut, setClockOut] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [correctionSent, setCorrectionSent] = useState(false);

  useEffect(() => {
    if (phase !== "in") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const shiftStart = manilaTodayAt(9, 0);
  const lateMin = Math.max(0, Math.round((clockIn - shiftStart) / 60000));
  const endMs = phase === "done" ? (clockOut ?? now) : now;
  const grossMs = Math.max(0, endMs - clockIn);
  const breakMs = 3600000;
  const paidH = Math.max(0, grossMs - breakMs) / 3600000;

  type Exception = { label: string; detail: string; bg: string; c: string; badge?: string };
  const exceptions: Exception[] = [];
  if (phase === "done") {
    if (lateMin > 0) exceptions.push({ label: "Late in", detail: `${lateMin} min past 9:00 AM`, bg: "#FDF0D5", c: "#8A6D00" });
    if (paidH < 8)
      exceptions.push({
        label: "Undertime",
        detail: `${(8 - paidH).toFixed(2)} h short of 8:00`,
        bg: "#FDF0D5",
        c: "#8A6D00",
      });
    if (paidH > 8)
      exceptions.push({
        label: "Overtime",
        detail: `+${(paidH - 8).toFixed(2)} h beyond schedule`,
        bg: "#FFE3D4",
        c: "#B33800",
        badge: "Pending approval",
      });
    if (grossMs >= 21600000 && grossMs < breakMs + 8 * 3600000)
      exceptions.push({ label: "Missing break", detail: "No meal break punched", bg: "#FDF0D5", c: "#8A6D00" });
  }

  const statusMeta = STATUS_META[phase];
  const events: { type: "Clock in" | "Clock out"; time: number }[] = [{ type: "Clock in", time: clockIn }];
  if (phase === "done" && clockOut) events.push({ type: "Clock out", time: clockOut });

  function handleClockIn() {
    const t = Date.now();
    setClockIn(t);
    setClockOut(null);
    setPhase("in");
    fireToast(`Clocked in · ${fmtTime(t)} · Asia/Manila (GMT+8)`, "success");
  }

  function handleClockOut() {
    const t = Date.now();
    setClockOut(t);
    setPhase("done");
    fireToast("Clocked out · timesheet saved for review", "success");
  }

  return (
    <div className="mt-6 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 sm:px-[26px] sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-[var(--color-indigo-800)]" strokeWidth={1.75} />
          <div className="font-display text-xl font-semibold">My attendance</div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[13px] font-semibold"
          style={{ background: statusMeta.bg, color: statusMeta.c }}
        >
          <span className="h-[7px] w-[7px] rounded-full bg-current" />
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-[22px] flex flex-wrap items-stretch justify-between gap-6">
        <div className="grid min-w-0 flex-[999_1_340px] grid-cols-1 gap-4 min-[430px]:grid-cols-3 sm:gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
              Clocked in
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-[-0.02em]">
              {phase === "out" ? "—" : fmtTime(clockIn)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
              Session
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-[-0.02em]">
              {phase === "out" ? "—" : fmtDuration(grossMs)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
              Shift schedule
            </div>
            <div className="mt-[13px] whitespace-nowrap font-display text-base font-bold tracking-[-0.01em]">
              9:00 AM – 6:00 PM
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col items-start justify-center gap-2.5">
          {phase === "in" && (
            <button
              onClick={handleClockOut}
              className="h-11 self-start rounded-control bg-[var(--color-kahel-500)] px-[22px] font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
            >
              Clock out
            </button>
          )}
          {(phase === "out" || phase === "done") && (
            <button
              onClick={handleClockIn}
              className="h-11 self-start rounded-control bg-[var(--color-ink-800)] px-[22px] font-display text-sm font-semibold text-white hover:bg-black"
            >
              {phase === "done" ? "Clock in · new session" : "Clock in"}
            </button>
          )}
          <div className="text-center text-xs leading-[1.4] text-[var(--color-text-muted)]">
            Clock in and out personally. One open session at a time.
          </div>
        </div>
      </div>

      {phase === "done" && (
        <div className="mt-5 border-t border-[var(--color-border)] pt-[18px]">
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
                Clocked out
              </div>
              <div className="mt-[7px] font-display text-xl font-bold">{clockOut ? fmtTime(clockOut) : "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
                Total worked
              </div>
              <div className="mt-[7px] font-display text-xl font-bold">{fmtDuration(grossMs)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">
                Paid hours
              </div>
              <div className="mt-[7px] font-display text-xl font-bold">{paidH.toFixed(2)} h</div>
            </div>
          </div>

          {exceptions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              {exceptions.map((e) => (
                <div
                  key={e.label}
                  className="flex flex-wrap items-center gap-3 rounded-control px-3.5 py-2.5"
                  style={{ background: e.bg }}
                >
                  <span className="font-display text-[13px] font-semibold" style={{ color: e.c }}>
                    {e.label}
                  </span>
                  <span className="text-[13px] text-[var(--color-text-secondary)]">{e.detail}</span>
                  {e.badge && (
                    <span
                      className="ml-auto rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ color: e.c, borderColor: e.c }}
                    >
                      {e.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3.5 inline-flex items-center gap-2 rounded-control bg-[var(--color-success-bg)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-success-text)]">
              No exceptions · full 8:00 worked
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-card border border-[#FADBB0] bg-[var(--color-kahel-50)] px-4 py-3.5">
        <TriangleAlert className="h-4 w-4 shrink-0 text-[var(--color-kahel-700)]" strokeWidth={1.75} />
        <div className="min-w-[180px] flex-1">
          <div className="font-display text-sm font-semibold text-[var(--color-kahel-700)]">
            Incomplete record · 23 Jul 2026
          </div>
          <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
            Clocked in 9:02 AM · no clock-out punch. Payroll can&rsquo;t use this until it&rsquo;s corrected and
            approved by an admin.
          </div>
        </div>
        {!correctionSent ? (
          <button
            onClick={() => setCorrectionSent(true)}
            className="h-10 rounded-control border border-[#F5C9B0] bg-[var(--color-surface)] px-4 text-[13px] font-semibold text-[var(--color-kahel-700)]"
          >
            Submit correction request
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-[var(--color-warning-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-warning-text)]">
            Awaiting admin approval
          </span>
        )}
      </div>

      <div className="mt-[18px] border-t border-[var(--color-border)] pt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          Recorded events · Eusebio Barrun
        </div>
        {events.map((ev, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] py-2.5 text-[13px] last:border-b-0">
            <span
              className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
              style={
                ev.type === "Clock in"
                  ? { background: "var(--color-success-bg)", color: "var(--color-success-text)" }
                  : { background: "var(--color-indigo-100)", color: "var(--color-indigo-800)" }
              }
            >
              {ev.type}
            </span>
            <span className="font-display font-semibold">{fmtDateTime(ev.time)}</span>
            <span className="text-[var(--color-text-muted)]">
              Asia/Manila · GMT+8 · MacBook Pro / Chrome · Studio, Makati (optional)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
