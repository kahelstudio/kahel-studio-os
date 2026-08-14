"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const statusMeta: Record<string, { l: string; bg: string; c: string }> = {
  todo: { l: "To do", bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" },
  doing: { l: "In progress", bg: "var(--color-attention-bg)", c: "var(--color-attention-text)" },
  blocked: { l: "Blocked", bg: "var(--color-danger-bg)", c: "var(--color-danger-text)" },
  done: { l: "Done", bg: "var(--color-success-bg)", c: "var(--color-success-text)" },
};

const priorityMeta: Record<string, { bg: string; c: string }> = {
  High: { bg: "var(--color-danger-bg)", c: "var(--color-danger-text)" },
  Med: { bg: "var(--color-warning-bg)", c: "var(--color-warning-text)" },
  Low: { bg: "var(--color-surface-muted)", c: "var(--color-text-secondary)" },
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  columnStatus: string;
  priority: string;
  category: string;
  assignee: string | null;
  dueDate: string | null;
  recurrence: string | null;
  linkedRef: string | null;
  sortOrder: number;
};

type MineTask = {
  id: string;
  title: string;
  meta: string;
  due: string;
  prio: string;
  pBg: string;
  pColor: string;
  stL: string;
  stBg: string;
  stColor: string;
  ring: string;
  done: boolean;
};

function mapMineTask(t: TaskRow): MineTask {
  const prio = priorityMeta[t.priority] ?? priorityMeta.Med;
  const st = statusMeta[t.columnStatus] ?? statusMeta.todo;
  const done = t.columnStatus === "done";
  const dueDate = t.dueDate
    ? new Date(t.dueDate).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
    : "No due date";

  return {
    id: t.id,
    title: t.title,
    meta: `${t.category} · ${t.assignee ?? "Unassigned"}`,
    due: dueDate,
    prio: t.priority,
    pBg: prio.bg,
    pColor: prio.c,
    stL: st.l,
    stBg: st.bg,
    stColor: st.c,
    ring: done ? "#00A15C" : "var(--color-text-muted)",
    done,
  };
}

export default function TasksMinePage() {
  const [tasks, setTasks] = useState<MineTask[]>([]);

  useEffect(() => {
    fetch("/api/tasks?mine=true")
      .then((res) => res.json())
      .then((data) => setTasks((data as TaskRow[]).map(mapMineTask)))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full p-12 pt-9">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pb-9">
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">
          My tasks
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Everything assigned across the studio, by due date
        </p>
      </header>

      {tasks.length === 0 && (
        <div className="mt-16 text-center text-sm text-[var(--color-text-muted)]">Loading tasks…</div>
      )}

      {tasks.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          {tasks.map((t) => (
            <div
              key={t.id}
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
      )}
    </div>
  );
}
