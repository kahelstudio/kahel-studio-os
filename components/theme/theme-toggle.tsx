"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle({
  className,
  size = 38,
}: {
  className?: string;
  size?: number;
}) {
  const { preference, cycle } = useTheme();
  const ThemeIcon = THEME_ICON[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme · ${preference[0].toUpperCase()}${preference.slice(1)}`}
      aria-label={`Theme: ${preference}. Click to cycle.`}
      className={cn(
        "flex items-center justify-center rounded-control text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <ThemeIcon className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}
