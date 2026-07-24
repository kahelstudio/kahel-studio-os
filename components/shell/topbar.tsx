"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, LayoutGrid, Menu, Plus, Search } from "lucide-react";
import { ACCENTS, type AppDef } from "@/lib/apps-config";
import { AvatarMenu } from "@/components/shell/avatar-menu";
import { QuickCreateSheet } from "@/components/shell/quick-create";

export function Topbar({
  app,
  onOpenCommandPalette,
  onOpenMobileNav,
}: {
  app: AppDef;
  onOpenCommandPalette: () => void;
  onOpenMobileNav?: () => void;
}) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
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
        <LayoutGrid className="h-4 w-4 text-[var(--color-ink-300)]" />
      </Link>

      <button
        onClick={onOpenCommandPalette}
        className="mx-4 hidden h-[38px] max-w-[420px] flex-1 items-center gap-2.5 rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] px-4 text-left text-sm text-[var(--color-text-muted)] md:flex"
      >
        <Search className="h-4 w-4" />
        Search everything…
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] md:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          onClick={() => setQuickCreateOpen(true)}
          className="hidden h-[38px] items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 font-display text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] sm:flex"
        >
          <Plus className="h-4 w-4" /> Create
        </button>
        <button
          onClick={() => setQuickCreateOpen(true)}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] sm:hidden"
          aria-label="Quick create"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          className="flex h-[38px] w-[38px] items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <AvatarMenu size={38} />
      </div>

      <QuickCreateSheet open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
    </header>
  );
}
