import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ACCENTS } from "@/lib/apps-config";
import { ACCOUNTS } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Corporate", "Consumer", "Referral source"];

export default function CrmAccountsPage() {
  const corporate = ACCOUNTS.filter((a) => a.type === "Corporate").length;
  const consumer = ACCOUNTS.filter((a) => a.type === "Consumer").length;

  return (
    <div className="p-4 pt-6 sm:p-10 sm:pt-8">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            Accounts
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
            {ACCOUNTS.length} accounts · {corporate} corporate · {consumer} consumer
          </p>
        </div>
        <button className="flex h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
          <Plus className="h-4 w-4" /> New account
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-card bg-[var(--color-surface-muted)] px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
        <input
          placeholder="Look up a client by mobile number — e.g. 0917 555 0142 or +63 917 555 0142"
          className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <span className="hidden shrink-0 text-xs text-[var(--color-text-muted)] lg:block">
          &ldquo;May I have the mobile number used for your booking?&rdquo;
        </span>
      </div>

      <div className="mb-3.5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            className={cn(
              "h-8 rounded-pill border px-3.5 text-[13px] font-medium",
              i === 0
                ? "border-[var(--color-ink-600)] bg-[var(--color-ink-600)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 min-w-[720px] grid-cols-[2fr_1.4fr_0.9fr_1.1fr_1fr] items-center bg-[var(--color-canvas)] px-[18px] text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Account</div>
          <div>Mobile</div>
          <div>Type</div>
          <div>Last booking</div>
          <div className="text-right">Lifetime</div>
        </div>
        {ACCOUNTS.map((a) => {
          const accent = ACCENTS[a.accent];
          return (
            <Link
              key={a.id}
              href={`/crm/accounts/${a.id}`}
              className="grid h-14 min-w-[720px] grid-cols-[2fr_1.4fr_0.9fr_1.1fr_1fr] items-center border-b border-[var(--color-border)] px-[18px] text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-control font-display text-[13px] font-semibold"
                  style={{ background: accent.tint, color: accent.text }}
                >
                  {a.ini}
                </div>
                <span className="truncate font-semibold text-[var(--color-text-primary)]">{a.name}</span>
              </div>
              <div className="text-[13px] text-[var(--color-text-secondary)]">{a.phone}</div>
              <div>
                <span
                  className="rounded-pill px-2.5 py-1 text-xs font-semibold"
                  style={{ background: accent.tint, color: accent.text }}
                >
                  {a.type}
                </span>
              </div>
              <div className="text-[var(--color-text-secondary)]">{a.last}</div>
              <div className="text-right font-display font-semibold text-[var(--color-text-primary)]">{a.ltv}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
