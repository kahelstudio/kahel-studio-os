import type { PolicySection } from "@/lib/sample-data";

export function PolicySections({ sections }: { sections: PolicySection[] }) {
  return (
    <div className="mt-5 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-[30px] py-2">
      {sections.map((s) => (
        <div key={s.n} className="border-b border-[var(--color-border)] py-[26px] last:border-b-0">
          <div className="flex items-baseline gap-3">
            <span className="text-[13px] font-semibold text-[var(--color-kahel-700)]">{s.n}</span>
            <span className="font-display text-xl font-semibold tracking-[-0.01em]">{s.title}</span>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {s.blocks.map((b, i) => {
              if (b.type === "heading") {
                return (
                  <div key={i} className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                    {b.text}
                  </div>
                );
              }
              if (b.type === "text") {
                return (
                  <div key={i} className="text-sm leading-[1.65] text-[var(--color-text-primary)]">
                    {b.text}
                  </div>
                );
              }
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  {b.items.map((item, j) => (
                    <div key={j} className="flex gap-2.5 text-sm leading-[1.55] text-[var(--color-text-primary)]">
                      <span className="shrink-0 text-[var(--color-text-muted)]">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
