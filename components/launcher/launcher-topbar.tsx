"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Search } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { AvatarMenu } from "@/components/shell/avatar-menu";
import { QuickCreateSheet } from "@/components/shell/quick-create";
import { NotificationMenu } from "@/components/shell/notification-menu";

export function LauncherTopbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const { resolved } = useTheme();

  const logoSrc =
    resolved === "dark" ? "/kahelstudio-logo_w.svg" : "/kahelstudio-logo_b.svg";

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-1.5 px-4 sm:gap-3 sm:px-6 xl:gap-6 xl:px-12">
      <Image
        src={logoSrc}
        alt="Kahel Studio"
        width={164}
        height={24}
        priority
        className="h-5 w-auto sm:h-6"
      />

      <button
        onClick={onOpenCommandPalette}
        className="ml-auto hidden h-11 w-[clamp(220px,28vw,340px)] items-center gap-2.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text-muted)] lg:flex"
      >
        <Search className="h-4 w-4" />
        Search apps, accounts, bookings…
      </button>

      <button
        onClick={onOpenCommandPalette}
        className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] lg:hidden"
        aria-label="Search apps and records"
      >
        <Search className="h-5 w-5" />
      </button>

      <button
        onClick={() => setQuickCreateOpen(true)}
        className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-3 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] sm:px-5 xl:min-w-[180px] xl:px-7"
      >
        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span>
      </button>

      <NotificationMenu />

      <AvatarMenu size={44} />

      <QuickCreateSheet open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
    </header>
  );
}
