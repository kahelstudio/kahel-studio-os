"use client";

import { useEffect, useState } from "react";

type Shift = { id: string; dayOfWeek: number; name: string; role: string; timeDescription: string | null; location: string; weekStart: string };

function monday(offsetWeeks: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${today}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + offsetWeeks * 7);
  return date;
}

export function FutureShifts({ mode }: { mode: "week" | "month" }) {
  const starts = mode === "week" ? [monday(1)] : [monday(4), monday(5), monday(6), monday(7)];
  const keys = starts.map((date) => date.toISOString().slice(0, 10));
  const keySignature = keys.join(",");
  const [shifts, setShifts] = useState<Shift[]>([]);
  useEffect(() => {
    const requestedKeys = keySignature.split(",");
    const load = () => Promise.all(requestedKeys.map((key) => fetch(`/api/shifts?weekStart=${key}`).then(async (response) => response.ok ? await response.json() as Shift[] : []))).then((rows) => setShifts(rows.flat())).catch(() => setShifts([]));
    const created = (event: Event) => { if ((event as CustomEvent<{ kind: string }>).detail.kind === "shift") void load(); };
    void load(); window.addEventListener("operation-created", created); return () => window.removeEventListener("operation-created", created);
  }, [keySignature]);

  if (mode === "month") return <div className="mt-[22px] grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">{starts.map((start, index) => { const rows = shifts.filter((shift) => shift.weekStart === keys[index]); return <section key={keys[index]} className="min-h-[200px] rounded-card border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"><div className="mb-3 px-2 py-1"><div className="font-display text-sm font-semibold">Week of {start.toLocaleDateString("en-PH", { day: "2-digit", month: "short", timeZone: "Asia/Manila" })}</div><div className="mt-0.5 text-xs text-[var(--color-text-muted)]">Mon-Sun</div></div>{rows.length ? <ShiftRows rows={rows} /> : <p className="px-2 py-6 text-center text-xs text-[var(--color-text-muted)]">No shifts yet</p>}</section>; })}</div>;

  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(starts[0]); date.setUTCDate(date.getUTCDate() + index); return date; });
  return <div className="mt-[22px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{days.map((day) => { const dayOfWeek = day.getUTCDay(); const rows = shifts.filter((shift) => shift.dayOfWeek === dayOfWeek); return <section key={day.toISOString()} className="min-h-[200px] rounded-card border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"><div className="mb-3 flex items-baseline gap-1.5 px-2 py-1"><span className="font-display text-sm font-semibold">{day.toLocaleDateString("en-PH", { weekday: "short", timeZone: "Asia/Manila" })}</span><span className="text-xs text-[var(--color-text-muted)]">{day.toLocaleDateString("en-PH", { day: "numeric", timeZone: "Asia/Manila" })}</span></div>{rows.length ? <ShiftRows rows={rows} /> : <p className="px-2 py-6 text-center text-xs text-[var(--color-text-muted)]">No shifts yet</p>}</section>; })}</div>;
}

function ShiftRows({ rows }: { rows: Shift[] }) {
  return <div className="space-y-2">{rows.map((shift) => <article key={shift.id} className="rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] p-2"><div className="text-xs font-semibold">{shift.name}</div><div className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{shift.role}</div><div className="mt-1 text-[10px] text-[var(--color-text-muted)]">{shift.timeDescription ?? "Time not set"} · {shift.location}</div></article>)}</div>;
}
