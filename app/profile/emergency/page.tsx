"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Lock, Phone, MessageSquare, Mail, Plus, UserRound, X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

type Contact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  created_at: string;
};

export default function ProfileEmergencyPage() {
  const { fireToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/staff/emergency-contacts")
      .then(async (response) => {
        const result = await response.json() as { contacts?: Contact[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to load emergency contacts.");
        if (active) setContacts(result.contacts ?? []);
      })
      .catch((error: unknown) => { if (active) fireToast(error instanceof Error ? error.message : "Unable to load emergency contacts.", "danger"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fireToast]);

  return (
    <div className="max-w-[900px] p-5 pt-7 sm:p-12 sm:pt-9">
      <div className="mb-4 flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)]">Emergency contact</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"><Lock className="h-3 w-3" /> Confidential</span>
        {contacts.length > 0 && <button type="button" onClick={() => setOpen(true)} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"><Plus className="h-3.5 w-3.5" /> Add contact</button>}
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-card border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-16 text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No emergency contacts yet</p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Add someone we can reach in case of an emergency.</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-5 flex min-h-11 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"><Plus className="h-3.5 w-3.5" /> Add contact</button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)}
        </div>
      )}

      <p className="mt-2.5 text-xs leading-5 text-[var(--color-text-muted)]">Confidential — never shown in staff lists or search. Visible to authorised Admin &amp; Super Admin when operationally necessary; all changes are audit-logged.</p>
      {open && <ContactDialog onClose={() => setOpen(false)} onAdded={(contact) => { setContacts((current) => [...current, contact]); setOpen(false); fireToast("Emergency contact added.", "success"); }} />}
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <article className="flex flex-col gap-4 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-kahel-100)] text-[var(--color-kahel-700)]"><UserRound className="h-5 w-5" /></div>
        <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{contact.name}</h2><p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{contact.relationship} · {contact.phone}</p></div>
      </div>
      <ContactActions phone={contact.phone} email={contact.email} />
    </article>
  );
}

function ContactActions({ phone, email }: { phone: string; email: string | null }) {
  const compactPhone = phone.replace(/[^+\d]/g, "");
  const actionClass = "flex min-h-10 items-center gap-1 rounded-control border border-[var(--color-border-strong)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-kahel-500)] hover:text-[var(--color-kahel-700)]";
  return <div className="flex flex-wrap gap-1.5 sm:ml-auto"><a href={`tel:${compactPhone}`} className={actionClass}><Phone className="h-3 w-3" /> Call</a><a href={`sms:${compactPhone}`} className={actionClass}><MessageSquare className="h-3 w-3" /> Message</a>{email && <a href={`mailto:${email}`} className={actionClass}><Mail className="h-3 w-3" /> Email</a>}</div>;
}

function ContactDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (contact: Contact) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/staff/emergency-contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), relationship: form.get("relationship"), phone: form.get("phone"), email: form.get("email") }) });
      const result = await response.json() as { contact?: Contact; error?: string };
      if (!response.ok || !result.contact) throw new Error(result.error ?? "Unable to add the emergency contact.");
      onAdded(result.contact);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add the emergency contact.");
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)] focus:ring-3 focus:ring-[var(--color-kahel-100)]";
  return <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }} aria-labelledby="add-contact-title" className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md overflow-auto rounded-card bg-transparent p-0 text-[var(--color-text-primary)] backdrop:bg-black/40"><form onSubmit={submit} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]"><div className="flex items-start gap-3 border-b border-[var(--color-border)] p-5"><div><h2 id="add-contact-title" className="font-display text-xl font-semibold">Add emergency contact</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Add someone the studio can contact in an emergency.</p></div><button type="button" onClick={onClose} disabled={submitting} className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5"><label className="block text-sm font-semibold">Full name<input name="name" autoFocus required minLength={2} maxLength={120} autoComplete="name" className={inputClass} /></label><label className="block text-sm font-semibold">Relationship<input name="relationship" required minLength={2} maxLength={80} placeholder="e.g. Parent, spouse, sibling" className={inputClass} /></label><label className="block text-sm font-semibold">Phone number<input name="phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" placeholder="+63 912 345 6789" className={inputClass} /></label><label className="block text-sm font-semibold">Email <span className="font-normal text-[var(--color-text-muted)]">(optional)</span><input name="email" type="email" maxLength={254} autoComplete="email" className={inputClass} /></label>{error && <p role="alert" className="text-sm font-medium text-[var(--color-danger-text)]">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-[var(--color-border)] p-5"><button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">Cancel</button><button disabled={submitting} className="min-h-11 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60">{submitting ? "Adding..." : "Add contact"}</button></div></form></dialog>;
}
