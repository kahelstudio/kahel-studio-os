"use client";

import { useState } from "react";
import { SETTINGS_GENERAL, SETTINGS_TOGGLES } from "@/lib/sample-data";

export default function SettingsGeneralPage() {
  const [toggles, setToggles] = useState(SETTINGS_TOGGLES.map((t) => t.on));

  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        General
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Workspace basics and locale</p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {SETTINGS_GENERAL.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-[15px] last:border-b-0">
            <span className="text-sm text-[var(--color-text-secondary)]">{r.label}</span>
            <span className="text-sm font-semibold">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 mt-9 border-b border-[var(--color-border)] pb-3 font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
        Notifications
      </div>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {SETTINGS_TOGGLES.map((t, i) => (
          <div key={t.label} className="flex items-center gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
            <div>
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{t.sub}</div>
            </div>
            <button
              onClick={() => setToggles((s) => s.map((v, idx) => (idx === i ? !v : v)))}
              className="relative ml-auto h-6 w-[42px] shrink-0 rounded-pill transition-colors"
              style={{ background: toggles[i] ? "var(--color-success)" : "var(--color-ink-300)" }}
              aria-label={`Toggle ${t.label}`}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all"
                style={{ left: toggles[i] ? "20px" : "2px" }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
