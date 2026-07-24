"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { APPS_BY_ID } from "@/lib/apps-config";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";

export function AppShell({ appId, children }: { appId: string; children: React.ReactNode }) {
  const app = APPS_BY_ID[appId];
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setMobileNavOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <Topbar
        app={app}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar app={app} />
        </div>
        <main className="flex flex-1 flex-col overflow-y-auto bg-[var(--color-canvas)]">
          {children}
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(10,10,10,0.4)]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <div className="relative flex h-full w-64 flex-col bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]">
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar app={app} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
