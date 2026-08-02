import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CustomerSignOutButton } from "@/components/customer-auth/customer-sign-out-button";
import { requireCustomerIdentity } from "@/lib/server/customer-auth";

export const metadata: Metadata = { title: "Client Portal | Kahel Studio", robots: { index: false, follow: false } };

const links = [
  ["Overview", "/portal"],
  ["Bookings", "/portal/bookings"],
  ["Projects", "/portal/projects"],
  ["Galleries", "/portal/galleries"],
  ["Invoices", "/portal/invoices"],
  ["Loyalty rewards", "/portal/loyalty"],
  ["Profile", "/portal/profile"],
] as const;

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const customer = await requireCustomerIdentity("/portal");
  return <div className="min-h-dvh bg-canvas text-text-primary">
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-5 px-4 sm:px-6">
        <Link href="/" aria-label="Kahel Studio home"><Image src="/kahelstudio-logo_b.svg" alt="Kahel Studio" width={150} height={22} /></Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Client Portal">{links.map(([label, href]) => <Link key={href} className="min-h-11 rounded-md px-3 py-3 text-sm font-semibold hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30" href={href}>{label}</Link>)}</nav>
        <div className="hidden text-sm sm:block"><strong>{customer.firstName}</strong><span className="block text-xs text-text-muted">Customer</span></div>
        <CustomerSignOutButton />
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Client Portal mobile">{links.map(([label, href]) => <Link key={href} className="min-h-11 shrink-0 px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30" href={href}>{label}</Link>)}</nav>
    </header>
    {children}
  </div>;
}
