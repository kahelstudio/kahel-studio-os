import { CALENDAR_EVENTS, CALENDAR_TODAY, CALENDAR_WEEKDAYS } from "@/lib/sample-data";

const EVENT_TINT: Record<string, { bg: string; c: string }> = {
  ink: { bg: "#F1EFEC", c: "#242424" },
  orange: { bg: "#FFF4EE", c: "#B33800" },
  indigo: { bg: "#EDEAFD", c: "#2A1F87" },
  teal: { bg: "#E0F7F8", c: "#00575C" },
};

export default function BookingCalendarPage() {
  const days = Array.from({ length: 35 }, (_, i) => {
    const day = i - 2;
    const inMonth = day >= 1 && day <= 31;
    const today = day === CALENDAR_TODAY;
    return {
      day: inMonth ? day : null,
      today,
      inMonth,
      events: inMonth ? CALENDAR_EVENTS[day] ?? [] : [],
    };
  });

  return (
    <div className="p-10 pt-8">
      <div className="mb-5 flex items-center gap-4">
        <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-ink-800)]">
          July 2026
        </h1>
        <div className="flex gap-1">
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            ‹
          </button>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            ›
          </button>
        </div>
        <div className="ml-auto flex gap-0.5 rounded-control bg-[var(--color-ink-100)] p-[3px]">
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
          {CALENDAR_WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[112px]">
          {days.map((c, i) => (
            <div
              key={i}
              className="overflow-hidden border-b border-r border-[var(--color-ink-100)] p-2"
              style={{ background: c.today ? "#FFF9F5" : "var(--color-surface)" }}
            >
              <div
                className="flex items-center gap-1.5 text-[13px]"
                style={{
                  fontWeight: c.today ? 700 : 500,
                  color: !c.inMonth ? "var(--color-ink-300)" : c.today ? "var(--color-kahel-700)" : "var(--color-ink-600)",
                }}
              >
                {c.day ?? ""}
                {c.today && (
                  <span className="rounded-pill bg-[var(--color-kahel-100)] px-1.5 py-px text-[10px] font-semibold text-[var(--color-kahel-700)]">
                    Today
                  </span>
                )}
              </div>
              {c.events.map((ev, j) => {
                const tint = EVENT_TINT[ev.accent];
                return (
                  <div
                    key={j}
                    className="mt-1 truncate rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: tint.bg, color: tint.c }}
                  >
                    {ev.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
