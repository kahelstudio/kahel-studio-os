"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Bell,
  Camera,
  Coins,
  FolderKanban,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AvatarMenu } from "@/components/shell/avatar-menu";
import { QuickCreateSheet } from "@/components/shell/quick-create";
import { cn } from "@/lib/utils";

const NOTIF_ICON = {
  booking: { bg: "#FFF4EE", c: "#B33800", Icon: Camera },
  payment: { bg: "#E0F7EC", c: "#005430", Icon: Coins },
  task: { bg: "#E0F7F8", c: "#00575C", Icon: ListChecks },
  glitch: { bg: "#FDE4EA", c: "#8A0625", Icon: TriangleAlert },
  project: { bg: "#EDEAFD", c: "#2A1F87", Icon: FolderKanban },
  feedback: { bg: "#E3EDFF", c: "#053799", Icon: MessageSquare },
} as const;

const NOTIF_DATA = [
  {
    type: "booking",
    title: "Ayala Land Premier",
    body: "confirmed the Corporate Headshots booking.",
    when: "12 min ago",
    unread: true,
  },
  {
    type: "payment",
    title: "₱14,000 deposit",
    body: "received for Bianca & Marco — Wedding.",
    when: "40 min ago",
    unread: true,
  },
  {
    type: "glitch",
    title: "GL-0041",
    body: "Payslip PDF fails to generate for interns was reported.",
    when: "1 hr ago",
    unread: true,
  },
  {
    type: "task",
    title: "Charge batteries",
    body: "is due today — assigned to Danilo.",
    when: "2 hrs ago",
    unread: false,
  },
  {
    type: "project",
    title: "PRJ-2026-0138",
    body: "auto-created from the Ayala Land booking.",
    when: "2 hrs ago",
    unread: false,
  },
] as const;

export function LauncherTopbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readAll, setReadAll] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();

  const unreadCount = readAll ? 0 : NOTIF_DATA.filter((n) => n.unread).length;
  const logoSrc =
    resolved === "dark" ? "/kahelstudio-logo_w.svg" : "/kahelstudio-logo_b.svg";

  useEffect(() => {
    if (!notifOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotifOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotifOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notifOpen]);

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-6 px-12">
      <Image
        src={logoSrc}
        alt="Kahel Studio"
        width={164}
        height={24}
        priority
        className="h-6 w-auto"
      />

      <button
        onClick={onOpenCommandPalette}
        className="ml-auto flex h-10 min-w-[340px] items-center gap-2.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text-muted)]"
      >
        <Search className="h-4 w-4" />
        Search apps, accounts, bookings…
      </button>

      <button
        onClick={() => setQuickCreateOpen(true)}
        className="flex h-10 min-w-[180px] items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-7 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
      >
        <Plus className="h-4 w-4" /> Create
      </button>

      <div className="flex items-center gap-0.5">
        <ThemeToggle size={40} />

        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            title="Notifications"
            aria-expanded={notifOpen}
            aria-controls="notifications-menu"
            className="relative flex h-10 w-10 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--color-kahel-500)] px-1 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div id="notifications-menu" className="absolute right-0 top-12 z-[60] w-[360px] overflow-hidden rounded-modal border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_18px_48px_-18px_rgba(20,20,20,0.28)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
                <span className="font-display text-[15px] font-semibold">Notifications</span>
                <button
                  onClick={() => setReadAll(true)}
                  className="text-xs font-semibold text-[var(--color-kahel-500)]"
                >
                  Mark all read
                </button>
              </div>
              <div>
                {NOTIF_DATA.map((n, i) => {
                  const meta = NOTIF_ICON[n.type as keyof typeof NOTIF_ICON];
                  const unread = n.unread && !readAll;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3 border-b border-[var(--color-border)] px-4 py-3.5",
                        unread ? "bg-[var(--color-kahel-50)]" : "bg-[var(--color-surface)]"
                      )}
                    >
                      <span
                        className="mt-px flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                        style={{ background: meta.bg, color: meta.c }}
                      >
                        <meta.Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] leading-snug text-[var(--color-text-primary)]">
                          <span className="font-semibold">{n.title}</span> {n.body}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{n.when}</div>
                      </div>
                      {unread && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-kahel-500)]" />
                      )}
                    </div>
                  );
                })}
              </div>
              <button className="w-full border-t border-[var(--color-border)] bg-[var(--color-canvas)] py-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
                View all activity
              </button>
            </div>
          )}
        </div>
      </div>

      <AvatarMenu size={40} />

      <QuickCreateSheet open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
    </header>
  );
}
