"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent, EventCategory } from "@/lib/server/bookings-data";
import { rescheduleBooking } from "@/app/booking/list/[ref]/actions";
import type { CalendarView } from "./page";

type CalendarCell = { key: string; day: number | null; today: boolean; past: boolean; inMonth: boolean; events: CalendarEvent[]; holiday?: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CATEGORY_CONFIG: Record<EventCategory, { bg: string; label: string }> = {
  studio:  { bg: "#EF4444", label: "STUDIO" },
  event:   { bg: "#8B5CF6", label: "EVENT" },
  rental:  { bg: "#0EA5E9", label: "RENTAL" },
  holiday: { bg: "#16A34A", label: "HOLIDAY" },
  power:   { bg: "#2563EB", label: "POWER" },
  blocked: { bg: "#6B7280", label: "BLOCKED" },
  other:   { bg: "#F97316", label: "OTHER" },
};

const FILTERS: { id: "all" | EventCategory; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "studio",  label: "Studio" },
  { id: "event",   label: "Event" },
  { id: "rental",  label: "Rental" },
  { id: "holiday", label: "Holiday" },
  { id: "power",   label: "Power Interruption" },
  { id: "blocked", label: "Blocked" },
];

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function EventChip({ event, onDragStart }: { event: CalendarEvent; onDragStart: () => void }) {
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.other;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="mb-1 cursor-grab select-none rounded-lg px-2 py-1.5 active:cursor-grabbing"
      style={{ background: cfg.bg }}
    >
      <div className="text-[9px] font-bold tracking-[0.08em] text-white/80">{cfg.label}</div>
      <div className="text-[12px] font-bold leading-snug text-white">{formatTime(event.time)}</div>
      <div className="truncate text-[11px] leading-snug text-white/90">{event.title}</div>
    </div>
  );
}

function EventChipExpanded({ event, onDragStart }: { event: CalendarEvent; onDragStart: () => void }) {
  const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.other;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="mb-1.5 cursor-grab select-none rounded-lg px-2.5 py-2 active:cursor-grabbing"
      style={{ background: cfg.bg }}
    >
      <div className="text-[9px] font-bold tracking-[0.08em] text-white/80">{cfg.label}</div>
      <div className="text-[13px] font-bold leading-snug text-white">{formatTime(event.time)}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-white/90">{event.title}</div>
      <div className="mt-0.5 text-[11px] text-white/70">{event.serviceType}</div>
    </div>
  );
}

function estimateTimeFromY(element: HTMLElement, clientY: number): string {
  const rect = element.getBoundingClientRect();
  const headerHeight = 48;
  const bodyHeight = rect.height - headerHeight - 12;
  const yInBody = clientY - rect.top - headerHeight;
  const ratio = Math.max(0, Math.min(1, yInBody / bodyHeight));
  const startHour = 7, endHour = 20;
  const totalHalfHours = (endHour - startHour) * 2;
  const slot = Math.round(ratio * totalHalfHours);
  const hours = startHour + Math.floor(slot / 2);
  const minutes = (slot % 2) * 30;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function CalendarGrid({
  cells,
  view,
  label,
  prevHref,
  nextHref,
  selectedIso,
}: {
  cells: CalendarCell[];
  view: CalendarView;
  label: string;
  prevHref: string;
  nextHref: string;
  selectedIso: string;
}) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<"all" | EventCategory>("all");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const dragRef = useRef<{ ref: string; sourceDate: string; sourceTime: string } | null>(null);
  const expanded = view === "week";

  const filteredCells = activeFilter === "all"
    ? cells
    : cells.map(cell => ({ ...cell, events: cell.events.filter(e => e.category === activeFilter) }));

  function handleDragOver(e: React.DragEvent, cellKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragRef.current && cellKey !== dragRef.current.sourceDate) setDropTarget(cellKey);
  }

  function handleDragLeave() { setDropTarget(null); }

  async function handleDrop(e: React.DragEvent, cellKey: string) {
    e.preventDefault();
    setDropTarget(null);
    if (!dragRef.current || cellKey === dragRef.current.sourceDate || cellKey.startsWith("blank-")) return;
    const time = expanded ? estimateTimeFromY(e.currentTarget as HTMLElement, e.clientY) : dragRef.current.sourceTime;
    const { ref } = dragRef.current;
    dragRef.current = null;
    setStatus("saving");
    try {
      await rescheduleBooking(ref, cellKey, time);
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      {/* Toolbar: filters left, nav + view + CTA right */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="relative pb-1 text-[14px] font-semibold transition-colors"
              style={{ color: activeFilter === f.id ? "var(--color-kahel-500)" : "var(--color-text-secondary)" }}
            >
              {f.label}
              {activeFilter === f.id && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-[var(--color-kahel-500)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Link href={prevHref} aria-label="Previous" className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-[130px] text-center text-[15px] font-semibold text-[var(--color-text-primary)]">{label}</span>
            <Link href={nextHref} aria-label="Next" className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex gap-0.5 rounded-control bg-[var(--color-surface-muted)] p-[3px]">
            <Link href={`/calendar?date=${selectedIso}&view=month`} aria-current={view === "month" ? "page" : undefined} className={`flex h-[30px] items-center rounded-[6px] px-3.5 text-[13px] ${view === "month" ? "bg-[var(--color-surface)] font-semibold shadow-sm" : "font-medium text-[var(--color-text-secondary)]"}`}>Month</Link>
            <Link href={`/calendar?date=${selectedIso}&view=week`} aria-current={view === "week" ? "page" : undefined} className={`flex h-[30px] items-center rounded-[6px] px-3.5 text-[13px] ${view === "week" ? "bg-[var(--color-surface)] font-semibold shadow-sm" : "font-medium text-[var(--color-text-secondary)]"}`}>Week</Link>
          </div>
          <Link href="/booking/list" className="flex h-[34px] items-center rounded-control bg-[var(--color-kahel-500)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--color-kahel-600)]">
            + New Booking
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-canvas)]">
            {WEEKDAYS.map(day => (
              <div key={day} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">{day}</div>
            ))}
          </div>
          <div className={`grid grid-cols-7 ${expanded ? "auto-rows-[minmax(360px,calc(100dvh-280px))]" : "auto-rows-[minmax(140px,auto)]"}`}>
            {filteredCells.map(cell => {
              const bg = cell.holiday ? "#f0fdf4" : cell.today ? "var(--color-kahel-50)" : cell.past ? "var(--color-canvas)" : "var(--color-surface)";
              const dayColor = !cell.inMonth ? "var(--color-text-muted)" : cell.today ? "var(--color-kahel-700)" : "var(--color-text-primary)";
              const isDropTarget = dropTarget === cell.key;
              const visible = expanded ? cell.events : cell.events.slice(0, 3);

              return (
                <div
                  key={cell.key}
                  className={`overflow-hidden border-b border-r border-[var(--color-border)] p-2 transition-colors ${isDropTarget ? "ring-2 ring-inset ring-[var(--color-kahel-400)]" : ""}`}
                  style={{ background: bg }}
                  onDragOver={e => handleDragOver(e, cell.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, cell.key)}
                >
                  <div
                    className="mb-1.5 flex items-start justify-between gap-1"
                    style={{ opacity: !cell.inMonth ? 0.35 : 1 }}
                  >
                    {cell.holiday
                      ? <span className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: "#16A34A" }}>{cell.holiday}</span>
                      : <span />}
                    <div className="flex items-center gap-1.5">
                      {cell.today && <span className="rounded-full bg-[var(--color-kahel-100)] px-1.5 py-px text-[10px] font-semibold text-[var(--color-kahel-700)]">Today</span>}
                      <span className="text-[13px]" style={{ fontWeight: cell.today ? 700 : 400, color: dayColor }}>{cell.day ?? ""}</span>
                    </div>
                  </div>
                  <div className={cell.past && !cell.today ? "opacity-60" : ""}>
                    {visible.map(event => expanded
                      ? <EventChipExpanded key={`${event.ref}-${event.time}`} event={event} onDragStart={() => { dragRef.current = { ref: event.ref, sourceDate: cell.key, sourceTime: event.time }; }} />
                      : <EventChip key={`${event.ref}-${event.time}`} event={event} onDragStart={() => { dragRef.current = { ref: event.ref, sourceDate: cell.key, sourceTime: event.time }; }} />
                    )}
                    {!expanded && cell.events.length > 3 && (
                      <div className="text-[11px] font-medium text-[var(--color-text-muted)]">+{cell.events.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        {([
          { label: "Studio",             color: "#EF4444" },
          { label: "Event",              color: "#8B5CF6" },
          { label: "Rental",             color: "#0EA5E9" },
          { label: "Holiday",            color: "#16A34A" },
          { label: "Power Interruption", color: "#2563EB" },
          { label: "Blocked",            color: "#6B7280" },
          { label: "Other",              color: "#F97316" },
        ] as const).map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">{item.label}</span>
          </div>
        ))}
      </div>

      {status === "saving" && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-control bg-[var(--color-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] shadow-md">Rescheduling…</div>}
      {status === "error" && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-control bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-md">Could not reschedule. Please try again.</div>}
    </div>
  );
}
