import { Plus } from "lucide-react";
import { TASKS_BOARD } from "@/lib/sample-data";

export default function TasksBoardPage() {
  return (
    <div className="max-w-[1320px] p-12 pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Tasks
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Internal work assigned to staff — standalone or linked to a project
          </p>
        </div>
        <button className="flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New task
        </button>
      </div>

      <div className="mt-[26px] grid grid-cols-4 items-start gap-4">
        {TASKS_BOARD.map((col) => (
          <div key={col.label} className="rounded-card border border-[var(--color-border)] bg-[var(--color-canvas)] p-3">
            <div className="flex items-center gap-2 px-1.5 pb-3 pt-1">
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: col.bg, color: col.c }}
              >
                {col.label}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{col.count}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {col.items.map((t) => (
                <div
                  key={t.title}
                  className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 hover:border-[var(--color-border-strong)]"
                >
                  <div className="text-sm font-semibold leading-[1.35]">{t.title}</div>
                  <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">{t.meta}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-pill bg-[var(--color-ink-100)] px-2 py-0.5 text-[10px] font-semibold text-[#4A453F]">
                      {t.cat}
                    </span>
                    {t.recur && (
                      <span className="rounded-pill bg-[var(--color-teal-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-teal-800)]">
                        ↻ {t.recur}
                      </span>
                    )}
                    {t.standalone && (
                      <span className="rounded-pill border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                        Standalone
                      </span>
                    )}
                    {t.fromMaint && (
                      <span className="rounded-pill bg-[var(--color-indigo-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-indigo-800)]">
                        ⚙ From maintenance
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: t.pBg, color: t.pColor }}
                    >
                      {t.prio}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">{t.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
