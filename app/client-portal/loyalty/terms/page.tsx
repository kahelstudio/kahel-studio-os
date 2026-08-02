import type { Metadata } from "next";
import { Email } from "@/components/ui/email";
import Image from "next/image";
import Link from "next/link";
import { LOYALTY_TERMS } from "./terms-data";

export const metadata: Metadata = {
  title: "Loyalty Program Terms | Kahel Studio",
  description: "Terms for the Kahel Studio Loyalty Rewards program.",
  robots: { index: false, follow: false },
};

function formatEffectiveDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export default function LoyaltyTermsPage() {
  return (
    <main className="min-h-dvh bg-[var(--color-canvas)] px-5 py-8 font-sans text-[var(--color-text-primary)] sm:px-8 sm:py-12">
      <article className="mx-auto max-w-[780px]">
        <header className="border-b border-[var(--color-border)] pb-8">
          <Link href="/portal/loyalty" aria-label="Kahel Studio client portal loyalty rewards" className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30">
            <Image src="/kahelstudio-logo_b.svg" alt="Kahel Studio" width={137} height={20} className="h-5 w-auto dark:invert" />
          </Link>
          <p className="mt-8 font-display text-[13px] font-semibold uppercase tracking-[.16em] text-[#FF5300]">Client loyalty program</p>
          <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight tracking-[-.03em] sm:text-[46px]">{LOYALTY_TERMS.programName} terms</h1>
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Version {LOYALTY_TERMS.version} · Effective {formatEffectiveDate(LOYALTY_TERMS.effectiveDate)}</p>
        </header>

        <aside className="mt-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-warning-bg)] p-5 text-sm leading-6 text-[var(--color-warning-text)]" aria-label="Review disclaimer">
          <strong className="font-semibold">Business and legal review required.</strong> {LOYALTY_TERMS.disclaimer}
        </aside>

        <div className="mt-9 space-y-8">
          {LOYALTY_TERMS.terms.map((term) => (
            <section key={term.title} aria-labelledby={`term-${term.title.split(".")[0]}`}>
              <h2 id={`term-${term.title.split(".")[0]}`} className="font-display text-xl font-semibold tracking-[-.015em]">{term.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-[var(--color-text-secondary)]">{term.body}</p>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-[var(--color-border)] py-7 text-sm text-[var(--color-text-muted)]">
          Questions about these terms? <Email local="hello" domain="kahelstudio.com" label="Contact Kahel Studio" className="inline-flex min-h-11 items-center font-semibold text-[var(--color-kahel-700)] underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30" />.
        </footer>
      </article>
    </main>
  );
}
