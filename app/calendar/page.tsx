export const dynamic = "force-dynamic";

import { getCalendarEvents, getCalendarEventsByDate, type CalendarEvent } from "@/lib/server/bookings-data";
import { CalendarGrid } from "./calendar-grid";

export type CalendarView = "month" | "week";
type CalendarCell = { key: string; day: number | null; today: boolean; past: boolean; inMonth: boolean; events: CalendarEvent[]; holiday?: string };

// Gregorian algorithm for Easter Sunday (works for any year)
function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function shiftDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// National Heroes Day = last Monday of August
function lastMondayOfAugust(year: number): string {
  const d = new Date(Date.UTC(year, 7, 31));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function philippineHolidays(year: number): Record<string, string> {
  const y = String(year);
  const easter = easterSunday(year);
  return {
    [`${y}-01-01`]: "New Year's Day",
    [shiftDays(easter, -3)]: "Maundy Thursday",
    [shiftDays(easter, -2)]: "Good Friday",
    [shiftDays(easter, -1)]: "Black Saturday",
    [`${y}-04-09`]: "Day of Valor",
    [`${y}-05-01`]: "Labor Day",
    [`${y}-06-12`]: "Independence Day",
    [`${y}-08-21`]: "Ninoy Aquino Day",
    [lastMondayOfAugust(year)]: "National Heroes Day",
    [`${y}-11-01`]: "All Saints' Day",
    [`${y}-11-02`]: "All Souls' Day",
    [`${y}-11-30`]: "Bonifacio Day",
    [`${y}-12-08`]: "Immaculate Conception",
    [`${y}-12-24`]: "Christmas Eve",
    [`${y}-12-25`]: "Christmas Day",
    [`${y}-12-30`]: "Rizal Day",
    [`${y}-12-31`]: "New Year's Eve",
  };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string | string[]; view?: string | string[] }> }) {
  const query = await searchParams;
  const todayIso = manilaToday();
  const selectedIso = typeof query.date === "string" && validDate(query.date) ? query.date : todayIso;
  const view: CalendarView = query.view === "week" ? "week" : "month";
  const selected = fromIso(selectedIso);
  const period = view === "month" ? await monthPeriod(selected, todayIso) : await weekPeriod(selected, todayIso);
  const previous = addPeriod(selected, view === "month" ? -1 : -7, view);
  const next = addPeriod(selected, view === "month" ? 1 : 7, view);

  return (
    <div className="app-page p-5 pt-6 sm:p-10 sm:pt-8">
      <div className="mb-8">
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">Calendar</h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">View schedules, shoots, deadlines, and team availability.</p>
      </div>
      <CalendarGrid
        cells={period.cells}
        view={view}
        label={period.label}
        prevHref={calendarHref(previous, view)}
        nextHref={calendarHref(next, view)}
        selectedIso={selectedIso}
      />
    </div>
  );
}

async function monthPeriod(selected: Date, todayIso: string) {
  const year = selected.getUTCFullYear();
  const monthIndex = selected.getUTCMonth();
  const month = monthIndex + 1;
  const dow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const firstDay = (dow + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const events = await getCalendarEvents(month, year);
  const holidays = philippineHolidays(year);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  return {
    label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(selected),
    cells: Array.from({ length: totalCells }, (_, index): CalendarCell => {
      const day = index - firstDay + 1;
      const inMonth = day >= 1 && day <= daysInMonth;
      const key = inMonth ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : `blank-${index}`;
      return { key, day: inMonth ? day : null, today: key === todayIso, past: inMonth && key < todayIso, inMonth, events: inMonth ? events[day] ?? [] : [], holiday: holidays[key] };
    }),
  };
}

async function weekPeriod(selected: Date, todayIso: string) {
  // Start week on Monday
  const dow = selected.getUTCDay();
  const start = new Date(selected);
  start.setUTCDate(selected.getUTCDate() - (dow + 6) % 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const events = await getCalendarEventsByDate(toIso(start), toIso(end));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const label = sameMonth
    ? `${new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(start)} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`
    : `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(start)} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(end)}`;
  const holidays = { ...philippineHolidays(start.getUTCFullYear()), ...philippineHolidays(end.getUTCFullYear()) };
  return {
    label,
    cells: Array.from({ length: 7 }, (_, index): CalendarCell => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = toIso(date);
      return { key, day: date.getUTCDate(), today: key === todayIso, past: key < todayIso, inMonth: date.getUTCMonth() === selected.getUTCMonth(), events: events[key] ?? [], holiday: holidays[key] };
    }),
  };
}

function calendarHref(date: string, view: CalendarView) { return `/calendar?date=${date}&view=${view}`; }
function addPeriod(date: Date, amount: number, view: CalendarView) { const next = new Date(date); if (view === "month") next.setUTCMonth(next.getUTCMonth() + amount, 1); else next.setUTCDate(next.getUTCDate() + amount); return toIso(next); }
function validDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = fromIso(value); return !Number.isNaN(parsed.getTime()) && toIso(parsed) === value; }
function fromIso(value: string) { return new Date(`${value}T12:00:00Z`); }
function toIso(value: Date) { return value.toISOString().slice(0, 10); }
function manilaToday() { const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value])); return `${parts.year}-${parts.month}-${parts.day}`; }
