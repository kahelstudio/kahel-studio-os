"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Book, HelpCircle, MessageSquare } from "lucide-react";
import { ACCENTS, APPS, type AppDef, type LauncherGroup } from "@/lib/apps-config";
import { cn } from "@/lib/utils";
import { useSystemStatus, statusDotClass } from "@/lib/use-system-status";

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

type LauncherSummary = { eventsToday: number; studioSessionsToday: number; salesMonthPhp: number };
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

function timeGreeting() {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Manila" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function loadOrder(key: string, fallback: string[]): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const stored: string[] = JSON.parse(raw);
    const known = new Set(fallback);
    const kept = stored.filter((id) => known.has(id));
    const missing = fallback.filter((id) => !kept.includes(id));
    for (const id of missing) {
      const defaultIndex = fallback.indexOf(id);
      const predecessor = fallback.slice(0, defaultIndex).reverse().find((candidate) => kept.includes(candidate));
      const insertAt = predecessor ? kept.indexOf(predecessor) + 1 : 0;
      kept.splice(insertAt, 0, id);
    }
    return kept;
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
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3.5">
          <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {meta.title}
          </span>
          <span className="text-[13px] leading-5 text-[var(--color-text-muted)]">{meta.description}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ordered.map((app, i) => {
          const accent = ACCENTS[app.accent];
          const Icon = app.icon;
          const tileNumber = group === "system" ? "SYS" : String(i + 1 + indexOffset).padStart(2, "0");
          const dragProps = {
            draggable: true,
            onDragStart: () => setDragId(app.id),
            onDragOver: (e: React.DragEvent) => e.preventDefault(),
            onDrop: () => handleDrop(app.id),
          };
          const tileClass = cn(
            "group flex flex-col gap-3.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition-all duration-150",
            "hover:-translate-y-0.5 hover:border-[var(--tile-accent)] hover:shadow-[0_8px_24px_-12px_rgba(20,20,20,0.18)]"
          );
          const tileStyle = { "--tile-accent": accent.base } as React.CSSProperties;

          if (app.id === "booking") {
            return (
              <div key={app.id} {...dragProps} className={cn("relative", tileClass)} style={tileStyle}>
                <Link href={app.href} className="absolute inset-0 rounded-card" aria-label="Booking" />
                <div className="relative flex items-center justify-between">
                  <Icon className="h-[26px] w-[26px] text-[var(--color-kahel-500)]" strokeWidth={1.75} />
                  <span className="text-xs tracking-[0.06em] text-[var(--color-text-muted)]">{tileNumber}</span>
                </div>
                <div className="relative">
                  <div className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{app.name}</div>
                  <div className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-secondary)]">{app.description}</div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={app.id}
              href={app.href}
              {...dragProps}
              className={tileClass}
              style={tileStyle}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-[26px] w-[26px] text-[var(--color-kahel-500)]" strokeWidth={1.75} />
                <span className="text-xs tracking-[0.06em] text-[var(--color-text-muted)]">{tileNumber}</span>
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
  const [greeting, setGreeting] = useState(timeGreeting);
  const [firstName, setFirstName] = useState("there");
  const [summary, setSummary] = useState<LauncherSummary>({ eventsToday: 0, studioSessionsToday: 0, salesMonthPhp: 0 });
  const systemStatus = useSystemStatus();

  useEffect(() => {
    const timer = window.setInterval(() => setGreeting(timeGreeting()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSummary = () => fetch("/api/dashboard/launcher-summary", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as LauncherSummary : null)
      .then((data) => { if (active && data) setSummary(data); })
      .catch(() => undefined);
    void loadSummary();
    const timer = window.setInterval(loadSummary, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = () => fetch("/api/staff/profile")
      .then(async (response) => response.ok ? await response.json() as { displayName: string } : null)
      .then((profile) => {
        const name = profile?.displayName.trim().split(/\s+/)[0];
        if (active && name) setFirstName(name);
      })
      .catch(() => undefined);
    void loadProfile();
    window.addEventListener("staff-profile-updated", loadProfile);
    return () => {
      active = false;
      window.removeEventListener("staff-profile-updated", loadProfile);
    };
  }, []);

  return (
    <div className="px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6 xl:px-12 xl:pb-14">
      <div>
        <div className="font-display text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--color-text-primary)]">
          {greeting}, {firstName}
        </div>
        <div className="mt-2 text-base leading-6 text-[var(--color-text-secondary)]">
          <span className="font-light">{summary.eventsToday} {summary.eventsToday === 1 ? "event" : "events"} and {summary.studioSessionsToday} studio {summary.studioSessionsToday === 1 ? "session" : "sessions"} today</span>{" "}
          <span aria-hidden>|</span>{" "}
          <span className="font-medium text-[#FF5300]">{peso.format(summary.salesMonthPhp)}</span>{" "}
          <span className="font-light">sales this month</span>
        </div>
      </div>

      <Section group="live" apps={live} indexOffset={0} />
      <Section group="operations" apps={operations} indexOffset={live.length} />
      <Section group="system" apps={system} indexOffset={0} />

      <div className="mt-10 flex flex-col items-start gap-4 border-t border-[var(--color-border)] pb-2 pt-[22px] sm:mt-14 xl:flex-row xl:items-center xl:gap-6">
        <span className="inline-flex items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
          Kahel Studio v0.1
          <span className="inline-block h-3.5 w-px bg-[var(--color-border-strong)]" />
          <a
            href={systemStatus?.statusPageUrl ?? "https://uptimerobot.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[var(--color-text-secondary)]"
          >
            <span className={cn("h-2 w-2 rounded-full", statusDotClass(systemStatus?.status ?? "unknown"))} />
            {systemStatus?.label ?? "System Status"}
          </a>
        </span>
        <div className="flex flex-wrap items-center gap-x-[22px] gap-y-3 xl:ml-auto">
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
