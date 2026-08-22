export default function Loading() {
  return <div className="p-5 sm:p-8"><div className="h-10 w-52 animate-pulse rounded-control bg-[var(--color-surface-muted)]" /><div className="mt-6 grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-card bg-[var(--color-surface-muted)]" />)}</div><div className="mt-5 h-96 animate-pulse rounded-card bg-[var(--color-surface-muted)]" /></div>;
}
