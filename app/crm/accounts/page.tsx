export const dynamic = "force-dynamic";

import Link from "next/link";
import { ACCENTS } from "@/lib/apps-config";
import { getAccounts } from "@/lib/server/crm-data";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/shared/action-button";
import { NewAccountButton } from "./new-account-button";

const FILTERS = ["All", "Corporate", "Consumer", "Referral source"];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

export default async function CrmAccountsPage() {
  const rows = await getAccounts();
  const accounts = rows.map((r) => ({
    id: r.id,
    name: r.name,
    ini: initials(r.name),
    type: r.accountType === "corporate" ? "Corporate" as const : "Consumer" as const,
    accent: "indigo" as const,
    source: r.externalRef ?? "",
    last: r.lastBooking
      ? new Date(r.lastBooking).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    ltv: formatPHP(r.totalSpent),
    phone: r.mobile ?? "—",
  }));

  return (
    <div className="p-4 pt-6 sm:p-10 sm:pt-8">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Accounts</h1>
        <NewAccountButton />
      </div>

      <div className="mb-3.5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f, i) => (
          <ActionButton
            key={f}
            label={`Filter by ${f}`}
            className={cn(
              "h-8 rounded-pill border px-3.5 text-[13px] font-medium cursor-pointer",
              i === 0
                ? "border-[var(--color-ink-600)] bg-[var(--color-ink-600)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
            )}
          >
            {f}
          </ActionButton>
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
        {accounts.map((a) => {
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
