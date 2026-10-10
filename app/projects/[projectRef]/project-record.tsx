"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default function ProjectRecord({ projectRef }: { projectRef: string }) {
  return (
    <div className="mx-auto max-w-5xl p-5 pb-14 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">{projectRef}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.025em]">Project record</h1>
        </div>
        <Link href="/portal" className="inline-flex h-10 items-center gap-2 rounded-control border border-[var(--color-border-strong)] px-3.5 text-sm font-semibold text-[var(--color-kahel-700)] hover:border-[var(--color-kahel-500)]"><ExternalLink className="h-4 w-4" /> Client Portal</Link>
      </div>
      <section className="mt-8 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-display text-xl font-semibold">Client portal</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Clients access their bookings, galleries, invoices, and agreements through the unified Client Portal at <strong>/portal</strong>.</p>
        <Link href="/portal" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold hover:border-[var(--color-kahel-500)]"><ExternalLink className="h-4 w-4" /> Open Client Portal</Link>
      </section>
    </div>
  );
}
