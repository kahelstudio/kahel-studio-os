"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REWARD_SERVICE = "complimentary-solo-session";

type Availability = {
  timezone: string;
  refreshAfterSeconds: number;
  slots: Array<{ startsAt: string; time: string; available: boolean }>;
};

function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function slotLabel(startsAt: string, timezone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

export function RewardBookingForm({ rewards }: { rewards: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const ownerKey = useRef(crypto.randomUUID());
  const [rewardId, setRewardId] = useState(rewards[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("Kahel Studio");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState("");
  const [holdSeconds, setHoldSeconds] = useState(0);

  function resetSubmissionKey() {
    idempotencyKey.current = crypto.randomUUID();
    ownerKey.current = crypto.randomUUID();
  }

  useEffect(() => {
    if (!holdExpiresAt) return;
    const tick = () => setHoldSeconds(Math.max(0, Math.ceil((Date.parse(holdExpiresAt) - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [holdExpiresAt]);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    fetch(`/api/paymongo/availability?service=${REWARD_SERVICE}&date=${encodeURIComponent(date)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as Partial<Availability> & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Availability could not be loaded.");
        if (typeof result.timezone !== "string" || !Array.isArray(result.slots)) throw new Error("Availability could not be loaded.");
        const nextAvailability = result as Availability;
        setAvailability(nextAvailability);
        setStartsAt((current) => nextAvailability.slots.some((slot) => slot.available && slot.startsAt === current) ? current : "");
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setAvailability(null);
        setAvailabilityError(loadError instanceof Error ? loadError.message : "Availability could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, refreshVersion]);

  useEffect(() => {
    if (!date) return;
    const refresh = () => {
      setLoading(true);
      setAvailabilityError("");
      setRefreshVersion((version) => version + 1);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [date]);

  useEffect(() => {
    if (!date || !availability?.refreshAfterSeconds) return;
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        setAvailabilityError("");
        setRefreshVersion((version) => version + 1);
      },
      Math.max(5, availability.refreshAfterSeconds) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [availability, date]);

  async function submit(formData: FormData) {
    if (!startsAt) {
      setError("Choose an available time.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const holdResponse = await fetch("/api/bookings/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: REWARD_SERVICE, startsAt, ownerKey: ownerKey.current, idempotencyKey: `${idempotencyKey.current}:hold` }),
      });
      const hold = await holdResponse.json().catch(() => ({})) as { holdId?: string; expiresAt?: string; error?: string; conflict?: boolean };
      if (!holdResponse.ok || !hold.holdId || !hold.expiresAt) {
        setError(hold.error ?? "Unable to reserve this time.");
        if (holdResponse.status === 409 || hold.conflict) {
          setStartsAt("");
          resetSubmissionKey();
          setRefreshVersion((version) => version + 1);
        }
        return;
      }
      setHoldExpiresAt(hold.expiresAt);
      const response = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId,
          startsAt,
          holdId: hold.holdId,
          holdOwnerKey: ownerKey.current,
          location: formData.get("location"),
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const result = await response.json().catch(() => ({})) as { bookingRef?: string; error?: string; conflict?: boolean };
      if (!response.ok) {
        setError(result.error ?? "Unable to reserve your reward.");
        if (result.conflict) {
          void fetch("/api/bookings/holds", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holdId: hold.holdId, ownerKey: ownerKey.current }) });
          setStartsAt("");
          setHoldExpiresAt("");
          resetSubmissionKey();
          setLoading(true);
          setAvailabilityError("");
          setRefreshVersion((version) => version + 1);
        }
        return;
      }
      router.push(`/portal/bookings?reward=${encodeURIComponent(result.bookingRef ?? "reserved")}`);
      router.refresh();
    } catch {
      setError("Unable to reach the booking service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const availableSlots = availability?.slots.filter((slot) => slot.available) ?? [];

  return <form action={submit} className="mt-8 space-y-5 rounded-xl border border-border bg-surface p-5 sm:p-7">
    <label className="block text-sm font-semibold">Available reward<select name="rewardId" required value={rewardId} onChange={(event) => { setRewardId(event.target.value); resetSubmissionKey(); }} className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal">{rewards.map((reward) => <option key={reward.id} value={reward.id}>{reward.label}</option>)}</select></label>
    <label className="block text-sm font-semibold">Session date<input name="date" type="date" required min={todayInManila()} value={date} onChange={(event) => { setDate(event.target.value); setStartsAt(""); setAvailability(null); setAvailabilityError(""); setLoading(Boolean(event.target.value)); setError(""); resetSubmissionKey(); }} className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label>
    <fieldset className="space-y-3" aria-describedby="slot-status">
      <legend className="text-sm font-semibold">Available times</legend>
      <div id="slot-status" role="status" aria-live="polite" className="text-sm text-text-secondary">
        {!date ? "Choose a date to see live availability." : loading && !availability ? "Loading available times..." : availabilityError ? availabilityError : availability?.slots.length === 0 ? "The studio is closed on this date." : availableSlots.length === 0 ? "No times remain available on this date." : `${availableSlots.length} ${availableSlots.length === 1 ? "time" : "times"} available. Times shown are Asia/Manila.`}
      </div>
      {availabilityError ? <button type="button" onClick={() => { setLoading(true); setAvailabilityError(""); setRefreshVersion((version) => version + 1); }} className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5300]">Try loading times again</button> : null}
      {availability?.slots.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Session times">
        {availability.slots.map((slot) => {
          const label = slotLabel(slot.startsAt, availability.timezone);
          const selected = startsAt === slot.startsAt;
          return <button key={slot.startsAt} type="button" disabled={!slot.available || submitting} aria-pressed={selected} aria-label={`${label}${slot.available ? "" : ", unavailable"}`} onClick={() => { setStartsAt(slot.startsAt); setError(""); resetSubmissionKey(); }} className={`min-h-11 rounded-control border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5300] disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-[#FF5300] bg-[#FF5300] text-white" : "border-border bg-surface"}`}>{label}</button>;
        })}
      </div> : null}
      {loading && availability ? <p className="text-xs text-text-secondary">Refreshing availability...</p> : null}
    </fieldset>
    <label className="block text-sm font-semibold">Location<input name="location" required value={location} onChange={(event) => { setLocation(event.target.value); resetSubmissionKey(); }} className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-normal" /></label>
    {holdExpiresAt && submitting ? <p role="status" className="text-sm font-semibold">This time is reserved for you for {Math.floor(holdSeconds / 60)}:{String(holdSeconds % 60).padStart(2, "0")} minutes.</p> : null}
    <div className="rounded-control bg-surface-muted p-4 text-sm text-text-secondary"><strong className="text-text-primary">Covered by reward: PHP 1,500 Solo Session.</strong><br />Upgrades, add-ons, prints, extra edits, and unrelated fees are not covered.</div>
    <label className="flex gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1 h-5 w-5 accent-[#FF5300]" /><span>I have read the <a href="/portal/loyalty/terms" className="font-semibold text-kahel-700 underline">loyalty terms and conditions</a>.</span></label>
    {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    <button disabled={submitting || !startsAt || loading} className="min-h-11 rounded-control bg-[#FF5300] px-5 text-sm font-semibold text-white hover:bg-kahel-600 disabled:opacity-60">{submitting ? "Reserving..." : "Book your free session"}</button>
  </form>;
}
