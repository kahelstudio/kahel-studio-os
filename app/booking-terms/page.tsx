import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal/legal-document";
import { PrintLegalDocument } from "@/components/legal/print-legal-document";
import { getCurrentBookingTerms } from "@/lib/server/legal-documents";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Terms and Conditions", description: "Current Kahel Studio booking policies.", alternates: { canonical: "/booking-terms" } };

export default async function BookingTermsPage() {
  const terms = await getCurrentBookingTerms();
  if (!terms) return <main className="min-h-dvh bg-canvas px-4 py-16 text-text-primary"><div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF5300]">Kahel Studio legal</p><h1 className="mt-3 font-display text-4xl font-semibold">Booking terms unavailable</h1><p className="mt-4 text-base leading-7 text-text-secondary">There is no currently published Booking Terms and Conditions version. New online booking payment cannot continue until an approved version is available.</p><Link href="/book" className="mt-7 inline-flex min-h-11 items-center rounded-md bg-[#FF5300] px-4 font-semibold text-white">Return to booking</Link></div></main>;
  return <main className="min-h-dvh bg-canvas text-text-primary"><div className="mx-auto flex max-w-6xl justify-end px-4 pt-6 sm:px-6"><PrintLegalDocument /></div><LegalDocument terms={terms} /></main>;
}
