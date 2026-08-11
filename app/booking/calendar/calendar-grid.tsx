"use client";

import { useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/server/bookings-data";
import { rescheduleBooking } from "@/app/booking/list/[ref]/actions";

type CalendarCell = { key: string; day: number | null; today: boolean; past: boolean; inMonth: boolean; events: CalendarEvent[] };
type CalendarView = "month" | "week";

const EVENT_TINT: Record<CalendarEvent["accent"], { bg: string; c: string }> = {
  ink: { bg: "var(--color-surface-muted)", c: "var(--color-text-primary)" },
  orange: { bg: "var(--color-kahel-50)", c: "var(--color-kahel-700)" },
  indigo: { bg: "var(--color-indigo-100)", c: "var(--color-indigo-800)" },
  teal: { bg: "var(--color-teal-100)", c: "var(--color-teal-800)" },
};

function estimateTimeFromY(element: HTMLElement, clientY: number): string {
  const rect = element.getBoundingClientRect();
  const headerHeight = 48;
  const bodyHeight = rect.height - headerHeight - 12;
  const yInBody = clientY - rect.top - headerHeight;
  const ratio = Math.max(0, Math.min(1, yInBody / bodyHeight));
  const startHour = 7;
  const endHour = 20;
  const totalHalfHours = (endHour - startHour) * 2;
  const slot = Math.round(ratio * totalHalfHours);
  const hours = startHour + Math.floor(slot / 2);
  const minutes = (slot % 2) * 30;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function BookingChip({ event, onDragStart }: { event: CalendarEvent; onDragStart: () => void }) {
  const tint = EVENT_TINT[event.accent];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="mb-0.5 cursor-grab rounded-[4px] px-1.5 py-px text-[11px] font-medium active:cursor-grabbing truncate"
      style={{ background: tint.bg, color: tint.c }}
      title={`${event.title} at ${event.time}`}
    >
      {event.time} {event.title}
    </div>
  );
}

function BookingChipExpanded({ event, onDragStart }: { event: CalendarEvent; onDragStart: () => void }) {
  const tint = EVENT_TINT[event.accent];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-[4px] px-1.5 py-1.5 text-[11px] font-medium active:cursor-grabbing whitespace-normal"
      style={{ background: tint.bg, color: tint.c }}
      title={`${event.title} at ${event.time}`}
    >
      {event.time} {event.title}
    </div>
  );
}

export function CalendarGrid({ cells, view }: { cells: CalendarCell[]; view: CalendarView }) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const dragRef = useRef<{ ref: string; sourceDate: string; sourceTime: string } | null>(null);

  function handleDragStart(event: React.DragEvent, calEvent: CalendarEvent, sourceDate: string) {
    dragRef.current = { ref: calEvent.ref, sourceDate, sourceTime: calEvent.time };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", calEvent.ref);
  }

  function handleDragOver(event: React.DragEvent, cellKey: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragRef.current && cellKey !== dragRef.current.sourceDate) {
      setDropTarget(cellKey);
    }
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  async function handleDrop(event: React.DragEvent, cellKey: string) {
    event.preventDefault();
    setDropTarget(null);
    if (!dragRef.current || cellKey === dragRef.current.sourceDate) return;
    if (cellKey.startsWith("blank-")) return;

    const time = view === "week" ? estimateTimeFromY(event.currentTarget as HTMLElement, event.clientY) : dragRef.current.sourceTime;
    const { ref } = dragRef.current;
    dragRef.current = null;
    setStatus("saving");
    try {
      await rescheduleBooking(ref, cellKey, time);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const expanded = view === "week";

  return (
    <div className={`grid grid-cols-7 ${expanded ? "auto-rows-[minmax(360px,calc(100dvh-245px))]" : "auto-rows-[112px]"}`}>
      {cells.map((cell) => {
        const visible = expanded ? cell.events : cell.events.slice(0, 3);
        const bg = cell.today ? "var(--color-kahel-50)" : cell.past ? "var(--color-canvas)" : "var(--color-surface)";
        const dayColor = !cell.inMonth ? "var(--color-text-muted)" : cell.today ? "var(--color-kahel-700)" : cell.past ? "var(--color-text-muted)" : "var(--color-text-secondary)";
        const isDropTarget = dropTarget === cell.key;
        return (
          <div
            key={cell.key}
            className={`overflow-hidden border-b border-r border-[var(--color-border)] p-2 transition-colors ${isDropTarget ? "ring-2 ring-inset ring-[var(--color-kahel-400)]" : ""}`}
            style={{ background: bg }}
            onDragOver={(event) => handleDragOver(event, cell.key)}
            onDragLeave={handleDragLeave}
            onDrop={(event) => handleDrop(event, cell.key)}
          >
            <div className="flex items-center gap-1.5 text-[13px]" style={{ fontWeight: cell.today ? 700 : 500, color: dayColor, opacity: cell.past && !cell.today ? 0.6 : 1 }}>
              {cell.day ?? ""}
              {cell.today && <span className="rounded-pill bg-[var(--color-kahel-100)] px-1.5 py-px text-[10px] font-semibold text-[var(--color-kahel-700)]">Today</span>}
            </div>
            <div className={`${expanded ? "mt-2 space-y-1" : ""} ${cell.past ? "opacity-50" : ""}`}>
              {visible.map((event) => expanded
                ? <BookingChipExpanded key={`${event.ref}-${event.time}`} event={event} onDragStart={() => dragRef.current = { ref: event.ref, sourceDate: cell.key, sourceTime: event.time }} />
                : <BookingChip key={`${event.ref}-${event.time}`} event={event} onDragStart={() => dragRef.current = { ref: event.ref, sourceDate: cell.key, sourceTime: event.time }} />
              )}
            </div>
            {!expanded && cell.events.length > 3 && <div className={`text-[11px] font-medium text-[var(--color-text-muted)] ${cell.past ? "opacity-50" : ""}`}>+{cell.events.length - 3} more</div>}
          </div>
        );
      })}
      {status === "saving" && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-control bg-[var(--color-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] shadow-md">Rescheduling...</div>}
      {status === "error" && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-control bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-md">Could not reschedule booking. Please try again.</div>}
    </div>
  );
}
