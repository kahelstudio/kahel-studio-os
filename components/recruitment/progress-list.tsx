export interface ProgressPerson {
  ini: string;
  name: string;
  role: string;
  pct: string;
  label: string;
  barColor: string;
  stBg: string;
  stColor: string;
  stLabel: string;
}

export interface ChecklistItem {
  label: string;
  tick: string;
  bg: string;
  textColor: string;
}

export function ProgressList({
  title,
  people,
  checklist,
  checklistOwner,
}: {
  title: string;
  people: ProgressPerson[];
  checklist: ChecklistItem[];
  checklistOwner: string;
}) {
  return (
    <div className="mt-[26px] grid grid-cols-[1.3fr_1fr] gap-5">
      <div className="flex flex-col gap-3.5">
        {people.map((h) => (
          <div
            key={h.name}
            className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-[18px] hover:border-[var(--color-border-strong)]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-sm font-semibold text-[var(--color-indigo-800)]">
                {h.ini}
              </div>
              <div>
                <div className="text-[15px] font-semibold">{h.name}</div>
                <div className="text-[13px] text-[var(--color-text-secondary)]">{h.role}</div>
              </div>
              <span
                className="ml-auto shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: h.stBg, color: h.stColor }}
              >
                {h.stLabel}
              </span>
            </div>
            <div className="mt-3.5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-pill bg-[var(--color-ink-100)]">
                <div className="h-full rounded-pill" style={{ width: h.pct, background: h.barColor }} />
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">{h.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="self-start overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-baseline justify-between border-b border-[var(--color-ink-100)] px-5 py-4">
          <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em]">{title}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{checklistOwner}</span>
        </div>
        {checklist.map((c) => (
          <div key={c.label} className="flex items-center gap-3 border-b border-[var(--color-ink-50)] px-5 py-3 text-sm last:border-b-0">
            <span
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
              style={{ background: c.bg, color: c.tick }}
            >
              ✓
            </span>
            <span className="font-medium" style={{ color: c.textColor }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
