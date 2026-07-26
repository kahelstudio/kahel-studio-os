"use client";

import { useState } from "react";
import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";
import { PREFERENCES_DENSITY, PREFERENCES_THEMES } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export default function PreferencesAppearancePage() {
  const { preference, setPreference } = useTheme();
  const [density, setDensity] = useState("comfortable");

  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Appearance
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        How the workspace looks on your devices
      </p>

      <div className="mb-4 mt-7 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        Theme
      </div>
      <div className="flex gap-3.5">
        {PREFERENCES_THEMES.map((t) => {
          const active = preference === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setPreference(t.k as ThemePreference)}
              className="flex-1 rounded-card border-[1.5px] p-3.5 text-left"
              style={{ borderColor: active ? "var(--color-kahel-500)" : "var(--color-border)", background: active ? "var(--color-kahel-50)" : "var(--color-surface)" }}
            >
              <div
                className="flex h-16 items-center justify-center rounded-control border border-[var(--color-border)]"
                style={{ background: t.bg }}
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.dot }} />
              </div>
              <div className="mt-3 text-sm font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{t.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 mt-9 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        Density
      </div>
      <div className="flex gap-2.5">
        {PREFERENCES_DENSITY.map((d) => (
          <button
            key={d.k}
            onClick={() => setDensity(d.k)}
            className={cn(
              "h-10 rounded-control border px-5 text-sm font-semibold",
              density === d.k
                ? "border-[var(--color-ink-600)] bg-[var(--color-ink-600)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
