export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { LoyaltyAdminPanel } from "@/components/loyalty/loyalty-admin-panel";
import { getAccountById } from "@/lib/server/crm-data";
import { BOOKING_STATUS } from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import { OperationCreateButton } from "@/components/shared/operation-create-button";
import { EditAccountButton } from "./edit-account-button";

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

export default async function CrmAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAccountById(id);
  if (!detail) notFound();

  const account = {
    id: detail.id,
    name: detail.name,
    ini: initials(detail.name),
    type: detail.accountType === "corporate" ? "Corporate" as const : "Consumer" as const,
    accent: "indigo" as const,
    source: detail.externalRef ?? "",
    last: "",
    ltv: "",
    phone: "",
    since: detail.createdAt
      ? new Date(detail.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
      : undefined,
    nextAction: undefined as { label: string; due: string } | undefined,
    bookings: detail.bookings.map((b) => ({
      ref: b.ref,
      type: b.type,
      date: b.date ? new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
      status: b.status as keyof typeof BOOKING_STATUS,
      total: formatPHP(b.total),
    })),
    payments: detail.payments.map((p) => ({
      label: p.ref,
      date: p.date ? new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Pending",
      method: p.status,
      amount: formatPHP(p.amount),
    })),
    contacts: detail.contacts.map((c) => ({
      ini: initials(`${c.firstName} ${c.lastName}`),
      name: `${c.firstName} ${c.lastName}`,
      tag: c.status,
      email: c.email,
    })),
    notes: "",
    identity: {
      primaryMobile: detail.contacts[0]?.mobile ?? "—",
      primaryVerified: false,
      altMobile: undefined as string | undefined,
      clientId: detail.externalRef ?? detail.id.slice(0, 8),
      numberHistory: [] as { number: string; note: string }[],
    },
  };

  return (
    <div className="p-4 pb-10 pt-6 sm:p-10 sm:pb-10 sm:pt-6">
      <Link
        href="/crm/accounts"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        ‹ Accounts
      </Link>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-card bg-[var(--color-surface-muted)] font-display text-xl font-semibold text-[var(--color-text-secondary)]">
          {account.ini}
        </div>
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {account.name}
          </h1>
          <div className="mt-1 flex items-center gap-2.5">
            <span className="rounded-pill bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
              {account.type}
            </span>
            {account.since && (
              <span className="text-sm text-[var(--color-text-secondary)]">Client since {account.since}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <EditAccountButton account={{ id: account.id, name: account.name, type: detail.accountType }} contact={{ firstName: detail.contacts[0]?.firstName ?? "", lastName: detail.contacts[0]?.lastName ?? "", email: detail.contacts[0]?.email ?? "", mobile: detail.contacts[0]?.mobile ?? "" }} />
          <OperationCreateButton kind="booking" defaults={{ clientName: account.name, phone: detail.contacts[0]?.mobile ?? "", email: detail.contacts[0]?.email ?? "" }} className="h-[38px] rounded-control bg-[var(--color-kahel-500)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
            +New Booking
          </OperationCreateButton>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-[18px] py-3.5 font-display text-[15px] font-semibold">
              Bookings
            </div>
            {account.bookings.length === 0 && (
              <div className="px-[18px] py-6 text-sm text-[var(--color-text-muted)]">No bookings yet.</div>
            )}
            {account.bookings.map((b) => {
              const status = BOOKING_STATUS[b.status];
              return (
                <Link
                  key={b.ref}
                  href={`/booking/list/${b.ref}`}
                  className="flex items-center gap-3.5 border-b border-[var(--color-border)] px-[18px] py-3 last:border-b-0 hover:bg-[var(--color-canvas)]"
                >
                  <span className="text-[13px] text-[var(--color-text-secondary)]">{b.ref}</span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">{b.type}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{b.date}</div>
                  </div>
                  <span
                    className="ml-auto rounded-pill px-2.5 py-1 text-xs font-semibold"
                    style={{ background: status.bg, color: status.text }}
                  >
                    {status.label}
                  </span>
                  <span className="w-24 text-right font-display text-sm font-semibold">{b.total}</span>
                </Link>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-[18px] py-3.5 font-display text-[15px] font-semibold">
              Payments
            </div>
            {account.payments.length === 0 && (
              <div className="px-[18px] py-6 text-sm text-[var(--color-text-muted)]">No payments recorded.</div>
            )}
            {account.payments.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 border-b border-[var(--color-border)] px-[18px] py-3 text-sm last:border-b-0"
              >
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" strokeWidth={1.75} />
                <div>
                  <div className="font-medium text-[var(--color-text-primary)]">{p.label}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {p.date} · {p.method}
                  </div>
                </div>
                <span className="ml-auto font-display font-semibold">{p.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[18px]">
            <div className="mb-3 flex items-center gap-2">
              <span className="font-display text-[15px] font-semibold">Identity</span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <Lock className="h-3 w-3" /> Masked
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2">
              <div>
                <div className="text-xs text-[var(--color-text-muted)]">Primary mobile</div>
                <div className="mt-0.5 text-sm font-semibold">{account.identity.primaryMobile}</div>
              </div>
              {account.identity.primaryVerified ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-[var(--color-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-success-text)]">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="rounded-pill bg-[var(--color-warning-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-warning-text)]">
                  Unverified
                </span>
              )}
            </div>
            {account.identity.altMobile && (
              <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2">
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">Alternative mobile</div>
                  <div className="mt-0.5 text-sm font-semibold">{account.identity.altMobile}</div>
                </div>
                <span className="rounded-pill bg-[var(--color-warning-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-warning-text)]">
                  Unverified
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-xs text-[var(--color-text-muted)]">Internal client ID</div>
                <div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{account.identity.clientId}</div>
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)]">Immutable key</span>
            </div>
            {account.identity.numberHistory.length > 0 && (
              <div className="mt-2 border-t border-[var(--color-border)] pt-2.5">
                <div className="mb-1 text-xs text-[var(--color-text-muted)]">Number history</div>
                {account.identity.numberHistory.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-xs",
                      i === 0 ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"
                    )}
                  >
                    {h.number} · {h.note}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[18px]">
            <div className="mb-3 font-display text-[15px] font-semibold">Contacts</div>
            {account.contacts.map((c) => (
              <div key={c.email} className="flex items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-b-0">
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo-100)] font-display text-xs font-semibold text-[var(--color-indigo-800)]">
                  {c.ini}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {c.name} <span className="text-xs font-normal text-[var(--color-text-muted)]">{c.tag}</span>
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{c.email}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-[18px]">
            <div className="mb-2.5 font-display text-[15px] font-semibold">Notes</div>
            <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">{account.notes}</p>
          </div>
        </div>
      </div>

      <LoyaltyAdminPanel clientRef={account.id} />
    </div>
  );
}
