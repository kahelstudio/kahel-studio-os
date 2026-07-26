"use client";

import { useState } from "react";
import { PAYROLL_CONTRIB_DATA, PAYROLL_CONTRIB_TABS, contribStyle } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  sss: "SSS",
  philhealth: "PhilHealth",
  pagibig: "Pag-IBIG",
  tax: "Withholding tax",
};

const TABLES: Record<string, string> = {
  sss: "SSS 2025 table · v2",
  philhealth: "PhilHealth 2025 · 5.0%",
  pagibig: "Pag-IBIG · 2% capped",
  tax: "BIR TRAIN · 2023 brackets",
};

export default function PayrollContributionsPage() {
  const [tab, setTab] = useState<(typeof PAYROLL_CONTRIB_TABS)[number]["k"]>("sss");
  const rows = PAYROLL_CONTRIB_DATA[tab];

  return (
    <div className="p-10 pb-14 pt-8">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        Contributions
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Statutory contributions and withholding, by period
      </p>

      <div className="mt-5 flex gap-2">
        {PAYROLL_CONTRIB_TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "h-9 rounded-control border px-4 text-sm font-semibold",
              tab === t.k
                ? "border-[var(--color-ink-600)] bg-[var(--color-ink-600)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        {tab === "tax" ? "Employee share only · remitted to BIR" : "Employee and employer shares · effective-dated table"} · {TABLES[tab]}
      </p>

      <div className="mt-4 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 grid-cols-[1fr_1fr_1fr_1fr_0.8fr_1fr_1.2fr] items-center bg-[var(--color-canvas)] px-5 text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Period</div>
          <div className="text-right">EE share</div>
          <div className="text-right">ER share</div>
          <div className="text-right">Total</div>
          <div className="text-right">Emps</div>
          <div>Due</div>
          <div>Status</div>
        </div>
        {rows.map((r) => {
          const style = contribStyle(r.st);
          return (
            <div
              key={r.period}
              className="grid h-14 grid-cols-[1fr_1fr_1fr_1fr_0.8fr_1fr_1.2fr] items-center border-b border-[var(--color-border)] px-5 text-sm last:border-b-0"
            >
              <div className="font-semibold">{TITLES[tab]} · {r.period}</div>
              <div className="text-right">{r.ee}</div>
              <div className="text-right">{r.er}</div>
              <div className="text-right font-display font-semibold">{r.total}</div>
              <div className="text-right text-[var(--color-text-secondary)]">{r.emps}</div>
              <div className="text-xs text-[var(--color-text-primary)]">{r.due}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: style.bg, color: style.c }}
                >
                  {r.st === "due" ? "Due" : r.st === "ready" ? "Ready for review" : r.st === "scheduled" ? "Scheduled" : "Remitted"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
