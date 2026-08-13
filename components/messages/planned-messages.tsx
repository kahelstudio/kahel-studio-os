import { MailOpen } from "lucide-react";

export function PlannedMessages({ title, description }: { title: string; description: string }) {
  return <main className="mx-auto w-full max-w-6xl p-5 sm:p-8 lg:p-10"><h1 className="font-display text-3xl font-semibold tracking-[-.025em]">{title}</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p><section className="mt-8 grid min-h-72 place-items-center rounded-card border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center"><div><MailOpen className="mx-auto h-7 w-7 text-[var(--color-text-muted)]" /><h2 className="mt-4 font-display text-xl font-semibold">Planned, not populated</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">No mock conversations are shown. This area will remain empty until a canonical inbound or staff-composed message source is implemented.</p></div></section></main>;
}
