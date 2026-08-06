export const dynamic = "force-dynamic";

import { CheckCircle2, Clock, TriangleAlert } from "lucide-react";
import { getCrmQueue } from "@/lib/server/crm-data";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function daysAge(dateStr: string | null) {
  if (!dateStr) return "No date set";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  return `${diffDays} day${diffDays === 1 ? "" : "s"} cold`;
}

export default async function CrmQueuePage() {
  const { noNextAction, dueToday, overdue } = await getCrmQueue();

  return (
    <div className="p-10 pt-8">
      <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
        Follow-up queue
      </h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
        Inquiries die from no follow-up. This is where you start the day.
      </p>

      <div className="mt-7 overflow-hidden rounded-card border border-[#FADBB0] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2.5 border-b border-[#FCE6D3] bg-[var(--color-kahel-50)] px-[18px] py-3.5">
          <TriangleAlert className="h-[18px] w-[18px] text-[var(--color-kahel-700)]" strokeWidth={1.75} />
          <span className="font-display text-[15px] font-semibold text-[var(--color-kahel-700)]">
            No next action set
          </span>
          <span className="rounded-pill bg-[var(--color-kahel-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-kahel-700)]">
            {noNextAction.length}
          </span>
          <span className="ml-auto text-[13px] text-[var(--color-kahel-700)]">
            These will slip if you don&rsquo;t act
          </span>
        </div>
        {noNextAction.length === 0 && (
          <div className="px-[18px] py-6 text-center text-xs text-[var(--color-text-muted)]">
            All accounts have contacts assigned.
          </div>
        )}
        {noNextAction.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-4 border-b border-[var(--color-border)] px-[18px] py-3.5 last:border-b-0"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] font-display text-sm font-semibold text-[var(--color-text-secondary)]">
              {initials(r.name)}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{r.name}</div>
              <div className="text-[13px] text-[var(--color-text-secondary)]">{r.category}</div>
            </div>
            <span className="ml-auto shrink-0 rounded-pill bg-[var(--color-danger-bg)] px-2.5 py-1 text-xs text-[var(--color-danger-text)]">
              {daysAge(r.nextActionDate)}
            </span>
            <button className="h-[34px] shrink-0 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold hover:border-[var(--color-kahel-700)] hover:text-[var(--color-kahel-700)]">
              Set next action
            </button>
          </div>
        ))}
      </div>

      <div className="mb-3 mt-[26px] flex items-center gap-2.5">
        <Clock className="h-[18px] w-[18px] text-[var(--color-kahel-700)]" strokeWidth={1.75} />
        <span className="font-display text-base font-semibold text-[var(--color-text-primary)]">Due today</span>
        <span className="rounded-pill bg-[var(--color-kahel-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-kahel-700)]">
          {dueToday.length}
        </span>
      </div>
      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        {dueToday.length === 0 && (
          <div className="px-[18px] py-6 text-center text-xs text-[var(--color-text-muted)]">
            Nothing due today.
          </div>
        )}
        {dueToday.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-4 border-b border-[var(--color-border)] px-[18px] py-3.5 last:border-b-0"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-sm font-semibold text-[var(--color-indigo-800)]">
              {initials(r.name)}
            </div>
            <div>
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{r.name}</div>
              <div className="text-[13px] text-[var(--color-text-secondary)]">{r.category} · {r.ref || "No reference"}</div>
            </div>
            <span className="ml-auto text-[13px] text-[var(--color-text-secondary)]">{r.nextActionLabel}</span>
            <button className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-success)] hover:border-[var(--color-success)] hover:bg-[var(--color-success-bg)]">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>

      <div className="mb-3 mt-[26px] flex items-center gap-2.5">
        <Clock className="h-[18px] w-[18px] text-[var(--color-text-muted)]" strokeWidth={1.75} />
        <span className="font-display text-base font-semibold text-[var(--color-text-secondary)]">Overdue</span>
        <span className="rounded-pill bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">
          {overdue.length}
        </span>
      </div>
      {overdue.length === 0 ? (
        <div className="rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-9 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
            <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="font-display text-base font-semibold text-[var(--color-text-secondary)]">Nothing overdue</div>
          <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
            You&rsquo;re on top of every account. Nice.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          {overdue.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 border-b border-[var(--color-border)] px-[18px] py-3.5 last:border-b-0"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger-bg)] font-display text-sm font-semibold text-[var(--color-danger-text)]">
                {initials(r.name)}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{r.name}</div>
                <div className="text-[13px] text-[var(--color-text-secondary)]">{r.category} · {r.ref || "No reference"}</div>
              </div>
              <span className="ml-auto shrink-0 rounded-pill bg-[var(--color-danger-bg)] px-2.5 py-1 text-xs text-[var(--color-danger-text)]">
                {daysAge(r.nextActionDate)}
              </span>
              <button className="h-[34px] shrink-0 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold hover:border-[var(--color-kahel-700)] hover:text-[var(--color-kahel-700)]">
                Follow up
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
