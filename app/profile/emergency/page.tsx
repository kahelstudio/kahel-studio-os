"use client";

import { Lock, Phone, MessageSquare, Mail, Plus } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

export default function ProfileEmergencyPage() {
  const { fireToast } = useToast();

  return (
    <div className="max-w-[900px] p-12 pt-9">
      <div className="mb-4 flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">
          Emergency contact
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Lock className="h-3 w-3" /> Confidential
        </span>
        <button
          onClick={() => fireToast("Emergency contacts coming soon.", "info")}
          className="ml-auto flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]"
        >
          <Plus className="h-3.5 w-3.5" /> Add contact
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">No emergency contacts yet</p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Add someone we can reach in case of an emergency.
        </p>
        <button
          onClick={() => fireToast("Emergency contacts coming soon.", "info")}
          className="mt-5 flex h-9 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"
        >
          <Plus className="h-3.5 w-3.5" /> Add contact
        </button>
      </div>

      <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
        Confidential — never shown in staff lists or search. Visible to authorised Admin &amp; Super Admin when
        operationally necessary; all changes are audit-logged.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ContactActions({ phone, email }: { phone: string; email: string }) {
  return (
    <div className="flex gap-1.5">
      <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
        <Phone className="h-3 w-3" /> Call
      </a>
      <a href={`sms:${phone.replace(/\s/g, "")}`} className="flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
        <MessageSquare className="h-3 w-3" /> Message
      </a>
      <a href={`mailto:${email}`} className="flex h-[30px] items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]">
        <Mail className="h-3 w-3" /> Email
      </a>
    </div>
  );
}
