"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, FolderKanban, Mail, MoreHorizontal, ReceiptText, UserRound } from "lucide-react";
import type { BookingWorkspaceFilters, BookingWorkspaceRow, BookingWorkspaceSummary } from "@/lib/bookings-workspace";
import { bookingTypeFor, filteredBookings, formatManilaDate, formatManilaTime, formatPeso, getBookingActionLabel, isToday, manilaIsoDate, paymentBalance, paymentLabel, statusLabel, statusTone, PRIMARY_STATUSES, MORE_STATUSES, bookingTypeOptions, attentionRequired } from "@/lib/bookings-workspace";
import { cn } from "@/lib/utils";

function formatMobile(mobile: string | null | undefined) {
  if (!mobile) return mobile ?? null;
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) {
    return `+63 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return mobile;
}

type Props = {
  rows: BookingWorkspaceRow[];
  summary: BookingWorkspaceSummary;
  initialFilters: BookingWorkspaceFilters;
  selectedRef: string | null;
  headerAction?: ReactNode;
};

const PAYMENT_OPTIONS = ["Deposit required", "Deposit pending", "Paid", "Partially paid", "Refunded", "Payment issue"] as const;
const PAGE_SIZE = 10;

export function BookingsWorkspace({ rows, initialFilters, selectedRef, headerAction }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = initialFilters.q;
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<string | null>(selectedRef);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(selectedRef));
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();
  const queryTimer = useRef<number | null>(null);

  const visibleRows = useMemo(() => filteredBookings(rows, { ...filters, q: query }), [filters, query, rows]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedRow = selected ? visibleRows.find((row) => row.reference === selected) ?? rows.find((row) => row.reference === selected) ?? null : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (queryTimer.current) window.clearTimeout(queryTimer.current);
    queryTimer.current = window.setTimeout(() => {
      params.set("q", query);
      if (filters.status) params.set("status", filters.status); else params.delete("status");
      for (const key of ["bookingType", "service", "location", "payment", "assigned", "attention", "date"] as const) {
        if (filters[key]) params.set(key, filters[key]); else params.delete(key);
      }
      if (detailsOpen && selected) params.set("ref", selected); else params.delete("ref");
      window.history.replaceState(null, "", `?${params.toString()}`);
    }, 120);
    return () => { if (queryTimer.current) window.clearTimeout(queryTimer.current); };
  }, [detailsOpen, filters, query, selected]);

  function updateUrl(next: Partial<BookingWorkspaceFilters>) {
    setPage(1);
    startTransition(() => setFilters((current) => ({ ...current, ...next })));
  }

  function selectRow(row: BookingWorkspaceRow) {
    setSelected(row.reference);
    setDetailsOpen(true);
    const params = new URLSearchParams(window.location.search);
    params.set("ref", row.reference);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  function closeDetails() {
    setDetailsOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.delete("ref");
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  return (
    <div className="flex-1">
      <div className="grid min-h-0 gap-0">
        <section className="min-h-0 border-b border-[var(--color-border)] bg-[var(--color-canvas)] xl:border-b-0 xl:border-r">
          <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-9 pt-[34px] sm:px-6">
            <div className="flex flex-col gap-12">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em]">Bookings</h1>
                  <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Manage studio shoots, events and equipment rentals.</p>
                </div>
                {headerAction}
              </div>

              <div className="flex items-end gap-6 overflow-x-auto">
                {PRIMARY_STATUSES.map((status) => (
                  <StatusTab key={status} active={filters.status === status} onClick={() => updateUrl({ status })} label={status === "all" ? "All Bookings" : status.replaceAll("_", " ")} />
                ))}
                <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="ml-auto inline-flex shrink-0 items-center gap-2 pb-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                  <Filter className="h-4 w-4" /> Filters
                </button>
              </div>

              {filtersOpen ? (
                <div className="grid gap-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SelectField label="Lifecycle" value={filters.status} onChange={(value) => updateUrl({ status: value || "all" })} options={["", ...PRIMARY_STATUSES.slice(1), ...MORE_STATUSES].map((value) => ({ value, label: value ? value.replaceAll("_", " ") : "Any" }))} />
                  <SelectField label="Date" value={filters.date} onChange={(value) => updateUrl({ date: value })} options={["", "upcoming", "today", "this_week", "this_month"].map((value) => ({ value, label: value ? value.replaceAll("_", " ") : "Any" }))} />
                  <SelectField label="Booking type" value={filters.bookingType} onChange={(value) => updateUrl({ bookingType: value })} options={[{ value: "", label: "Any" }, ...bookingTypeOptions()]} />
                  <SelectField label="Payment state" value={filters.payment} onChange={(value) => updateUrl({ payment: value })} options={[{ value: "", label: "Any" }, ...PAYMENT_OPTIONS.map((value) => ({ value, label: value }))]} />
                  <SelectField label="Attention" value={filters.attention} onChange={(value) => updateUrl({ attention: value })} options={[{ value: "", label: "Any" }, { value: "true", label: "Attention required" }]} />
                  <SelectField label="Service" value={filters.service} onChange={(value) => updateUrl({ service: value })} options={[{ value: "", label: "Any" }, ...dedupe(rows.map((row) => row.serviceType)).map((value) => ({ value, label: value }))]} />
                  <SelectField label="Location" value={filters.location} onChange={(value) => updateUrl({ location: value })} options={[{ value: "", label: "Any" }, ...dedupe(rows.map((row) => row.location)).map((value) => ({ value, label: value }))]} />
                  <SelectField label="Assigned staff" value={filters.assigned} onChange={(value) => updateUrl({ assigned: value })} options={[{ value: "", label: "Any" }, { value: "unassigned", label: "Unassigned" }]} />
                  <button type="button" onClick={() => { setPage(1); setFilters({ ...initialFilters, status: filters.status }); }} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">
                    Reset filters
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-[var(--color-canvas)]">
                <tr className="border-t border-[var(--color-border)] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                  <Th>Schedule</Th>
                  <Th>Booking</Th>
                  <Th>Client</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length ? paginatedRows.map((row) => {
                  const selectedRow = detailsOpen && selected === row.reference;
                  const lifecycle = statusLabel(row);
                  const tone = statusTone(row);
                  return (
                    <tr
                      key={row.reference}
                      tabIndex={0}
                      aria-selected={selectedRow}
                      onClick={() => selectRow(row)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectRow(row); } }}
                      className={cn(
                        "group cursor-pointer border-b border-[var(--color-border)] bg-[var(--color-surface)] outline-none transition-colors hover:bg-[var(--color-kahel-50)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-kahel-500)]",
                        selectedRow && "bg-[var(--color-kahel-50)]"
                      )}
                    >
                      <Td selected={selectedRow}>
                        <div className="flex items-center gap-3">
                          <span className={cn("inline-flex min-w-11 items-center justify-center rounded-full px-2 py-1 text-[13px] font-semibold", isToday(row, manilaIsoDate()) ? "bg-[var(--color-kahel-500)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]")}>{new Date(`${row.serviceDate}T12:00:00+08:00`).toLocaleDateString("en-PH", { day: "numeric" })}</span>
                          <div>
                            <div className="font-medium tabular-nums text-[var(--color-text-primary)]">{formatManilaTime(row.serviceTime)}</div>
                            <div className="text-[11px] text-[var(--color-text-muted)]">{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", timeZone: "Asia/Manila" }).format(new Date(`${row.serviceDate}T12:00:00+08:00`))} {new Date(`${row.serviceDate}T12:00:00+08:00`).getFullYear()}</div>
                          </div>
                        </div>
                      </Td>
                      <Td selected={selectedRow} mono>
                        <div className="font-medium text-[var(--color-text-primary)]">{row.reference}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{bookingTypeFor(row)} · {row.serviceType}</div>
                      </Td>
                      <Td selected={selectedRow}>
                        <div className="font-medium text-[var(--color-text-primary)]">{row.clientName}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{formatMobile(row.clientPhone) ?? row.clientEmail ?? row.clientExternalRef ?? "No contact"}</div>
                      </Td>
                      <Td selected={selectedRow}><Badge tone={tone}>{lifecycle}</Badge></Td>
                      <Td selected={selectedRow}>
                        <div className="font-medium text-[var(--color-text-primary)]">{paymentLabel(row)}</div>
                        <div className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{paymentBalance(row) ? `${formatPeso(paymentBalance(row))} remaining` : "Settled"}</div>
                      </Td>
                      <Td selected={selectedRow}>
                        <span className="inline-flex min-h-11 items-center justify-start gap-2 rounded-control text-left text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">
                          {getBookingActionLabel(row)} <MoreHorizontal className="h-4 w-4" />
                        </span>
                      </Td>
                    </tr>
                  );
                }) : <tr><td colSpan={6} className="px-6 py-14 text-center text-sm text-[var(--color-text-secondary)]">No bookings match the current filters.</td></tr>}
              </tbody>
            </table>
          </div>
          {visibleRows.length > 0 ? (
            <footer className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Page {currentPage} of {pageCount} · {visibleRows.length} booking{visibleRows.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Previous page" className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label="Next page" className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          ) : null}
        </section>

      </div>
      <button
        type="button"
        aria-label="Close booking details"
        onClick={closeDetails}
        className={cn("fixed inset-0 z-40 bg-black/25 transition-opacity duration-300", detailsOpen ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside
        aria-hidden={!detailsOpen}
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-4xl border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition-transform duration-300 ease-out",
          detailsOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
      >
        {selectedRow ? <BookingDetailsPanel row={selectedRow} close={closeDetails} /> : null}
      </aside>
    </div>
  );
}

function BookingDetailsPanel({ row, close }: { row: BookingWorkspaceRow; close: () => void }) {
  const actionLabel = getBookingActionLabel(row);
  const primaryHref = row.projectReference && row.status === "confirmed" ? `/projects/${row.projectReference}` : `/booking/list/${row.reference}`;
  return (
    <div className="h-full bg-[var(--color-surface)]">
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--color-border)] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">{row.reference}</div>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em]">{row.clientName}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={statusTone(row)}>{statusLabel(row)}</Badge>
                <Badge tone={paymentLabel(row) === "Paid" ? "success" : paymentLabel(row) === "Payment issue" ? "danger" : "neutral"}>{paymentLabel(row)}</Badge>
              </div>
            </div>
            <button type="button" onClick={close} className="min-h-11 min-w-11 rounded-control border border-[var(--color-border)] text-sm font-semibold hover:bg-[var(--color-surface-muted)]" aria-label="Close details">×</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={primaryHref} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]">
              {actionLabel}
            </Link>
            <Link href={`/crm/accounts/${row.clientId}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">View client</Link>
            {row.projectReference ? <Link href={`/projects/${row.projectReference}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-surface-muted)]"><FolderKanban className="h-4 w-4" /> View project</Link> : null}
            <Link href="/payments" className="inline-flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-surface-muted)]"><ReceiptText className="h-4 w-4" /> View invoice</Link>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <Detail label="Booking type" value={bookingTypeFor(row)} icon={<CalendarDays className="h-4 w-4" />} />
            <Detail label="Booking source" value={row.kind === "reward" ? "Reward booking" : row.clientExternalRef ? "Client portal" : "Studio intake"} icon={<UserRound className="h-4 w-4" />} />
            <Detail label="Date" value={formatManilaDate(row.serviceDate)} />
            <Detail label="Time" value={`${formatManilaTime(row.serviceTime)}`} />
            <Detail label="Location" value={row.location} />
            <Detail label="Assigned staff" value={row.projectReference ? "Linked to project team" : "Unassigned"} />
            <Detail label="Service" value={row.serviceType} />
            <Detail label="Payment summary" value={`${formatPeso(row.totalAmountPhp)} total`} />
            <Detail label="Remaining balance" value={formatPeso(paymentBalance(row))} />
            <Detail label="Project" value={row.projectReference ?? "Not created"} />
            <Detail label="Invoice" value={row.invoiceReference ?? "Not issued"} />
            <Detail label="Notification state" value={row.paymongoCheckoutSessionId ? "Queued" : "Not sent"} />
          </section>

          <div className="mt-5 grid gap-4">
            <Section title="Readiness checklist">
              <ChecklistItem label="Schedule is available" state={row.status === "cancelled" ? "Not required" : "Complete"} />
              <ChecklistItem label="Client record is complete" state={row.clientEmail && row.clientPhone ? "Complete" : "Warning"} />
              <ChecklistItem label="Required contact information is present" state={row.clientPhone ? "Complete" : "Incomplete"} />
              <ChecklistItem label="Required deposit has been paid or waived" state={paymentBalance(row) === 0 ? "Complete" : "Incomplete"} />
              <ChecklistItem label="No blocking conflict exists" state={attentionRequired(row) ? "Warning" : "Complete"} />
            </Section>

            <Section title="Notes">
              <p className="text-sm text-[var(--color-text-secondary)]">Customer notes and internal notes are not yet exposed by the current booking schema. Use the booking detail page for the legacy workflow and the client record for history.</p>
            </Section>

            <Section title="Activity">
              <p className="text-sm text-[var(--color-text-secondary)]">Created {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(row.createdAt))}.</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Updated {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(row.updatedAt))}.</p>
            </Section>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <ActionLink href={`/booking/list/${row.reference}`} label="Open booking" />
            <ActionLink href={`/crm/accounts/${row.clientId}`} label="Open client" icon={<Mail className="h-4 w-4" />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 pb-3 text-sm font-semibold capitalize transition-colors",
        active
          ? "text-[#FF5300] underline decoration-[#FF5300] decoration-4 underline-offset-[6px]"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      )}
    >
      {label}
    </button>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "neutral" | "info" | "success" | "warning" | "danger" | "violet" }) {
  const style = {
    neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]",
    info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
    success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
    warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
    danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
    violet: "bg-[var(--color-indigo-100)] text-[var(--color-indigo-800)]",
  }[tone];
  return <span className={cn("rounded-pill px-2.5 py-1 text-[11px] font-semibold", style)}>{children}</span>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none"><option value="">Any</option>{options.filter((option) => option.value !== "").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <div className="rounded-control border border-[var(--color-border)] bg-[var(--color-canvas)] p-3"><div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">{icon}{label}</div><div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{value}</div></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><h3 className="font-display text-base font-semibold">{title}</h3><div className="mt-3 space-y-2">{children}</div></section>;
}

function ChecklistItem({ label, state }: { label: string; state: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-control bg-[var(--color-canvas)] px-3 py-2 text-sm"><span>{label}</span><span className="text-xs font-semibold text-[var(--color-text-secondary)]">{state}</span></div>;
}

function ActionLink({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">{icon}{label}</Link>;
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) { return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>; }
function Td({ children, selected, mono = false, className = "" }: { children: ReactNode; selected: boolean; mono?: boolean; className?: string }) { return <td className={cn("px-4 py-4 align-top text-sm", selected && "bg-[var(--color-kahel-50)]", mono && "tabular-nums", className)}>{children}</td>; }

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
