"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { APPS_BY_ID } from "@/lib/apps-config";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";

export function AppShell({ appId, children, emptySidebar = false, navCounts = {} }: { appId: string; children: React.ReactNode; emptySidebar?: boolean; navCounts?: Record<string, number> }) {
  const app = APPS_BY_ID[appId];
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileNavCloseRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh flex-col">
      <Topbar
        app={app}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden xl:block">
            <Suspense fallback={<div className="h-full w-60 border-r border-[var(--color-border)] bg-[var(--color-surface)]" />}><Sidebar app={app} empty={emptySidebar} counts={navCounts} /></Suspense>
        </div>
        <main className="app-shell-main flex flex-1 flex-col overflow-y-auto bg-[var(--color-canvas)]">
          {children}
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex xl:hidden" role="dialog" aria-modal="true" aria-label={`${app.name} navigation`}>
          <div
            className="absolute inset-0 bg-[rgba(10,10,10,0.4)]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <div className="relative flex h-dvh w-[min(19rem,calc(100vw-2rem))] flex-col overflow-y-auto bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-dialog)]">
            <button
              ref={mobileNavCloseRef}
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <Suspense fallback={null}><Sidebar app={app} onNavigate={() => setMobileNavOpen(false)} empty={emptySidebar} counts={navCounts} /></Suspense>
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
