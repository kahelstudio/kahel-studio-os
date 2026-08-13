export const dynamic = "force-dynamic";

import Link from "next/link";
import { ACCENTS } from "@/lib/apps-config";
import { getAccounts } from "@/lib/server/crm-data";
import { cn } from "@/lib/utils";
import { NewAccountButton } from "./new-account-button";

const FILTERS = ["All", "Corporate", "Consumer", "Referral source"] as const;
type Filter = (typeof FILTERS)[number];

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

export default async function CrmAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeFilter: Filter = (FILTERS as readonly string[]).includes(type ?? "") ? (type as Filter) : "All";

  const rows = await getAccounts();
  const allAccounts = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.accountType === "corporate" ? "Corporate" as const : "Consumer" as const,
    accent: "indigo" as const,
    source: r.externalRef ?? "",
    last: r.lastBooking
      ? new Date(r.lastBooking).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    ltv: formatPHP(r.totalSpent),
    phone: r.mobile ?? "—",
  }));

  const accounts = allAccounts.filter((a) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Corporate") return a.type === "Corporate";
    if (activeFilter === "Consumer") return a.type === "Consumer";
    if (activeFilter === "Referral source") return a.source !== "";
    return true;
  });

  return (
    <div className="app-page p-4 pt-6 sm:p-10 sm:pt-8">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Customers</h1>
        <NewAccountButton />
      </div>

      <div className="mb-3.5 flex gap-6 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = f === activeFilter;
          return (
            <Link
              key={f}
              href={f === "All" ? "/crm/accounts" : `/crm/accounts?type=${encodeURIComponent(f)}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 pb-2 pt-1 text-[13px] font-semibold transition-colors",
                active
                  ? "border-[#FF5300] text-[#FF5300]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {f}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid h-11 min-w-[720px] grid-cols-[2fr_1.4fr_0.9fr_1.1fr_1fr] items-center bg-[var(--color-canvas)] px-[18px] text-xs font-semibold uppercase tracking-[0.03em] text-[var(--color-text-secondary)]">
          <div>Customer</div>
          <div>Mobile</div>
          <div>Type</div>
          <div>Last booking</div>
          <div className="text-right">Lifetime</div>
        </div>
        {accounts.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--color-text-muted)]">
            No customers match this filter.
          </div>
        ) : (
          accounts.map((a) => {
            const accent = ACCENTS[a.accent];
            return (
              <Link
                key={a.id}
                href={`/crm/accounts/${a.id}`}
                className="grid h-14 min-w-[720px] grid-cols-[2fr_1.4fr_0.9fr_1.1fr_1fr] items-center border-b border-[var(--color-border)] px-[18px] text-sm last:border-b-0 hover:bg-[var(--color-canvas)]"
              >
                <div className="flex min-w-0 items-center">
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
          })
        )}
      </div>
    </div>
  );
}
