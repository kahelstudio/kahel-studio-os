export const dynamic = "force-dynamic";

import Link from "next/link";
import { getPortalOverview } from "@/lib/server/customer-portal-data";

const peso = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(centavos / 100);

export default async function PortalPage() {
  const data = await getPortalOverview();
  const cards = [["Bookings", data.bookingCount, "/portal/bookings"], ["Projects", data.projectCount, "/portal/projects"], ["Published galleries", data.galleryCount, "/portal/galleries"], ["Outstanding balance", peso(data.outstandingAmount), "/portal/invoices"]] as const;
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><p className="text-xs font-bold uppercase tracking-[.16em] text-kahel-700">Client Portal</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Welcome, {data.identity.firstName}.</h1><p className="mt-3 max-w-2xl text-text-secondary">Your bookings, project updates, invoices, and approved deliveries are kept here.</p><section className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, href]) => <Link key={label} href={href} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-kahel-500"><span className="text-sm text-text-secondary">{label}</span><strong className="mt-3 block font-display text-3xl">{value}</strong><span className="mt-5 block text-sm font-semibold text-kahel-700">View details</span></Link>)}</section></main>;
}
