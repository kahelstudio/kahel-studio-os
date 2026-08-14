import Link from "next/link";
import type { PublishedBookingTerms } from "@/lib/legal-documents";

const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(new Date(`${value}T00:00:00+08:00`));

export function LegalDocument({ terms, acceptedAt }: { terms: PublishedBookingTerms; acceptedAt?: string | null }) {
  return <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
    <header className="border-b border-border pb-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF5300]">Kahel Studio legal</p>
      <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">{terms.title}</h1>
      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm text-text-secondary">
        <div><dt className="font-semibold text-text-primary">Version</dt><dd>{terms.versionLabel}</dd></div>
        <div><dt className="font-semibold text-text-primary">Effective date</dt><dd>{date(terms.effectiveDate)}</dd></div>
        <div><dt className="font-semibold text-text-primary">Last updated</dt><dd>{date(terms.updatedAt.slice(0, 10))}</dd></div>
        {acceptedAt ? <div><dt className="font-semibold text-text-primary">Accepted</dt><dd>{new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(acceptedAt))}</dd></div> : null}
      </dl>
    </header>
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav className="rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-6" aria-label="Table of contents">
        <h2 className="font-display text-lg font-semibold">Contents</h2>
        <ol className="mt-4 grid gap-2 text-sm text-text-secondary">{terms.sections.map((section) => <li key={section.number}><a className="block rounded-md py-1 hover:text-[#FF5300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5300]" href={`#section-${section.number}`}>{section.number}. {section.title}</a></li>)}</ol>
      </nav>
      <div className="min-w-0">
        <aside className="rounded-xl border border-[#FF5300]/30 bg-kahel-100 p-5 text-base leading-7 text-text-primary"><strong>This summary does not replace the complete terms.</strong><ul className="mt-3 list-disc space-y-2 pl-5">{terms.summary.map((item) => <li key={item}>{item}</li>)}</ul></aside>
        <div className="mt-10 space-y-10">{terms.sections.map((section) => <section id={`section-${section.number}`} className="scroll-mt-8" key={section.number}><h2 className="font-display text-2xl font-semibold">{section.number}. {section.title}</h2><p className="mt-4 text-base leading-8 text-text-secondary">{section.text}</p></section>)}</div>
        <section className="mt-12 border-t border-border pt-8"><h2 className="font-display text-2xl font-semibold">Contact Kahel Studio</h2><p className="mt-3 text-base leading-7 text-text-secondary">Questions about a booking may be sent to <a className="font-semibold text-[#FF5300] underline underline-offset-4" href="mailto:customercare@kahelstudio.com">customercare@kahelstudio.com</a>. Privacy questions are covered by the separate <Link className="font-semibold text-[#FF5300] underline underline-offset-4" href="/privacy">Privacy Notice</Link>.</p></section>
      </div>
    </div>
  </article>;
}
