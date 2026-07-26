"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Flag,
  Filter,
  LayoutList,
  MoreHorizontal,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  FEEDBACK_KIND_META,
  FEEDBACK_PRIORITY_META,
  FEEDBACK_REPORTS,
  FEEDBACK_STATUS_META,
  FEEDBACK_STATUS_ORDER,
  type FeedbackReport,
  type FeedbackStatus,
} from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const COLS =
  "grid grid-cols-[minmax(200px,1.4fr)_minmax(220px,1.8fr)_100px_100px_120px_100px_40px] items-center gap-3";

export default function FeedbackMyReportsPage() {
  const [open, setOpen] = useState<Record<FeedbackStatus, boolean>>({
    Submitted: true,
    Triaged: true,
    "In progress": true,
    Shipped: true,
  });

  const groups = useMemo(() => {
    return FEEDBACK_STATUS_ORDER.map((status) => ({
      status,
      items: FEEDBACK_REPORTS.filter((r) => r.status === status),
      meta: FEEDBACK_STATUS_META[status],
    }));
  }, []);

  const total = FEEDBACK_REPORTS.length;

  return (
    <div className="min-h-full p-10 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            My reports
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            Everything you&rsquo;ve sent, grouped by where it stands · {total} reports
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="flex h-10 items-center gap-1.5 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]">
            <Filter className="h-3.5 w-3.5" strokeWidth={1.75} />
            Filter
          </button>
          <Link
            href="/feedback/report"
            className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--color-kahel-600)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New report
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {groups.map(({ status, items, meta }) => {
          const isOpen = open[status];
          return (
            <section key={status} className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [status]: !s[status] }))}
                className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-[var(--color-surface-muted)]"
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Sparkles className="h-3 w-3" strokeWidth={2} />
                  {status}
                </span>
                <span className="flex h-6 min-w-6 items-center justify-center rounded-control bg-[var(--color-canvas)] px-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                  {items.length}
                </span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 text-[var(--color-text-muted)] transition-transform",
                    !isOpen && "-rotate-90"
                  )}
                  strokeWidth={1.75}
                />
              </button>

              {isOpen && items.length > 0 && (
                <div className="border-t border-[var(--color-border)]">
                  <div
                    className={cn(
                      COLS,
                      "border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-muted)]"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <LayoutList className="h-3 w-3" strokeWidth={1.75} /> Report
                    </span>
                    <span>Description</span>
                    <span>App</span>
                    <span>Type</span>
                    <span>Submitted</span>
                    <span className="flex items-center gap-1">
                      <Flag className="h-3 w-3" strokeWidth={1.75} /> Priority
                    </span>
                    <span />
                  </div>

                  {items.map((r) => (
                    <ReportRow key={r.iid} report={r} />
                  ))}
                </div>
              )}

              {isOpen && items.length === 0 && (
                <div className="border-t border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No reports in this status
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ReportRow({ report: r }: { report: FeedbackReport }) {
  const kind = FEEDBACK_KIND_META[r.kind];
  const prio = FEEDBACK_PRIORITY_META[r.priority];

  return (
    <div
      className={cn(
        COLS,
        "border-b border-[var(--color-border)] px-4 py-3.5 last:border-b-0 hover:bg-[var(--color-surface-muted)]"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
            r.checked
              ? "border-[var(--color-kahel-500)] bg-[var(--color-kahel-500)] text-white"
              : "border-[var(--color-border-strong)] bg-[var(--color-surface)]"
          )}
          aria-hidden
        >
          {r.checked && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 6.5 5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{r.title}</div>
          <div className="truncate text-[11px] text-[var(--color-text-muted)]">{r.iid}</div>
        </div>
      </div>

      <div className="truncate text-[13px] text-[var(--color-text-secondary)]">{r.summary}</div>

      <div className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">{r.app}</div>

      <div>
        <span
          className="inline-flex rounded-pill px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: kind.bg, color: kind.color }}
        >
          {r.kind}
        </span>
      </div>

      <div className="text-[13px] text-[var(--color-text-secondary)]">{r.submitted}</div>

      <div>
        <span
          className="inline-flex rounded-pill border px-2 py-0.5 text-[11px] font-semibold"
          style={{
            background: prio.bg,
            color: prio.color,
            borderColor: prio.color + "33",
          }}
        >
          {r.priority}
        </span>
      </div>

      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-text-primary)]"
        aria-label="More actions"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
