"use client";

import { Lock, Phone, MessageSquare, Mail, Plus } from "lucide-react";
import { EMERGENCY_CONTACTS } from "@/lib/sample-data";
import { useToast } from "@/components/toast/toast-provider";

export default function ProfileEmergencyPage() {
  const { fireToast } = useToast();
  const primary = EMERGENCY_CONTACTS.find((c) => c.primary) ?? EMERGENCY_CONTACTS[0];

  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="mb-4 flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
          Emergency contact
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Lock className="h-3 w-3" /> Confidential
        </span>
        <button onClick={() => fireToast("Add emergency contact form coming soon.", "info")} className="ml-auto flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
          <Plus className="h-3.5 w-3.5" /> Add contact
        </button>
      </div>

      <div className="mb-3.5 flex items-center gap-3 rounded-card border border-[var(--color-kahel-200)] bg-[var(--color-kahel-50)] px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-kahel-700)]">
            Primary emergency contact
          </div>
          <div className="mt-0.5 text-[15px] font-semibold">
            {primary.name} · {primary.rel}
          </div>
          <div className="text-[13px] text-[var(--color-text-secondary)]">{primary.phone}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {EMERGENCY_CONTACTS.map((c) => (
          <div key={c.name} className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-[18px] py-3.5">
              <span className="font-display text-[15px] font-semibold">{c.name}</span>
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: c.badgeBg, color: c.badgeColor }}
              >
                {c.badgeL}
              </span>
              <span className="text-[13px] text-[var(--color-text-secondary)]">{c.rel}</span>
              <div className="ml-auto flex gap-1.5">
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
                  <Phone className="h-3 w-3" /> Call
                </a>
                <a href={`sms:${c.phone.replace(/\s/g, "")}`} className="flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
                  <MessageSquare className="h-3 w-3" /> Message
                </a>
                <a href={`mailto:${c.email}`} className="flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
                  <Mail className="h-3 w-3" /> Email
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2">
              <Field label="Primary phone" value={c.phone} border />
              <Field label="Alternative phone" value={c.alt} />
              <Field label="Email" value={c.email} border />
              <Field label="Last verified" value={c.verified} />
              <Field label="Home address" value={c.address} border />
              <Field label="Notes" value={c.notes} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Confidential — never shown in staff lists or search. Visible to authorised Admin &amp; Super Admin when
        operationally necessary; all changes are audit-logged.
      </p>
    </div>
  );
}

function Field({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`border-b border-[var(--color-border)] px-[18px] py-3 ${border ? "border-r" : ""}`}>
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold">{value}</div>
    </div>
  );
}
