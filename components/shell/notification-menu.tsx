"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";

type Notification = { id: string; title: string; body: string; href: string; read_at: string | null; created_at: string };

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  async function loadNotifications(active = () => true) {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const body = await response.json() as { notifications?: Notification[]; unread?: number };
    if (!active()) return;
    setNotifications(body.notifications ?? []);
    setUnread(body.unread ?? 0);
  }

  useEffect(() => {
    let active = true;
    const refresh = () => void loadNotifications(() => active).catch(() => undefined);
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);

  async function markRead(id?: string) {
    const now = new Date().toISOString();
    const wasUnread = id ? notifications.some((item) => item.id === id && !item.read_at) : false;
    setNotifications((current) => current.map((item) => !id || item.id === id ? { ...item, read_at: item.read_at ?? now } : item));
    setUnread((current) => id ? Math.max(0, current - (wasUnread ? 1 : 0)) : 0);
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) }).catch(() => undefined);
  }

  function toggle() {
    setOpen((value) => {
      const next = !value;
      if (next) void loadNotifications().catch(() => undefined);
      return next;
    });
  }

  return <div className="relative"><button onClick={toggle} aria-expanded={open} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative flex h-11 w-11 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1.5 top-1.5 min-w-4 rounded-pill bg-[#FF5300] px-1 text-center text-[10px] font-bold leading-4 text-white">{Math.min(unread, 99)}</span>}</button>{open && <div className="fixed inset-x-3 top-16 z-[60] max-h-[min(70dvh,560px)] overflow-hidden rounded-modal border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]"><div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3"><span className="font-display text-[15px] font-semibold">Notifications</span>{unread > 0 && <button onClick={() => void markRead()} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#FF5300]"><Check className="h-3.5 w-3.5" /> Mark all read</button>}</div><div className="max-h-[calc(min(70dvh,560px)-52px)] overflow-y-auto">{notifications.length ? notifications.map((item) => <Link key={item.id} href={item.href} onClick={() => { setOpen(false); void markRead(item.id); }} className={`block border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 hover:bg-[var(--color-canvas)] ${item.read_at ? "" : "bg-[var(--color-kahel-100)]"}`}><div className="text-sm font-semibold">{item.title}</div><p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{item.body}</p><div className="mt-1 text-[10px] text-[var(--color-text-muted)]">{formatNotificationDate(item.created_at)}</div></Link>) : <div className="py-12 text-center"><Bell className="mx-auto h-7 w-7 text-[var(--color-text-muted)]" /><p className="mt-3 text-sm font-semibold">No notifications</p><p className="mt-1 text-xs text-[var(--color-text-secondary)]">New system activity will appear here.</p></div>}</div></div>}</div>;
}

function formatNotificationDate(value: string) { return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)); }
