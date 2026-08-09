"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Building2, Gauge, LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

type StaffProfileSummary = { displayName: string; initials: string; avatarUrl: string | null; role: string };

const MENU_ITEMS = [
  { label: "Account", href: "/profile/me", icon: User },
  { label: "Performance", href: "/performance/me", icon: Gauge },
  { label: "Preferences", href: "/preferences/general", icon: Settings },
  { label: "Workspace Settings", href: "/settings/general", icon: Building2 },
] as const;

export function AvatarMenu({ size = 38 }: { size?: number }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<StaffProfileSummary>({ displayName: "Account", initials: "KS", avatarUrl: null, role: "staff" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfile = () => fetch("/api/staff/profile").then(async (response) => response.ok ? await response.json() as StaffProfileSummary : null).then((data) => { if (data) setProfile(data); }).catch(() => undefined);
    void loadProfile();
    window.addEventListener("staff-profile-updated", loadProfile);
    return () => window.removeEventListener("staff-profile-updated", loadProfile);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await fetch("/api/staff/session", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display font-semibold text-[var(--color-indigo-800)]"
        style={{ width: size, height: size, fontSize: size >= 40 ? 15 : 14, backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined, backgroundPosition: "center", backgroundSize: "cover" }}
      >
        {!profile.avatarUrl && profile.initials}
      </button>
      {open && (
        <div className="absolute right-0 top-[46px] z-[70] w-56 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-menu)]">
          <div className="mb-1.5 border-b border-[var(--color-border)] px-3 pb-2.5 pt-3">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{profile.displayName}</div>
            <div className="text-xs capitalize text-[var(--color-text-muted)]">{profile.role.replaceAll("_", " ")}</div>
          </div>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex h-[38px] items-center gap-2.5 rounded-control px-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              <item.icon className="h-[18px] w-[18px] text-[var(--color-text-muted)]" strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className={cn(
              "flex h-[38px] w-full items-center gap-2.5 rounded-control px-3 text-left text-sm font-medium hover:bg-[var(--color-surface-muted)]",
              "text-[var(--color-kahel-500)]"
            )}
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
