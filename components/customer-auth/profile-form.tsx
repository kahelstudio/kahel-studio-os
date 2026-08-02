"use client";

import { useState, type FormEvent } from "react";

export function ProfileForm({ firstName: initialFirstName, lastName: initialLastName, mobile: initialMobile }: { firstName: string; lastName: string; mobile: string | null }) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [mobile, setMobile] = useState(initialMobile ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/customer/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, lastName, mobile }) });
      setMessage(response.ok ? "Profile updated." : "Unable to update your profile.");
    } catch { setMessage("Unable to update your profile."); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="grid max-w-xl gap-5 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2 sm:p-7">
    <label className="grid gap-2 text-sm font-semibold">First name<input className="h-12 rounded-md border border-border-strong bg-surface px-3 text-base outline-none focus:border-kahel-500 focus:ring-3 focus:ring-kahel-500/20" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required /></label>
    <label className="grid gap-2 text-sm font-semibold">Last name<input className="h-12 rounded-md border border-border-strong bg-surface px-3 text-base outline-none focus:border-kahel-500 focus:ring-3 focus:ring-kahel-500/20" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required /></label>
    <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Mobile number<input className="h-12 rounded-md border border-border-strong bg-surface px-3 text-base outline-none focus:border-kahel-500 focus:ring-3 focus:ring-kahel-500/20" value={mobile} onChange={(event) => setMobile(event.target.value)} autoComplete="tel" inputMode="tel" required /></label>
    <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><button className="min-h-11 rounded-md bg-kahel-500 px-5 font-semibold text-white hover:bg-kahel-600 disabled:opacity-60" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>{message && <p role="status" className="text-sm text-text-secondary">{message}</p>}</div>
  </form>;
}
