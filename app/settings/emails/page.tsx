"use client";

import { useState } from "react";
import Image from "next/image";
import { TRANSACTIONAL_EMAILS, type TransactionalEmailTemplate } from "@/lib/transactional-emails";

const previewValues: Record<string, string> = {
  booking_id: "KS-2026-0149",
  customer_name: "Alex Rivera",
  customer_email: "alex.rivera@example.com",
  customer_phone: "+63 912 345 6789",
  service_name: "Portrait Session",
  booking_date: "02 August 2026",
  booking_time: "2:00 PM",
  submitted_at: "28 July 2026, 10:15 AM",
  package_price: "PHP 8,000",
  addons_total: "PHP 1,500",
  subtotal: "PHP 9,500",
  downpayment_required: "PHP 4,750",
  amount_paid: "PHP 4,500",
  balance_due: "PHP 4,500",
  payment_method: "GCash",
  transaction_id: "TXN-2026-07-8842",
  addon_prints: "PHP 800",
  addon_frame: "PHP 500",
  addon_makeup: "PHP 0",
  addon_extra_photos: "PHP 200",
  google_maps_url: "https://maps.google.com/?q=Kahel+Studio+Tabaco",
  google_maps_qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Kahel+Studio",
  wifi_qr_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WiFi+Kahel",
  agree_url: "https://portal.kahelstudio.com/agree/KS-2026-0149",
  decline_url: "https://portal.kahelstudio.com/decline/KS-2026-0149",
  reschedule_url: "https://portal.kahelstudio.com/reschedule/KS-2026-0149",
  confirm_url: "https://portal.kahelstudio.com/confirm/KS-2026-0149",
  browse_url: "https://kahelstudio.com/book",
  payment_url: "https://pay.kahelstudio.com/KS-2026-0149",
  slot_expiry: "26 July 2026, 10:15 AM",
  waitlist_position: "3",
  new_date: "16 August 2026",
  new_time: "10:00 AM",
  cancellation_reason: "Schedule conflict — the couple postponed to 2027.",
};

export default function SettingsEmailsPage() {
  const [selected, setSelected] = useState(TRANSACTIONAL_EMAILS[0]);
  const clientTemplates = TRANSACTIONAL_EMAILS.filter((email) => email.audience === "Client");
  const internalTemplates = TRANSACTIONAL_EMAILS.filter((email) => email.audience === "Internal");

  return (
    <div className="max-w-[1360px] p-4 pt-6 sm:p-6 lg:p-8 xl:p-10 xl:pt-8">
      <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Email templates</h1>
      <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">{TRANSACTIONAL_EMAILS.length} transactional templates for client and studio notifications</p>
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="max-h-[360px] overflow-y-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] xl:max-h-none xl:overflow-hidden">
          <TemplateGroup label="Client emails" templates={clientTemplates} selected={selected} onSelect={setSelected} />
          <TemplateGroup label="Internal alerts" templates={internalTemplates} selected={selected} onSelect={setSelected} />
        </aside>
        <section className="min-w-0 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
          <div className="flex items-start justify-between gap-5">
            <div><div className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">{selected.audience}</div><h2 className="mt-1 font-display text-2xl font-semibold">{selected.name}</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Trigger: {selected.trigger}</p></div>
            <div className="rounded-pill bg-[var(--color-kahel-50)] px-3 py-1.5 text-xs font-semibold text-[var(--color-kahel-700)]">Active template</div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <EmailPreview template={selected} />
            <div><h3 className="font-display text-sm font-semibold">Merge fields</h3><p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">Populate these values when sending this email.</p><div className="mt-3 flex flex-wrap gap-1.5">{selected.fields.map((field) => <code key={field} className="rounded bg-[var(--color-canvas)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)]">{`{{ ${field} }}`}</code>)}</div></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TemplateGroup({ label, templates, selected, onSelect }: { label: string; templates: TransactionalEmailTemplate[]; selected: TransactionalEmailTemplate; onSelect: (template: TransactionalEmailTemplate) => void }) {
  return <div className="border-b border-[var(--color-border)] p-3 last:border-b-0"><div className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">{label}</div>{templates.map((template) => <button key={template.id} onClick={() => onSelect(template)} className={`mb-0.5 w-full rounded-control px-2 py-2 text-left text-[13px] font-medium ${selected.id === template.id ? "bg-[var(--color-kahel-50)] text-[var(--color-kahel-700)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas)]"}`}>{template.name}</button>)}</div>;
}

function EmailPreview({ template }: { template: TransactionalEmailTemplate }) {
  const internal = template.audience === "Internal";

  function resolveAction() {
    if (!template.action) return null;
    if (template.action.startsWith("http")) return template.action;
    return previewValues[template.action] ?? `{{ ${template.action} }}`;
  }

  return <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[#ECEAE4] p-5"><div className="mx-auto max-w-[620px] overflow-hidden rounded-xl bg-white shadow-sm"><div className={internal ? "bg-[var(--color-kahel-500)] px-8 py-6" : "bg-[#1A1916] px-8 py-6"}><Image src={internal ? "/kahelstudio-logo_b.svg" : "/kahelstudio-logo_w.svg"} alt="Kahel Studio" width={220} height={32} className="h-8 w-auto" /></div><div className={`h-1 ${internal ? "bg-[#1A1916]" : "bg-[var(--color-kahel-500)]"}`} /><div className="p-8"><div className="text-xs text-[var(--color-text-muted)]">SUBJECT</div><div className="mt-1 text-sm font-semibold">{template.subject}</div><div className="mt-2 text-xs text-[var(--color-text-muted)]">{template.preheader}</div><h3 className="mt-6 font-display text-2xl font-semibold text-[#1A1916]">{template.heading}</h3><div className="mt-4 rounded-lg bg-[#F5F3EF] p-3"><div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A8A69E]">Booking reference</div><div className="mt-1 text-sm font-bold text-[#1A1916]">{previewValues.booking_id}</div></div><p className="mt-5 text-sm leading-6 text-[#6B6860]">Hi <strong className="text-[#1A1916]">{previewValues.customer_name}</strong>, {template.message}</p>{(() => { const url = resolveAction(); return url ? <a href={url} className="mt-5 inline-block rounded-full bg-[var(--color-kahel-500)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--color-kahel-600)]">{template.actionLabel}</a> : null; })()}<div className="mt-7 border-t border-[#E4E2DC] pt-4 text-xs text-[#A8A69E]">Need help? <span className="text-[var(--color-kahel-500)]">booking@example.com</span></div></div></div></div>;
}
