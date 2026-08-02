"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Camera,
  Users,
  ShoppingCart,
  Landmark,
  UserPlus,
  FolderKanban,
  ShieldCheck,
  Search,
  Info,
} from "lucide-react";
import { ACCENTS } from "@/lib/apps-config";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DOCS_SECTIONS, type DocIconKey } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const ICONS: Record<DocIconKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  camera: Camera,
  users: Users,
  cart: ShoppingCart,
  peso: Landmark,
  userplus: UserPlus,
  folder: FolderKanban,
  shield: ShieldCheck,
};

export default function DocsPage() {
  const [activeKey, setActiveKey] = useState(DOCS_SECTIONS[0].key);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const active = DOCS_SECTIONS.find((d) => d.key === activeKey) ?? DOCS_SECTIONS[0];
  const filtered = DOCS_SECTIONS.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.desc.toLowerCase().includes(query.toLowerCase()));
  const qEmpty = query.trim().length === 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--color-canvas)]">
      <div className="flex h-[64px] shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:h-[72px] sm:px-6 lg:px-10 xl:px-12">
        <Link
          href="/os"
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ‹ All apps
        </Link>
        <span className="ml-auto text-xs tracking-[0.04em] text-[var(--color-text-muted)]">DOCS · v0.1</span>
        <ThemeToggle size={44} />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 xl:block">
          <div className="relative mb-[18px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the docs…"
              className="h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] pl-[38px] pr-3.5 text-base outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-kahel-500)] xl:text-sm"
            />
          </div>
          {(qEmpty ? DOCS_SECTIONS : filtered).map((d) => {
            const Icon = ICONS[d.icon];
            const on = d.key === active.key;
            return (
              <button
                key={d.key}
                onClick={() => setActiveKey(d.key)}
                className={cn(
                  "mb-0.5 flex min-h-11 w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left hover:bg-[var(--color-surface-muted)]",
                  on && "bg-[var(--color-surface-muted)]"
                )}
              >
                <span className="flex w-[22px] shrink-0 items-center justify-center" style={{ color: on ? "#FF5300" : "var(--color-text-primary)" }}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className={cn("text-sm", on ? "font-semibold" : "font-medium")} style={{ color: on ? "#FF5300" : "var(--color-text-primary)" }}>
                  {d.title}
                </span>
              </button>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-10 lg:pb-[72px] lg:pt-12 xl:px-14">
          <div className="mx-auto max-w-[720px]">
            <label className="mb-6 block text-sm font-semibold text-[var(--color-text-secondary)] xl:hidden">
              Documentation section
              <select value={active.key} onChange={(event) => setActiveKey(event.target.value)} className="mt-2 h-12 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text-primary)]">
                {DOCS_SECTIONS.map((section) => <option key={section.key} value={section.key}>{section.title}</option>)}
              </select>
            </label>
            <div
              className="text-xs uppercase tracking-[0.06em]"
              style={{ color: ACCENTS[active.accent].text }}
            >
              {active.kicker}
            </div>
            <h1 className="mt-2 font-display text-[clamp(2rem,6vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.025em]">
              {active.title}
            </h1>
            <div className="mt-2.5 text-base leading-6 text-[var(--color-text-secondary)]">{active.desc}</div>
            <div className="my-7 h-px bg-[var(--color-border)]" />

            <div className="flex flex-col gap-[26px]">
              {active.blocks.map((b, i) => {
                if (b.kind === "heading") {
                  return (
                    <div key={i} className="font-display text-[19px] font-semibold tracking-[-0.01em]">
                      {b.text}
                    </div>
                  );
                }
                if (b.kind === "text") {
                  return (
                    <div key={i} className="text-[15px] leading-6 text-[var(--color-text-primary)]">
                      {b.text}
                    </div>
                  );
                }
                if (b.kind === "steps") {
                  return (
                    <div key={i} className="flex flex-col gap-2.5">
                      {b.steps.map((s, j) => (
                        <div key={j} className="flex gap-3.5">
                          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-xs font-semibold">
                            {j + 1}
                          </span>
                          <span className="text-[15px] leading-[26px] text-[var(--color-text-primary)]">{s}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex gap-3 rounded-card border border-[#FADBB0] bg-[#FFF4EE] p-4">
                    <Info className="h-[18px] w-[18px] shrink-0 text-[#B33800]" strokeWidth={1.75} />
                    <span className="text-sm leading-[21px] text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[#B33800]">{b.label}</span> {b.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-3 border-t border-[var(--color-border)] pt-5">
              <span className="text-[13px] text-[var(--color-text-muted)]">Was this helpful?</span>
              {feedback ? (
                <span className="text-[13px] text-[var(--color-success-text)]">Thanks for your feedback!</span>
              ) : (
                <>
                  <button onClick={() => setFeedback("yes")} className="h-8 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold hover:border-[var(--color-border-strong)]">
                    Yes
                  </button>
                  <button onClick={() => setFeedback("no")} className="h-8 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold hover:border-[var(--color-border-strong)]">
                    No
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
