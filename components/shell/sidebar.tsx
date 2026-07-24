"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCENTS, type AppDef } from "@/lib/apps-config";
import { cn } from "@/lib/utils";

export function Sidebar({ app, onNavigate }: { app: AppDef; onNavigate?: () => void }) {
  const pathname = usePathname();
  const accent = ACCENTS[app.accent];
  const Icon = app.icon;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-control"
          style={{ background: accent.tint, color: accent.text }}
        >
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </div>
        <span className="font-display text-[15px] font-semibold text-[var(--color-text-primary)]">
          {app.name}
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {app.nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              )}
              style={
                active
                  ? { background: accent.tint, color: accent.text }
                  : undefined
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-5 py-4">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
        <span className="text-xs text-[var(--color-text-muted)]">
          Kahel Studio v2.3 • System Status
        </span>
      </div>
    </aside>
  );
}
