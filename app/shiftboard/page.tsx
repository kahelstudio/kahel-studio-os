"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SHIFT_DAY_META, SHIFT_DEFAULT, shiftLocStyle, type ShiftEntry } from "@/lib/sample-data";

const STORAGE_KEY = "ks_shifts";

function loadShifts(): ShiftEntry[] {
  if (typeof window === "undefined") return SHIFT_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SHIFT_DEFAULT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : SHIFT_DEFAULT;
  } catch {
    return SHIFT_DEFAULT;
  }
}

export default function ShiftboardPage() {
  const [shifts, setShifts] = useState<ShiftEntry[]>(SHIFT_DEFAULT);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    // One-time sync from localStorage (an external system) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShifts(loadShifts());
  }, []);

  function persist(next: ShiftEntry[]) {
    setShifts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function moveToDay(dayIndex: number) {
    if (!dragId) return;
    persist(shifts.map((s) => (s.id === dragId ? { ...s, d: dayIndex } : s)));
    setDragId(null);
  }

  return (
    <div className="max-w-[1320px] p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Shiftboard
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Studio coverage and crew shifts for the week
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">21–26 JUL 2026</span>
          <button className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
            <Plus className="h-4 w-4" /> New shift
          </button>
        </div>
      </div>

      <div className="mt-[26px] grid grid-cols-6 items-start gap-3.5">
        {SHIFT_DAY_META.map(([day, date, isToday], dayIndex) => (
          <div
            key={day}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => moveToDay(dayIndex)}
            className="min-h-[200px] rounded-card border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"
          >
            <div
              className="mb-3 flex items-baseline gap-1.5 rounded-control px-2 py-1"
              style={{ background: isToday ? "var(--color-kahel-50)" : "transparent" }}
            >
              <span
                className="font-display text-sm font-semibold"
                style={{ color: isToday ? "var(--color-kahel-700)" : "var(--color-ink-800)" }}
              >
                {day}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{date}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {shifts
                .filter((s) => s.d === dayIndex)
                .map((s) => {
                  const loc = shiftLocStyle(s.loc);
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => setDragId(s.id)}
                      className="cursor-grab rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 hover:border-[var(--color-border-strong)]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-display text-[10px] font-semibold"
                          style={{ background: loc.bg, color: loc.c }}
                        >
                          {s.ini}
                        </span>
                        <span className="text-[13px] font-semibold">{s.who}</span>
                      </div>
                      <div className="mt-2 text-xs font-medium text-[var(--color-ink-700)]">{s.role}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{s.time}</div>
                      <span
                        className="mt-2 inline-block rounded-pill px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: loc.bg, color: loc.c }}
                      >
                        {loc.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
