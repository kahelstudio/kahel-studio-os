"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Book, HelpCircle, MessageSquare } from "lucide-react";
import { ACCENTS, APPS, type AppDef, type LauncherGroup } from "@/lib/apps-config";
import { cn } from "@/lib/utils";

const SECTION_META: Record<LauncherGroup, { title: string; description: string; storageKey: string }> = {
  live: {
    title: "Everyday",
    description: "The apps you reach for daily",
    storageKey: "ks_liveOrder",
  },
  operations: {
    title: "Operations",
    description: "Back office, delivery & growth",
    storageKey: "ks_p2Order",
  },
  system: {
    title: "System",
    description: "Manage platform tools, settings and activity",
    storageKey: "ks_sysOrder",
  },
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

function Section({ group, apps, indexOffset }: { group: LauncherGroup; apps: AppDef[]; indexOffset: number }) {
  const meta = SECTION_META[group];
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
    <section className="mt-11 first:mt-3">
      <div className="mb-[22px] flex items-baseline justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-baseline gap-3.5">
          <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {meta.title}
          </span>
          <span className="text-[13px] text-[var(--color-text-muted)]">{meta.description}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ordered.map((app, i) => {
          const accent = ACCENTS[app.accent];
          const Icon = app.icon;
          return (
            <Link
              key={app.id}
              href={app.href}
              draggable
              onDragStart={() => setDragId(app.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(app.id)}
              className={cn(
                "group flex flex-col gap-3.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition-all duration-150",
                "hover:-translate-y-0.5 hover:border-[var(--tile-accent)] hover:shadow-[0_8px_24px_-12px_rgba(20,20,20,0.18)]"
              )}
              style={{ "--tile-accent": accent.base } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-[26px] w-[26px] text-[var(--color-kahel-500)]" strokeWidth={1.75} />
                <span className="text-xs tracking-[0.06em] text-[var(--color-text-muted)]">
                  {group === "system" ? "SYS" : String(i + 1 + indexOffset).padStart(2, "0")}
                </span>
              </div>
              <div>
                <div className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  {app.name}
                </div>
                <div className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-secondary)]">
                  {app.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function LauncherGrid() {
  const live = APPS.filter((a) => a.launcherGroup === "live");
  const operations = APPS.filter((a) => a.launcherGroup === "operations");
  const system = APPS.filter((a) => a.launcherGroup === "system");

  return (
    <div className="px-12 pb-14 pt-6">
      <div>
        <div className="font-display text-[44px] font-semibold leading-[48px] tracking-[-0.025em] text-[var(--color-text-primary)]">
          Good morning, Eusebio
        </div>
        <div className="mt-2 text-base text-[var(--color-text-secondary)]">
          <span className="font-light">2 events and 3 studio sessions today</span>{" "}
          <span aria-hidden>|</span>{" "}
          <span className="font-medium text-[#FF5300]">₱71,000</span>{" "}
          <span className="font-light">sales this month</span>
        </div>
      </div>

      <Section group="live" apps={live} indexOffset={0} />
      <Section group="operations" apps={operations} indexOffset={live.length} />
      <Section group="system" apps={system} indexOffset={0} />

      <div className="mt-14 flex items-center gap-6 border-t border-[var(--color-border)] pb-2 pt-[22px]">
        <span className="inline-flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
          Kahel Studio v0.1
          <span className="inline-block h-3.5 w-px bg-[var(--color-border-strong)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
          System Status
        </span>
        <div className="ml-auto flex items-center gap-[22px]">
          <Link
            href="/docs"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-kahel-700)]"
          >
            <Book className="h-4 w-4" strokeWidth={1.75} /> Documentation
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-kahel-700)]"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.75} /> Help &amp; support
          </Link>
          <Link
            href="/feedback/report"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-kahel-700)]"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} /> Feedback
          </Link>
          <span className="text-[13px] text-[var(--color-text-muted)]">© 2026 Kahel Studio</span>
        </div>
      </div>
    </div>
  );
}
