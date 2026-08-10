"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

type EditAccountButtonProps = {
  account: { id: string; name: string; type: "consumer" | "corporate" };
  contact: { firstName: string; lastName: string; email: string; mobile: string };
};

export function EditAccountButton({ account, contact }: EditAccountButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { fireToast } = useToast();
  const [allowed, setAllowed] = useState(false);
  const [accountType, setAccountType] = useState(account.type);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/staff/me")
      .then(async (response) => response.ok ? await response.json() as { permissions?: string[] } : null)
      .then((data) => setAllowed(Boolean(data?.permissions?.includes("bookings.manage"))))
      .catch(() => setAllowed(false));
  }, []);

  if (!allowed) return null;

  const close = () => {
    if (!pending) {
      dialogRef.current?.close();
      setError("");
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/crm/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          accountName: form.get("accountName"),
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          mobile: form.get("mobile"),
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to update the account.");
      dialogRef.current?.close();
      fireToast("Account updated.", "success");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the account.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = "mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--color-kahel-500)] focus:ring-3 focus:ring-[var(--color-kahel-100)]";

  return <>
    <button type="button" onClick={() => dialogRef.current?.showModal()} className="h-[38px] rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]">
      Edit
    </button>
    <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="edit-account-title" className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg overflow-auto rounded-card bg-transparent p-0 text-[var(--color-text-primary)] backdrop:bg-black/40">
      <form onSubmit={submit} className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)]">
        <div className="flex items-start gap-3 border-b border-[var(--color-border)] p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-indigo-100)] text-[var(--color-indigo-800)]"><Users className="h-5 w-5" /></div>
          <div><h2 id="edit-account-title" className="font-display text-xl font-semibold">Edit account</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Update the account and its primary contact.</p></div>
          <button type="button" onClick={close} disabled={pending} className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block text-sm font-semibold">Account type<select value={accountType} onChange={(event) => setAccountType(event.target.value as "consumer" | "corporate")} className={inputClass}><option value="consumer">Consumer</option><option value="corporate">Corporate</option></select></label>
          {accountType === "corporate" && <label className="block text-sm font-semibold">Company name<input name="accountName" defaultValue={account.name} required minLength={2} maxLength={200} autoComplete="organization" className={inputClass} /></label>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">First name<input name="firstName" defaultValue={contact.firstName} required maxLength={100} autoComplete="given-name" className={inputClass} /></label>
            <label className="block text-sm font-semibold">Last name<input name="lastName" defaultValue={contact.lastName} required maxLength={100} autoComplete="family-name" className={inputClass} /></label>
          </div>
          <label className="block text-sm font-semibold">Email<input name="email" type="email" defaultValue={contact.email} required maxLength={320} autoComplete="email" className={inputClass} /></label>
          <label className="block text-sm font-semibold">Mobile<input name="mobile" type="tel" defaultValue={contact.mobile} required autoComplete="tel" className={inputClass} /></label>
          {error && <p className="rounded-control bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger-text)]" role="alert">{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={pending} className="min-h-11 rounded-control border border-[var(--color-border)] px-4 text-sm font-semibold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={pending} className="min-h-11 rounded-control bg-[var(--color-kahel-500)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-kahel-600)] disabled:opacity-60">{pending ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </dialog>
  </>;
}
