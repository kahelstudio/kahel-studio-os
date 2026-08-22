"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import type { PromoCodeRow, PromoCodeStatus, PromoCodeType, PromoCodesWorkspaceData } from "@/lib/server/promo-codes-data";
import { cn } from "@/lib/utils";

type View = "all" | PromoCodeStatus;

const STATUS_TONE: Record<PromoCodeStatus, string> = {
  active: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  inactive: "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]",
  expired: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  exhausted: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
};

function formatPeso(centavos: number | null | undefined) {
  if (centavos == null) return "—";
  return `₱${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatValue(row: PromoCodeRow) {
  if (row.type === "percentage") return `${row.value}%`;
  if (row.type === "fixed_amount") return formatPeso(Math.round(row.value));
  return "Free add-on";
}

function typeLabel(type: PromoCodeType) {
  if (type === "percentage") return "Percentage";
  if (type === "fixed_amount") return "Fixed amount";
  return "Free add-on";
}

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function pesosToCentavos(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function centavosToPesosInput(value: number | null | undefined) {
  if (value == null) return "";
  return String(value / 100);
}

const emptyForm = {
  code: "",
  label: "",
  description: "",
  type: "percentage" as PromoCodeType,
  value: "",
  usageLimit: "",
  maxUsesPerCustomer: "1",
  validUntil: "",
  minimumBookingAmount: "",
  maximumDiscountAmount: "",
  status: "active" as PromoCodeStatus,
};

export function PromoCodesWorkspace({ initialData }: { initialData: PromoCodesWorkspaceData }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCodeRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const rows = useMemo(() => {
    return data.rows.filter((row) => {
      if (view !== "all" && row.status !== view) return false;
      if (!query.trim()) return true;
      const haystack = [row.code, row.label, row.description, row.type].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [data.rows, query, view]);

  async function refresh() {
    const response = await fetch("/api/admin/promo-codes?limit=200", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { promoCodes?: Array<Record<string, unknown>> };
    const mapped = (payload.promoCodes ?? []).map((row) => ({
      id: String(row.id),
      code: String(row.code),
      label: String(row.label),
      description: (row.description as string | null) ?? null,
      type: row.type as PromoCodeType,
      value: Number(row.value),
      currency: String(row.currency ?? "PHP"),
      status: row.status as PromoCodeStatus,
      usageLimit: (row.usage_limit as number | null) ?? null,
      usageCount: Number(row.usage_count ?? 0),
      maxUsesPerCustomer: (row.max_uses_per_customer as number | null) ?? null,
      validFrom: String(row.valid_from),
      validUntil: (row.valid_until as string | null) ?? null,
      applicableServices: (row.applicable_services as string[] | null) ?? [],
      excludedServices: (row.excluded_services as string[] | null) ?? [],
      minimumBookingAmount: (row.minimum_booking_amount as number | null) ?? null,
      maximumDiscountAmount: (row.maximum_discount_amount as number | null) ?? null,
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
    setData({
      canManage: data.canManage,
      rows: mapped,
      summary: {
        active: mapped.filter((row) => row.status === "active").length,
        inactive: mapped.filter((row) => row.status === "inactive").length,
        expired: mapped.filter((row) => row.status === "expired").length,
        exhausted: mapped.filter((row) => row.status === "exhausted").length,
        totalUses: mapped.reduce((sum, row) => sum + row.usageCount, 0),
      },
    });
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setMessage("");
  }

  function openEdit(row: PromoCodeRow) {
    setEditing(row);
    setForm({
      code: row.code,
      label: row.label,
      description: row.description ?? "",
      type: row.type,
      value: row.type === "fixed_amount" ? centavosToPesosInput(Math.round(row.value)) : String(row.value),
      usageLimit: row.usageLimit == null ? "" : String(row.usageLimit),
      maxUsesPerCustomer: row.maxUsesPerCustomer == null ? "" : String(row.maxUsesPerCustomer),
      validUntil: toDateInput(row.validUntil),
      minimumBookingAmount: centavosToPesosInput(row.minimumBookingAmount),
      maximumDiscountAmount: centavosToPesosInput(row.maximumDiscountAmount),
      status: row.status,
    });
    setFormOpen(true);
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.canManage || busy) return;

    const numericValue = Number(form.value);
    if (!form.label.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
      setMessage("Label and a positive discount value are required.");
      return;
    }
    if (!editing && form.code.trim().length < 3) {
      setMessage("Promo code must be at least 3 characters.");
      return;
    }

    const value = form.type === "fixed_amount" ? Math.round(numericValue * 100) : numericValue;
    const body = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      description: form.description.trim() || null,
      type: form.type,
      value,
      currency: "PHP",
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      maxUsesPerCustomer: form.maxUsesPerCustomer ? Number(form.maxUsesPerCustomer) : null,
      validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59+08:00`).toISOString() : null,
      minimumBookingAmount: pesosToCentavos(form.minimumBookingAmount),
      maximumDiscountAmount: pesosToCentavos(form.maximumDiscountAmount),
      status: form.status,
    };

    setBusy(true);
    setMessage("");
    const response = await fetch(editing ? `/api/admin/promo-codes/${editing.id}` : "/api/admin/promo-codes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to save promo code.");
      setBusy(false);
      return;
    }
    await refresh();
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? "Promo code updated." : "Promo code created.");
    setBusy(false);
  }

  async function retire(row: PromoCodeRow) {
    if (!data.canManage || busy) return;
    if (!window.confirm(`Retire ${row.code}? Customers will no longer be able to use it.`)) return;
    setBusy(true);
    const response = await fetch(`/api/admin/promo-codes/${row.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to retire promo code.");
      setBusy(false);
      return;
    }
    await refresh();
    setMessage(`${row.code} retired.`);
    setBusy(false);
  }

  async function toggleActive(row: PromoCodeRow) {
    if (!data.canManage || busy || row.status === "expired" || row.status === "exhausted") return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setBusy(true);
    const response = await fetch(`/api/admin/promo-codes/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to update promo code status.");
      setBusy(false);
      return;
    }
    await refresh();
    setMessage(`${row.code} marked ${nextStatus}.`);
    setBusy(false);
  }

  return (
    <div className="min-w-0 pb-14">
      <header className="app-page border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-9 pt-[34px] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em]">Promo codes</h1>
            <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Create and manage booking discounts customers can apply at checkout.</p>
          </div>
          {data.canManage ? (
            <button onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white hover:bg-[#E64B00]">
              <Plus className="h-4 w-4" /> New promo code
            </button>
          ) : null}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Active" value={String(data.summary.active)} detail={`${data.summary.totalUses} total redemptions`} />
          <Metric title="Inactive" value={String(data.summary.inactive)} detail="Paused by staff" />
          <Metric title="Expired" value={String(data.summary.expired)} detail="Retired or past validity" />
          <Metric title="Exhausted" value={String(data.summary.exhausted)} detail="Usage limit reached" />
        </div>
      </header>

      <section className="px-4 pt-5 sm:px-6 lg:px-8" aria-label="Promo code controls">
        <div className="flex items-end gap-6 overflow-x-auto">
          {(["all", "active", "inactive", "expired", "exhausted"] as View[]).map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              aria-pressed={view === item}
              className={view === item
                ? "shrink-0 pb-3 text-sm font-semibold capitalize transition-colors text-[#FF5300] underline decoration-[#FF5300] decoration-4 underline-offset-[6px]"
                : "shrink-0 pb-3 text-sm font-semibold capitalize transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }
            >
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
          <Tag className="h-4 w-4 text-[var(--color-text-muted)]" />
          <span className="sr-only">Search promo codes</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, label or description" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      </section>

      <section className="px-4 pt-4 sm:px-6 lg:px-8" aria-live="polite">
        {message ? <div className="mb-3 rounded-control bg-[var(--color-info-bg)] px-3 py-2 text-sm text-[var(--color-info-text)]">{message}</div> : null}
        {!data.canManage ? <div className="mb-3 rounded-control border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning-text)]">Only admins can create or change promo codes. You can still review existing codes.</div> : null}

        <div className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-[var(--color-canvas)] text-left text-[11px] font-semibold uppercase tracking-[.04em] text-[var(--color-text-secondary)]">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Validity</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-canvas)]">
                  <td className="px-5 py-4">
                    <strong className="font-mono tracking-wide">{row.code}</strong>
                    <span className="mt-1 block text-[var(--color-text-secondary)]">{row.label}</span>
                    {row.description ? <span className="mt-1 block text-xs text-[var(--color-text-muted)]">{row.description}</span> : null}
                  </td>
                  <td className="px-5 py-4">
                    <strong>{formatValue(row)}</strong>
                    <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">{typeLabel(row.type)}</span>
                    {row.minimumBookingAmount != null ? <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Min {formatPeso(row.minimumBookingAmount)}</span> : null}
                    {row.maximumDiscountAmount != null ? <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Cap {formatPeso(row.maximumDiscountAmount)}</span> : null}
                  </td>
                  <td className="px-5 py-4 tabular-nums">
                    {row.usageCount}{row.usageLimit != null ? ` / ${row.usageLimit}` : ""}
                    {row.maxUsesPerCustomer != null ? <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">{row.maxUsesPerCustomer}/customer</span> : null}
                  </td>
                  <td className="px-5 py-4 text-[var(--color-text-secondary)]">
                    <span className="block">From {row.validFrom.slice(0, 10)}</span>
                    <span className="mt-1 block">{row.validUntil ? `Until ${row.validUntil.slice(0, 10)}` : "No end date"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("rounded-pill px-2.5 py-1 text-xs font-semibold capitalize", STATUS_TONE[row.status])}>{row.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    {data.canManage ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.status !== "expired" && row.status !== "exhausted" ? (
                          <>
                            <button onClick={() => openEdit(row)} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold">Edit</button>
                            <button onClick={() => void toggleActive(row)} disabled={busy} className="min-h-11 rounded-control border border-[var(--color-border)] px-3 text-sm font-semibold disabled:opacity-50">
                              {row.status === "active" ? "Pause" : "Activate"}
                            </button>
                            <button onClick={() => void retire(row)} disabled={busy} className="min-h-11 rounded-control border border-[var(--color-danger)] px-3 text-sm font-semibold text-[var(--color-danger-text)] disabled:opacity-50">Retire</button>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">Read-only</span>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--color-text-secondary)]">
              {query || view !== "all" ? "No promo codes match this filter." : "No promo codes yet. Create one for staff-managed booking discounts."}
            </div>
          ) : null}
        </div>
      </section>

      {formOpen ? (
        <>
          <button aria-label="Close promo form" onClick={() => setFormOpen(false)} className="fixed inset-0 z-40 bg-black/35" />
          <aside role="dialog" aria-modal="true" aria-labelledby="promo-form-title" className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
            <form onSubmit={(event) => void submit(event)}>
              <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div>
                  <h2 id="promo-form-title" className="font-display text-2xl font-semibold">{editing ? "Edit promo code" : "New promo code"}</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Codes are normalized to uppercase and audited when created or changed.</p>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} aria-label="Close form" className="grid min-h-11 min-w-11 place-items-center rounded-control border border-[var(--color-border)]">
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Code</span>
                  <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} disabled={Boolean(editing)} required minLength={3} maxLength={32} placeholder="KAHEL40" className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-sm font-normal outline-none focus:border-[var(--color-kahel-500)] disabled:opacity-60" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Label</span>
                  <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} required maxLength={100} placeholder="Launch week 40% off" className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)] sm:col-span-2">
                  <span>Description</span>
                  <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} maxLength={500} placeholder="Optional staff note shown in the admin list" className="rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Type</span>
                  <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PromoCodeType }))} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]">
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed amount (PHP)</option>
                    <option value="free_addon">Free add-on</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>{form.type === "percentage" ? "Percent off" : form.type === "fixed_amount" ? "Amount off (PHP)" : "Value marker"}</span>
                  <input value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} required inputMode="decimal" placeholder={form.type === "percentage" ? "40" : "500"} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Total usage limit</span>
                  <input value={form.usageLimit} onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))} inputMode="numeric" placeholder="Unlimited" className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Max uses per customer</span>
                  <input value={form.maxUsesPerCustomer} onChange={(event) => setForm((current) => ({ ...current, maxUsesPerCustomer: event.target.value }))} inputMode="numeric" placeholder="Unlimited" className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Valid until</span>
                  <input type="date" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
                {editing ? (
                  <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    <span>Status</span>
                    <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PromoCodeStatus }))} className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                ) : <div />}
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Minimum booking (PHP)</span>
                  <input value={form.minimumBookingAmount} onChange={(event) => setForm((current) => ({ ...current, minimumBookingAmount: event.target.value }))} inputMode="decimal" placeholder="Optional" className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                  <span>Maximum discount (PHP)</span>
                  <input value={form.maximumDiscountAmount} onChange={(event) => setForm((current) => ({ ...current, maximumDiscountAmount: event.target.value }))} inputMode="decimal" placeholder="Optional cap" className="min-h-11 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)]" />
                </label>
              </div>

              <footer className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white disabled:opacity-50">
                    {busy ? "Saving…" : editing ? "Save changes" : "Create promo code"}
                  </button>
                  <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold">Cancel</button>
                </div>
              </footer>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[.04em] text-[var(--color-text-secondary)]">{title}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-[-.03em]">{value}</p>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{detail}</p>
    </article>
  );
}
