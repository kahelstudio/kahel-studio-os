"use client";

import Link from "next/link";
import { Bell, LayoutGrid, Menu, Search } from "lucide-react";
import { ACCENTS, type AppDef } from "@/lib/apps-config";
import { AvatarMenu } from "@/components/shell/avatar-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
      {onOpenMobileNav && (
        <button
          onClick={onOpenMobileNav}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <Link
        href="/"
        title="All apps"
        className="flex shrink-0 items-center gap-2.5 rounded-control px-2 py-1.5 hover:bg-[var(--color-surface-muted)]"
      >
        <span
          className="flex h-[30px] w-[30px] items-center justify-center rounded-control"
          style={{ background: accent.tint, color: accent.text }}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="font-display text-base font-semibold text-[var(--color-text-primary)]">
          {app.name}
        </span>
        <LayoutGrid className="h-4 w-4 text-[var(--color-text-muted)]" />
      </Link>

      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <button
          onClick={onOpenCommandPalette}
          className="hidden h-[38px] min-w-[340px] items-center gap-2.5 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 text-left text-sm text-[var(--color-text-muted)] md:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          Search everything…
        </button>
        <button
          onClick={onOpenCommandPalette}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] md:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <ThemeToggle size={38} />
        <button
          className="flex h-[38px] w-[38px] items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <AvatarMenu size={38} />
      </div>
    </header>
  );
}
