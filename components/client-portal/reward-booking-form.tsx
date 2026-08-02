"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RewardBookingForm({ rewards }: { rewards: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/loyalty/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rewardId: formData.get("rewardId"),
        date: formData.get("date"),
        time: formData.get("time"),
        location: formData.get("location"),
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const result = await response.json() as { bookingRef?: string; error?: string };
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to reserve your reward.");
      return;
    }
    router.push(`/portal/bookings?reward=${encodeURIComponent(result.bookingRef ?? "reserved")}`);
    router.refresh();
  }

  return <form action={submit} className="mt-8 space-y-5 rounded-xl border border-border bg-surface p-5 sm:p-7">
    <label className="block text-sm font-semibold">Available reward<select name="rewardId" required className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal">{rewards.map((reward) => <option key={reward.id} value={reward.id}>{reward.label}</option>)}</select></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">Preferred date<input name="date" type="date" required className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label><label className="block text-sm font-semibold">Preferred time<input name="time" type="time" required className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label></div>
    <label className="block text-sm font-semibold">Location<input name="location" required defaultValue="Kahel Studio" className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label>
    <div className="rounded-control bg-surface-muted p-4 text-sm text-text-secondary"><strong className="text-text-primary">Covered by reward: PHP 1,500 Solo Session.</strong><br />Upgrades, add-ons, prints, extra edits, and unrelated fees are not covered.</div>
    <label className="flex gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1 h-5 w-5 accent-[#FF5300]" /><span>I have read the <a href="/portal/loyalty/terms" className="font-semibold text-kahel-700 underline">loyalty terms and conditions</a>.</span></label>
    {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    <button disabled={submitting} className="min-h-11 rounded-control bg-[#FF5300] px-5 text-sm font-semibold text-white hover:bg-kahel-600 disabled:opacity-60">{submitting ? "Reserving..." : "Book your free session"}</button>
  </form>;
}
