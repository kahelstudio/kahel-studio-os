"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

export function NewAccountButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { fireToast } = useToast();

  return <><button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-1.5 rounded-control bg-[var(--color-kahel-500)] px-4 font-display text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)]"><Plus className="h-4 w-4" /> New account</button>{open && <NewAccountDialog onClose={() => setOpen(false)} onCreated={(id) => { setOpen(false); fireToast("Account created.", "success"); router.push(`/crm/accounts/${id}`); router.refresh(); }} />}</>;
}

function NewAccountDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [accountType, setAccountType] = useState("consumer");
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
      const response = await fetch("/api/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType, accountName: form.get("accountName"), firstName: form.get("firstName"), lastName: form.get("lastName"), email: form.get("email"), mobile: form.get("mobile") }),
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Unable to create the account.");
      onCreated(result.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the account.");
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)] focus:ring-3 focus:ring-[var(--color-kahel-100)]";
  return <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }} aria-labelledby="new-account-title" className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg overflow-auto rounded-card bg-transparent p-0 text-[var(--color-text-primary)] backdrop:bg-black/40"><form onSubmit={submit} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]"><div className="flex items-start gap-3 border-b border-[var(--color-border)] p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-indigo-100)] text-[var(--color-indigo-800)]"><Users className="h-5 w-5" /></div><div><h2 id="new-account-title" className="font-display text-xl font-semibold">New account</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Create an account and its primary contact.</p></div><button type="button" onClick={onClose} disabled={submitting} className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5"><label className="block text-sm font-semibold">Account type<select value={accountType} onChange={(event) => setAccountType(event.target.value)} className={inputClass}><option value="consumer">Consumer</option><option value="corporate">Corporate</option></select></label>{accountType === "corporate" && <label className="block text-sm font-semibold">Company name<input name="accountName" autoFocus required minLength={2} maxLength={200} autoComplete="organization" className={inputClass} /></label>}<div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">First name<input name="firstName" autoFocus={accountType === "consumer"} required maxLength={100} autoComplete="given-name" className={inputClass} /></label><label className="block text-sm font-semibold">Last name<input name="lastName" required maxLength={100} autoComplete="family-name" className={inputClass} /></label></div><label className="block text-sm font-semibold">Email<input name="email" type="email" required maxLength={320} autoComplete="email" className={inputClass} /></label><label className="block text-sm font-semibold">Mobile number<input name="mobile" type="tel" required minLength={7} maxLength={32} autoComplete="tel" placeholder="+63 912 345 6789" className={inputClass} /></label>{error && <p role="alert" className="text-sm font-medium text-[var(--color-danger-text)]">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-[var(--color-border)] p-5"><button type="button" onClick={onClose} disabled={submitting} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">Cancel</button><button disabled={submitting} className="min-h-11 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60">{submitting ? "Creating..." : "Create account"}</button></div></form></dialog>;
}
