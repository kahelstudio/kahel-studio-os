"use client";

import Link from "next/link";
import { useState } from "react";

export function PortalAgreementAcceptance({ bookingId, versionId, contentHash, versionLabel, effectiveDate }: { bookingId: string; versionId: string; contentHash: string; versionLabel: string; effectiveDate: string }) {
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const submit = async () => {
    if (!accepted || state === "submitting") return;
    setState("submitting");
    const response = await fetch(`/api/customer/bookings/${bookingId}/agreement`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ accepted: true, versionId, contentHash }) });
    setState(response.ok ? "done" : "error");
    if (response.ok) window.location.reload();
  };
  return <section className="mt-6 rounded-xl border border-[#FF5300]/30 bg-kahel-100 p-5"><h2 className="font-display text-xl font-semibold">Acceptance required</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Review version {versionLabel}, effective {effectiveDate}, before this booking can satisfy its agreement requirement.</p><label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3"><input className="mt-1 h-5 w-5 accent-[#FF5300]" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span className="text-sm leading-6">I have read and agree to the Kahel Studio <Link className="font-semibold text-[#FF5300] underline underline-offset-4" href="/booking-terms" target="_blank">Booking Terms and Conditions</Link>.</span></label>{state === "error" ? <p role="alert" className="mt-2 text-sm text-danger">Acceptance could not be saved. Try again.</p> : null}<button type="button" disabled={!accepted || state === "submitting"} onClick={submit} className="mt-4 min-h-11 rounded-md bg-[#FF5300] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{state === "submitting" ? "Saving acceptance…" : "Accept terms"}</button></section>;
}
