"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { ACCENTS, APPS, type AppDef, type AppPhase } from "@/lib/apps-config";
import { cn } from "@/lib/utils";

const SECTION_META: Record<AppPhase, { title: string; storageKey: string }> = {
  live: { title: "Live", storageKey: "ks_liveOrder" },
  phase2: { title: "Phase 2 / coming soon", storageKey: "ks_p2Order" },
  system: { title: "System", storageKey: "ks_sysOrder" },
};

function loadOrder(key: string, fallback: string[]): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const stored: string[] = JSON.parse(raw);
    const known = new Set(fallback);
    const kept = stored.filter((id) => known.has(id));
    const missing = fallback.filter((id) => !kept.includes(id));
    return [...kept, ...missing];
  } catch {
    return fallback;
  }
}

function Section({ phase, apps }: { phase: AppPhase; apps: AppDef[] }) {
  const meta = SECTION_META[phase];
  const defaultOrder = useMemo(() => apps.map((a) => a.id), [apps]);
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    // One-time sync from localStorage (an external system) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(loadOrder(meta.storageKey, defaultOrder));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.storageKey]);

  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as AppDef[];

  function persist(next: string[]) {
    setOrder(next);
    localStorage.setItem(meta.storageKey, JSON.stringify(next));
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    persist(next);
    setDragId(null);
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
        {meta.title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ordered.map((app) => {
          const accent = ACCENTS[app.accent];
          const Icon = app.icon;
          const locked = app.phase !== "live";
          return (
            <div
              key={app.id}
              draggable
              onDragStart={() => setDragId(app.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(app.id)}
              className={cn(
                "group relative rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-[var(--shadow-menu)]",
                locked && "opacity-70"
              )}
            >
              <Link href={app.href} className="block">
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-control"
                    style={{ background: accent.tint, color: accent.text }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  {app.phaseLabel && (
                    <span className="rounded-pill bg-[var(--color-ink-100)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-500)]">
                      {app.phaseLabel}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {app.name}
                </h3>
                <p className="mt-1 text-[13px] leading-snug text-[var(--color-text-secondary)]">
                  {app.description}
                </p>
              </Link>
              <GripVertical className="absolute right-3 top-3 h-4 w-4 cursor-grab text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function LauncherGrid() {
  const live = APPS.filter((a) => a.phase === "live");
  const phase2 = APPS.filter((a) => a.phase === "phase2");
  const system = APPS.filter((a) => a.phase === "system");

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10">
      <Section phase="live" apps={live} />
      <Section phase="phase2" apps={phase2} />
      <Section phase="system" apps={system} />
    </div>
  );
}
