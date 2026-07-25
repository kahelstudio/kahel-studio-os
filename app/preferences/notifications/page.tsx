"use client";

import { useState } from "react";
import { PREFERENCES_NOTIFY } from "@/lib/sample-data";

export default function PreferencesNotificationsPage() {
  const [toggles, setToggles] = useState(PREFERENCES_NOTIFY.map((t) => t.on));

  return (
    <div className="max-w-[820px] p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
        Notifications
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">What reaches you, and how</p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {PREFERENCES_NOTIFY.map((t, i) => (
          <div key={t.label} className="flex items-center gap-4 border-b border-[var(--color-ink-100)] px-5 py-4 last:border-b-0">
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
