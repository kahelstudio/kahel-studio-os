"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <main className="grid min-h-80 place-items-center p-8 text-center"><div><h1 className="font-display text-2xl font-semibold">Unable to load payments</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">The payment workspace could not be loaded. No records were changed.</p><button type="button" onClick={reset} className="mt-5 min-h-11 rounded-control bg-[#FF5300] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kahel-200)]">Try again</button></div></main>;
}
