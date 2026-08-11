export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCalendarEvents, getCalendarEventsByDate, type CalendarEvent } from "@/lib/server/bookings-data";
import { CalendarGrid } from "./calendar-grid";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export type CalendarView = "month" | "week";
type CalendarCell = { key: string; day: number | null; today: boolean; past: boolean; inMonth: boolean; events: CalendarEvent[] };

export default async function BookingCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string | string[]; view?: string | string[] }> }) {
  const query = await searchParams;
  const todayIso = manilaToday();
  const selectedIso = typeof query.date === "string" && validDate(query.date) ? query.date : todayIso;
  const view: CalendarView = query.view === "week" ? "week" : "month";
  const selected = fromIso(selectedIso);
  const period = view === "month" ? await monthPeriod(selected, todayIso) : await weekPeriod(selected, todayIso);
  const previous = addPeriod(selected, view === "month" ? -1 : -7, view);
  const next = addPeriod(selected, view === "month" ? 1 : 7, view);

  return <div className="p-5 pt-6 sm:p-10 sm:pt-8">
    <div className="mb-5 flex flex-wrap items-center gap-3 sm:gap-4">
      <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[32px]">{period.label}</h1>
      <div className="flex gap-1">
        <Link href={calendarHref(previous, view)} aria-label={`Previous ${view}`} className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"><ChevronLeft className="h-4 w-4" /></Link>
        <Link href={calendarHref(next, view)} aria-label={`Next ${view}`} className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"><ChevronRight className="h-4 w-4" /></Link>
      </div>
      <div className="ml-auto flex gap-0.5 rounded-control bg-[var(--color-surface-muted)] p-[3px]">
        <Link href={calendarHref(toIso(selected), "month")} aria-current={view === "month" ? "page" : undefined} className={`flex h-[30px] items-center rounded-[6px] px-3.5 text-[13px] ${view === "month" ? "bg-[var(--color-surface)] font-semibold shadow-sm" : "font-medium text-[var(--color-text-secondary)]"}`}>Month</Link>
        <Link href={calendarHref(toIso(selected), "week")} aria-current={view === "week" ? "page" : undefined} className={`flex h-[30px] items-center rounded-[6px] px-3.5 text-[13px] ${view === "week" ? "bg-[var(--color-surface)] font-semibold shadow-sm" : "font-medium text-[var(--color-text-secondary)]"}`}>Week</Link>
      </div>
    </div>
    <div className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-canvas)]">{WEEKDAYS.map((day) => <div key={day} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">{day}</div>)}</div>
        <CalendarGrid cells={period.cells} view={view} />
      </div>
    </div>
  </div>;
}

async function monthPeriod(selected: Date, todayIso: string) {
  const year = selected.getUTCFullYear();
  const monthIndex = selected.getUTCMonth();
  const month = monthIndex + 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const events = await getCalendarEvents(month, year);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  return {
    label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(selected),
    cells: Array.from({ length: totalCells }, (_, index): CalendarCell => {
      const day = index - firstDay + 1;
      const inMonth = day >= 1 && day <= daysInMonth;
      const key = inMonth ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : `blank-${index}`;
      return { key, day: inMonth ? day : null, today: key === todayIso, past: inMonth && key < todayIso, inMonth, events: inMonth ? events[day] ?? [] : [] };
    }),
  };
}

async function weekPeriod(selected: Date, todayIso: string) {
  const start = new Date(selected);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const events = await getCalendarEventsByDate(toIso(start), toIso(end));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const label = sameMonth
    ? `${new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(start)} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`
    : `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(start)} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(end)}`;
  return { label, cells: Array.from({ length: 7 }, (_, index): CalendarCell => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); const key = toIso(date); return { key, day: date.getUTCDate(), today: key === todayIso, past: key < todayIso, inMonth: date.getUTCMonth() === selected.getUTCMonth(), events: events[key] ?? [] }; }) };
}

function calendarHref(date: string, view: CalendarView) { return `/booking/calendar?date=${date}&view=${view}`; }
function addPeriod(date: Date, amount: number, view: CalendarView) { const next = new Date(date); if (view === "month") next.setUTCMonth(next.getUTCMonth() + amount, 1); else next.setUTCDate(next.getUTCDate() + amount); return toIso(next); }
function validDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = fromIso(value); return !Number.isNaN(parsed.getTime()) && toIso(parsed) === value; }
function fromIso(value: string) { return new Date(`${value}T12:00:00Z`); }
function toIso(value: Date) { return value.toISOString().slice(0, 10); }
function manilaToday() { const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value])); return `${parts.year}-${parts.month}-${parts.day}`; }
