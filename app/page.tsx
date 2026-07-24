"use client";

import { useEffect, useState } from "react";
import { LauncherTopbar } from "@/components/launcher/launcher-topbar";
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
    <div className="h-dvh overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[1512px] flex-col">
        <LauncherTopbar onOpenCommandPalette={() => setPaletteOpen(true)} />
        <LauncherGrid />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
