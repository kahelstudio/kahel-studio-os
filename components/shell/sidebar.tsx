"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AppDef } from "@/lib/apps-config";
import { cn } from "@/lib/utils";
import { useSystemStatus, statusDotClass } from "@/lib/use-system-status";

export function Sidebar({ app, onNavigate, empty = false, counts = {} }: { app: AppDef; onNavigate?: () => void; empty?: boolean; counts?: Record<string, number> }) {
  const pathname = usePathname();
  const systemStatus = useSystemStatus();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem(`ks_sidebar_expanded_${app.id}`);
    return saved ? JSON.parse(saved) : {};
  });

  function matchesHref(href: string) {
    const [hrefPath, hrefQuery] = href.split("?");
    if (hrefQuery) return pathname === hrefPath && searchParams.toString() === new URLSearchParams(hrefQuery).toString();
    return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
  }

  function toggleExpanded(id: string, open: boolean) {
    setExpanded((current) => {
      const next = { ...current, [id]: !open };
      window.localStorage.setItem(`ks_sidebar_expanded_${app.id}`, JSON.stringify(next));
      return next;
    });
  }

  if (empty) {
    return <aside className="h-full w-60 shrink-0 bg-[var(--color-surface)]" />;
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-0.5 bg-[var(--color-surface)] px-3 pb-3 pt-[34px]">
      {app.nav.map((item) => {
        const active = matchesHref(item.href) || item.items?.some((sub) => matchesHref(sub.href));
        const open = expanded[item.id] ?? active;
        const isSection = item.items && item.items.length > 0;

        if (isSection) {
          return (
            <div key={item.id}>
              <button
                onClick={() => toggleExpanded(item.id, open)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-control px-3 text-sm transition-colors",
                  active
                    ? "bg-[var(--color-kahel-100)] font-semibold text-[#FF5300]"
                    : "font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                )}
              >
                {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                {(counts[item.id] ?? 0) > 0 && <span className="rounded-pill bg-[var(--color-kahel-500)] px-2 py-0.5 text-[11px] font-semibold text-white" aria-label={`${counts[item.id]} pending`}>{counts[item.id]}</span>}
              </button>
              {open && (
                <div className="ml-1 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--color-border)] pl-2">
                  {item.items!.map((sub) => {
                    const subActive = matchesHref(sub.href);
                    return (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex h-8 items-center gap-2 rounded-control px-3 text-sm transition-colors",
                          subActive
                            ? "bg-[var(--color-kahel-100)] font-semibold text-[#FF5300]"
                            : "font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" strokeWidth={1.75} />
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-11 items-center gap-3 rounded-control px-3 text-sm transition-colors",
              active
                ? "bg-[var(--color-kahel-100)] font-semibold text-[#FF5300]"
                : "font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            )}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {(counts[item.id] ?? 0) > 0 && <span className="rounded-pill bg-[var(--color-kahel-500)] px-2 py-0.5 text-[11px] font-semibold text-white" aria-label={`${counts[item.id]} pending`}>{counts[item.id]}</span>}
          </Link>
        );
      })}

      <div className="mt-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap border-t border-[var(--color-border)] px-3 pt-3 text-xs text-[var(--color-text-muted)]">
        {process.env.NEXT_PUBLIC_APP_ENV !== "production"
          ? <span>Kahel Studio v0.1 build {process.env.NEXT_PUBLIC_BUILD_ID}</span>
          : (
            <>
              <span>Kahel Studio v0.1</span>
              <span aria-hidden="true">|</span>
              <a
                href={systemStatus?.statusPageUrl ?? "https://uptimerobot.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[var(--color-text-secondary)]"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDotClass(systemStatus?.status ?? "unknown"))} />
                {systemStatus?.status === "operational" ? "Online" : "Offline"}
              </a>
            </>
          )
        }
      </div>
    </aside>
  );
}
