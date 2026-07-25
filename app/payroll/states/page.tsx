"use client";

import { AlertTriangle, Clock, Download, Info, Lock, RefreshCw } from "lucide-react";
import { PAYROLL_STATES, PAYROLL_STATUS_CHIPS } from "@/lib/sample-data";
import { useToast } from "@/components/toast/toast-provider";

const ICONS = [Clock, AlertTriangle, AlertTriangle, RefreshCw, Clock, AlertTriangle, AlertTriangle, Lock, Lock, RefreshCw, Info, Download];

export default function PayrollStatesPage() {
  const { fireToast } = useToast();

  return (
    <div className="max-w-[1240px] p-10 pb-14 pt-8">
      <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-ink-800)]">
        System states
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Every error and edge state explains what happened and offers a safe next step
      </p>

      <div className="mt-[22px] rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
          Pay-run lifecycle · colour always paired with a label
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAYROLL_STATUS_CHIPS.map((c) => (
            <span
              key={c.label}
              className="rounded-pill px-2.5 py-1 text-xs font-semibold"
              style={{ background: c.bg, color: c.c }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {PAYROLL_STATES.map((s, i) => {
          const Icon = ICONS[i] ?? Info;
          return (
            <div key={s.title} className="flex flex-col rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control"
                  style={{ background: s.bg, color: s.c }}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span
                  className="ml-auto rounded-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]"
                  style={{ background: s.bg, color: s.c }}
                >
                  {s.sev}
                </span>
              </div>
              <div className="mt-3.5 font-display text-base font-semibold">{s.title}</div>
              <p className="mt-1.5 flex-1 text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">{s.what}</p>
              <button
                onClick={() => fireToast(s.action)}
                className="mt-4 self-start rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-semibold hover:border-[var(--color-kahel-700)] hover:text-[var(--color-kahel-700)]"
              >
                {s.action}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
