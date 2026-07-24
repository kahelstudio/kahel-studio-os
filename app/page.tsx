"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { LauncherGrid } from "@/components/launcher/launcher-grid";

export default function LauncherPage() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <Topbar onOpenCommandPalette={() => setPaletteOpen(true)} />
      <main className="flex-1 overflow-y-auto bg-[var(--color-canvas)]">
        <LauncherGrid />
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
