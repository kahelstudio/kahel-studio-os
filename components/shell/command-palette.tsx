"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { APPS } from "@/lib/apps-config";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  group: string;
  href: string;
  icon: (typeof APPS)[number]["icon"];
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const items: Command[] = [];
    for (const app of APPS) {
      items.push({ id: app.id, label: app.name, group: "Apps", href: app.href, icon: app.icon });
      for (const nav of app.nav) {
        items.push({
          id: `${app.id}-${nav.id}`,
          label: `${app.name} · ${nav.label}`,
          group: app.name,
          href: nav.href,
          icon: app.icon,
        });
      }
    }
    return items;
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 8);
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 20);
  }, [commands, query]);

  useEffect(() => {
    if (!open) {
      // Reset for the next time the palette opens (open/close is an external
      // signal from the parent, not state derived during render).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const target = filtered[activeIndex];
        if (target) {
          router.push(target.href);
          onClose();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, filtered, activeIndex, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:items-start sm:p-4 sm:pt-[15dvh]" role="dialog" aria-modal="true" aria-label="Search and navigation">
      <div className="absolute inset-0 bg-[rgba(10,10,10,0.4)]" onClick={onClose} aria-hidden />
      <div className="relative max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-3.5">
          <Search className="h-4.5 w-4.5 text-[var(--color-text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to an app or screen…"
            className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] sm:text-sm"
          />
          <kbd className="rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
            Esc
          </kbd>
        </div>
        <div className="max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No matches for &ldquo;{query}&rdquo;
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => {
                router.push(cmd.href);
                onClose();
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm",
                i === activeIndex
                  ? "bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
              )}
            >
              <cmd.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
