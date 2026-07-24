"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCENTS, type AppDef } from "@/lib/apps-config";
import { cn } from "@/lib/utils";

export function Sidebar({ app, onNavigate }: { app: AppDef; onNavigate?: () => void }) {
  const pathname = usePathname();
  const accent = ACCENTS[app.accent];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-0.5 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {app.nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-control px-3 text-sm transition-colors",
              active
                ? "font-semibold text-[var(--color-kahel-500)]"
                : "font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-surface-muted)]"
            )}
            style={active ? { background: accent.tint } : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto flex items-center gap-1.5 whitespace-nowrap border-t border-[var(--color-ink-100)] px-3 pt-3 text-xs text-[var(--color-text-muted)]">
        Kahel Studio v2.3
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-success)]" />
        System Status
      </div>
    </aside>
  );
}
