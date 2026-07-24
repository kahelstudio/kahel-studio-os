"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LayoutGrid,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import type { AppDef } from "@/lib/apps-config";
import { QuickCreateSheet } from "@/components/shell/quick-create";

export function Topbar({
  app,
  onOpenCommandPalette,
  onOpenMobileNav,
}: {
  app?: AppDef;
  onOpenCommandPalette: () => void;
  onOpenMobileNav?: () => void;
}) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { preference, resolved, setPreference } = useTheme();

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
      {onOpenMobileNav && (
        <button
          onClick={onOpenMobileNav}
          className="flex h-9 w-9 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <Link href="/" className="flex items-center gap-2 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-control bg-[var(--color-kahel-500)] text-white">
          <LayoutGrid className="h-4.5 w-4.5" strokeWidth={2} />
        </div>
        <span className="hidden font-display text-[17px] font-bold tracking-tight text-[var(--color-text-primary)] sm:inline">
          {app ? app.name : "Kahel Studio"}
        </span>
      </Link>

      <button
        onClick={onOpenCommandPalette}
        className="ml-2 hidden flex-1 max-w-md items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-left text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">Search…</span>
        <kbd className="rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[11px] font-medium">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onOpenCommandPalette}
          className="flex h-9 w-9 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] md:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          onClick={() => setQuickCreateOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-control bg-[var(--color-kahel-500)] text-white hover:bg-[var(--color-kahel-600)]"
          aria-label="Quick create"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-control py-1 pl-1 pr-2 hover:bg-[var(--color-surface-muted)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-xs font-semibold text-[var(--color-indigo-800)]">
              EB
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-menu)]">
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Online</span>
              </div>
              <div className="my-1 h-px bg-[var(--color-border)]" />
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Theme
              </div>
              <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                {(
                  [
                    { id: "light", icon: Sun, label: "Light" },
                    { id: "dark", icon: Moon, label: "Dark" },
                    { id: "system", icon: Monitor, label: "System" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPreference(opt.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-control py-2 text-[11px] font-medium",
                      preference === opt.id
                        ? "bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="my-1 h-px bg-[var(--color-border)]" />
              <Link
                href="/profile/me"
                className="block rounded-control px-2 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                onClick={() => setMenuOpen(false)}
              >
                My profile
              </Link>
              <Link
                href="/preferences/general"
                className="block rounded-control px-2 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                onClick={() => setMenuOpen(false)}
              >
                Preferences
              </Link>
              <div className="px-2 pt-1 text-[11px] text-[var(--color-text-muted)]">
                Resolved theme: {resolved}
              </div>
            </div>
          )}
        </div>
      </div>

      <QuickCreateSheet open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
    </header>
  );
}
