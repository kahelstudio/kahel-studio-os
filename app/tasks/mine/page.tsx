import { Check } from "lucide-react";
import { TASKS_MINE } from "@/lib/sample-data";

export default function TasksMinePage() {
  return (
    <div className="w-full p-12 pt-9">
      <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">
        My tasks
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Everything assigned across the studio, by due date
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {TASKS_MINE.map((t) => (
          <div
            key={t.title}
            className="grid grid-cols-[22px_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.5fr)] items-center gap-3.5 border-b border-[var(--color-border)] px-5 py-3.5 text-sm last:border-b-0"
          >
            <span
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px]"
              style={{ borderColor: t.ring, color: "var(--color-success)" }}
            >
              {t.done && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
            </span>
            <div className="min-w-0">
              <div className="font-semibold">{t.title}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{t.meta}</div>
            </div>
            <span
              className="justify-self-start rounded-pill px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: t.pBg, color: t.pColor }}
            >
              {t.prio}
            </span>
            <span
              className="justify-self-start rounded-pill px-2.5 py-1 text-center text-[11px] font-semibold"
              style={{ background: t.stBg, color: t.stColor }}
            >
              {t.stL}
            </span>
            <span className="text-right text-xs text-[var(--color-text-secondary)]">{t.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
