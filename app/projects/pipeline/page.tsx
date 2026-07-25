import { PROJECT_GROUPS } from "@/lib/sample-data";

export default function ProjectsPipelinePage() {
  const totalActive = PROJECT_GROUPS.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="max-w-[1200px] p-12 pt-9">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[36px] font-semibold tracking-[-0.025em] text-[var(--color-ink-800)]">
            Post-production
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Auto-created when a booking is confirmed — one project per booking, from culling to delivered
          </p>
        </div>
        <span className="text-xs tracking-[0.04em] text-[var(--color-text-muted)]">
          {totalActive} ACTIVE
        </span>
      </div>

      <div className="mt-7 flex flex-col gap-7">
        {PROJECT_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="mb-3.5 flex items-baseline gap-3 border-b border-[var(--color-border)] pb-2.5">
              <span
                className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                style={{ background: g.bg, color: g.color }}
              >
                {g.label}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{g.count}</span>
            </div>
            <div className="grid grid-cols-3 gap-3.5">
              {g.items.map((p) => (
                <div
                  key={p.ref}
                  className="flex flex-col gap-2.5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[18px] hover:border-[var(--color-border-strong)]"
                >
                  <div className="text-xs text-[var(--color-text-muted)]">{p.ref}</div>
                  <div className="font-display text-base font-semibold leading-5">{p.title}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{p.booking}</div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-[13px] text-[var(--color-text-secondary)]">{p.meta}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-[11px] font-semibold text-[var(--color-indigo-800)]">
                      {p.editor}
                    </span>
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
