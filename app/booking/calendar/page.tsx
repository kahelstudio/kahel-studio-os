import { getCalendarEvents, type CalendarEvent } from "@/lib/server/bookings-data";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_TINT: Record<CalendarEvent["accent"], { bg: string; c: string }> = {
  ink: { bg: "var(--color-surface-muted)", c: "var(--color-text-primary)" },
  orange: { bg: "var(--color-kahel-50)", c: "var(--color-kahel-700)" },
  indigo: { bg: "var(--color-indigo-100)", c: "var(--color-indigo-800)" },
  teal: { bg: "var(--color-teal-100)", c: "var(--color-teal-800)" },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function BookingCalendarPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const today = now.getDate();

  const events = await getCalendarEvents(month, year);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const days = Array.from({ length: 35 }, (_, i) => {
    const day = i - firstDay + 1;
    const inMonth = day >= 1 && day <= daysInMonth;
    return {
      day: inMonth ? day : null,
      today: inMonth && day === today,
      inMonth,
      events: inMonth ? (events[day] ?? []) : [],
    };
  });

  return (
    <div className="p-10 pt-8">
      <div className="mb-5 flex items-center gap-4">
        <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          {MONTHS[month - 1]} {year}
        </h1>
        <div className="flex gap-1">
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            ‹
          </button>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            ›
          </button>
        </div>
        <div className="ml-auto flex gap-0.5 rounded-control bg-[var(--color-surface-muted)] p-[3px]">
          <button className="h-[30px] rounded-[6px] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold shadow-sm">
            Month
          </button>
          <button className="h-[30px] rounded-[6px] px-3.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
            Week
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-canvas)]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[112px]">
          {days.map((c, i) => (
            <div
              key={i}
              className="overflow-hidden border-b border-r border-[var(--color-border)] p-2"
              style={{ background: c.today ? "var(--color-kahel-50)" : "var(--color-surface)" }}
            >
              <div
                className="flex items-center gap-1.5 text-[13px]"
                style={{
                  fontWeight: c.today ? 700 : 500,
                  color: !c.inMonth ? "var(--color-text-muted)" : c.today ? "var(--color-kahel-700)" : "var(--color-text-secondary)",
                }}
              >
                {c.day ?? ""}
                {c.today && (
                  <span className="rounded-pill bg-[var(--color-kahel-100)] px-1.5 py-px text-[10px] font-semibold text-[var(--color-kahel-700)]">
                    Today
                  </span>
                )}
              </div>
              {c.events.slice(0, 3).map((ev, j) => {
                const tint = EVENT_TINT[ev.accent];
                return (
                  <div
                    key={j}
                    className="mb-0.5 truncate rounded-[4px] px-1.5 py-px text-[11px] font-medium"
                    style={{ background: tint.bg, color: tint.c }}
                    title={`${ev.title} at ${ev.time}`}
                  >
                    {ev.time} {ev.title.length > 24 ? `${ev.title.slice(0, 24)}\u2026` : ev.title}
                  </div>
                );
              })}
              {(c.events.length > 3) && (
                <div className="text-[11px] font-medium text-[var(--color-text-muted)]">+{c.events.length - 3} more</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}