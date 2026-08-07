"use client";

import Link from "next/link";
import { Bell, LayoutGrid, Menu, Search } from "lucide-react";
import { ACCENTS, type AppDef } from "@/lib/apps-config";
import { AvatarMenu } from "@/components/shell/avatar-menu";


export function Topbar({
  app,
  onOpenCommandPalette,
  onOpenMobileNav,
}: {
  app: AppDef;
  onOpenCommandPalette: () => void;
  onOpenMobileNav?: () => void;
}) {
  const accent = ACCENTS[app.accent];
  const Icon = app.icon;

  return (
    <header className="flex h-16 shrink-0 items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:gap-3 sm:px-5">
      {onOpenMobileNav && (
        <button
          onClick={onOpenMobileNav}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] xl:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <Link
        href="/os"
        title="All apps"
        className="flex min-w-0 items-center gap-1.5 rounded-control px-1.5 py-1.5 hover:bg-[var(--color-surface-muted)] sm:gap-2 sm:px-2"
      >
        <span
          className="flex h-[30px] w-[30px] items-center justify-center rounded-control"
          style={{ color: accent.base }}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="hidden min-w-0 truncate font-display text-base font-semibold text-[var(--color-text-primary)] sm:block">
          {app.name}
        </span>
        <LayoutGrid className="hidden h-4 w-4 shrink-0 text-[var(--color-text-muted)] md:block" />
      </Link>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1.5">
        <button
          onClick={onOpenCommandPalette}
          className="hidden h-10 w-[clamp(220px,26vw,340px)] items-center gap-2.5 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 text-left text-sm text-[var(--color-text-muted)] xl:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          Search everything…
        </button>
        <button
          onClick={onOpenCommandPalette}
          className="flex h-11 w-11 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] xl:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          className="hidden h-11 w-11 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] min-[420px]:flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <AvatarMenu size={44} />
      </div>
    </header>
  );
}
