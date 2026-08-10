export default function Loading() {
  return <div className="animate-pulse p-5 sm:p-8 lg:p-10"><div className="h-10 w-48 rounded-control bg-[var(--color-surface-muted)]" /><div className="mt-3 h-5 w-80 max-w-full rounded-control bg-[var(--color-surface-muted)]" /><div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 rounded-card bg-[var(--color-surface-muted)]" />)}</div><div className="mt-6 h-96 rounded-card bg-[var(--color-surface-muted)]" /></div>;
}
