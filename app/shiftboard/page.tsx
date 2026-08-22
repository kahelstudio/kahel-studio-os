"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { type ShiftEntry } from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import { OperationCreateButton } from "@/components/shared/operation-create-button";

function getCurrentWeekMeta(): [string, string, boolean][] {
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const today = new Date(`${todayIso}T12:00:00+08:00`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((name, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    return [name, new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric" }).format(d), iso === todayIso];
  });
}

function getMondayIso(): string {
  const manilaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const monday = new Date(`${manilaToday}T12:00:00+08:00`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(monday);
}

const STAFF_TINTS = ["#FF5300", "#00A15C", "#4F3DD9", "#00A5AD", "#8A6D00", "#B33800"] as const;

const LEGEND = [
  { label: "Studio Shoot", color: "#F2383A" },
  { label: "Event", color: "#8A4BE3" },
  { label: "Editing / Post", color: "#F6A21A" },
  { label: "Admin / Office", color: "#16A34A" },
  { label: "Production Support", color: "#0EA5A8" },
  { label: "Day Off", color: "#CECBC5" },
  { label: "Remote Work", color: "#3B82C4" },
] as const;

type ApiShiftRow = {
  id: string;
  dayOfWeek: number;
  initials: string;
  name: string;
  role: string;
  timeDescription: string | null;
  location: string;
  weekStart: string;
};

type ApiStaffRow = {
  id: string;
  displayName: string;
  initials: string;
  role: string;
};

function mapApiShift(s: ApiShiftRow): ShiftEntry {
  return {
    id: s.id,
    d: (s.dayOfWeek + 6) % 7,
    ini: s.initials,
    who: s.name,
    role: s.role,
    time: s.timeDescription ?? "—",
    loc: s.location as "studio" | "location",
  };
}

export default function ShiftboardPage() {
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [staff, setStaff] = useState<ApiStaffRow[] | null>(null);
  const [dayMeta] = useState<[string, string, boolean][]>(() => getCurrentWeekMeta());
  const [dragId, setDragId] = useState<string | null>(null);
  const [view, setView] = useState<"shift" | "production">("shift");

  useEffect(() => {
    const loadShifts = () => fetch(`/api/shifts?weekStart=${getMondayIso()}`)
      .then(async (res) => res.ok ? await res.json() : [])
      .then((data) => {
        const rows = data as ApiShiftRow[];
        setShifts(Array.isArray(rows) ? rows.map(mapApiShift) : []);
      })
      .catch(() => setShifts([]));
    const loadStaff = () => fetch("/api/staff")
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load staff.");
        return await res.json() as ApiStaffRow[];
      })
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]));
    const created = (event: Event) => { if ((event as CustomEvent<{ kind: string }>).detail.kind === "shift") void loadShifts(); };
    void loadShifts();
    void loadStaff();
    window.addEventListener("operation-created", created);
    return () => window.removeEventListener("operation-created", created);
  }, []);

  function moveToDay(dayIndex: number) {
    if (!dragId) return;
    const next = shifts.map((shift) => (shift.id === dragId ? { ...shift, d: dayIndex } : shift));
    setShifts(next);
    setDragId(null);
  }

  return (
    <div className="app-page min-w-0 p-7 lg:p-10">
      <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
            Shift Board
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Monitor staff schedules and production assignments.
          </p>
        </div>
        <OperationCreateButton kind="shift" className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New Shift
        </OperationCreateButton>
      </div>

      <div className="mt-9 flex border-b border-[var(--color-border)]">
        <Tab active={view === "shift"} onClick={() => setView("shift")}>Shift View</Tab>
        <Tab active={view === "production"} onClick={() => setView("production")}>Production View</Tab>
      </div>

      <div className="mt-5 overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="min-w-[1170px]">
          <div className="grid grid-cols-[260px_repeat(7,minmax(130px,1fr))] border-b border-[var(--color-border)] bg-[var(--color-canvas)]">
            <div className="flex items-center px-5 py-5 text-xs font-semibold uppercase tracking-[0.13em] text-[var(--color-text-muted)]">
              Staff member
            </div>
            {dayMeta.map(([day, date, isToday]) => (
              <div key={day} className="border-l border-[var(--color-border)] px-3 py-3 text-center">
                <div
                  className="text-xs font-semibold uppercase tracking-[0.1em]"
                  style={{ color: isToday ? "#FF5300" : "var(--color-text-secondary)" }}
                >
                  {day}
                </div>
                <div
                  className={cn(
                    "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-semibold",
                    isToday ? "bg-[#FF5300] text-white" : "text-[var(--color-text-primary)]"
                  )}
                >
                  {date}
                </div>
              </div>
            ))}
          </div>

          {staff === null ? (
            <div className="px-5 py-8 text-sm text-[var(--color-text-secondary)]">Loading staff...</div>
          ) : staff.length === 0 ? (
            <div className="px-5 py-8 text-sm text-[var(--color-text-secondary)]">No active staff accounts found.</div>
          ) : staff.map((person) => (
            <div key={person.id} className="grid grid-cols-[260px_repeat(7,minmax(130px,1fr))] border-b border-[var(--color-border)] last:border-b-0">
              <div className="flex items-center gap-3 px-5 py-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: staffTint(person.id) }}
                >
                  {person.initials}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-[15px] font-semibold text-[var(--color-text-primary)]">{person.displayName}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{person.role}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-success)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> Active
                  </div>
                </div>
              </div>

              {dayMeta.map(([day], dayIndex) => {
                const entries = shifts.filter((shift) => staffNamesMatch(shift.who, person.displayName) && shift.d === dayIndex);
                return (
                  <div
                    key={day}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveToDay(dayIndex)}
                    className="min-h-[116px] border-l border-[var(--color-border)] p-2.5"
                  >
                    {entries.map((shift) => (
                      <ShiftCard
                        key={shift.id}
                        shift={shift}
                        production={view === "production"}
                        onDragStart={() => setDragId(shift.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 px-1 text-sm text-[var(--color-text-secondary)]">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-1 pb-3.5 pr-7 text-[15px] font-semibold",
        active ? "text-[#FF5300]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      )}
    >
      {children}
      {active && <span className="absolute bottom-0 left-0 h-[3px] w-[72px] rounded-full bg-[#FF5300]" />}
    </button>
  );
}

function ShiftCard({
  shift,
  production,
  onDragStart,
}: {
  shift: ShiftEntry;
  production: boolean;
  onDragStart: () => void;
}) {
  const color = shiftColor(shift);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-control p-3 text-white shadow-sm active:cursor-grabbing"
      style={{ background: color }}
    >
      <div className="text-[13px] font-semibold leading-4">{shift.time}</div>
      <div className="mt-1 truncate text-xs font-medium">{production ? shift.role : shift.loc === "studio" ? "Studio" : "On location"}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-white/80">
        <MapPin className="h-3 w-3" strokeWidth={2} />
        {production ? (shift.loc === "studio" ? "Studio" : "On location") : shift.role}
      </div>
    </div>
  );
}

function shiftColor(shift: ShiftEntry) {
  const role = shift.role.toLowerCase();

  if (role.includes("day off")) return "#CECBC5";
  if (role.includes("edit") || role.includes("retouch")) return "#F6A21A";
  if (role.includes("open") || role.includes("duty")) return "#16A34A";
  if (role.includes("assist") || role.includes("coordinator")) return "#0EA5A8";
  if (shift.loc === "location") return "#8A4BE3";
  return "#F2383A";
}

function staffTint(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return STAFF_TINTS[Math.abs(hash) % STAFF_TINTS.length];
}

function staffNamesMatch(shiftName: string, displayName: string): boolean {
  const shift = shiftName.trim().toLocaleLowerCase();
  const display = displayName.trim().toLocaleLowerCase();
  return shift === display || shift === display.split(/\s+/)[0];
}
