export default function Loading() {
  return <main className="animate-pulse p-5 sm:p-8 lg:p-10" aria-label="Loading messages"><div className="h-9 w-52 rounded-control bg-[var(--color-surface-muted)]" /><div className="mt-3 h-5 w-96 max-w-full rounded-control bg-[var(--color-surface-muted)]" /><div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 rounded-card bg-[var(--color-surface-muted)]" />)}</div><div className="mt-5 h-80 rounded-card bg-[var(--color-surface-muted)]" /></main>;
}
