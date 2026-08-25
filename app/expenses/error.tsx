"use client";

export default function ErrorState({ reset }: { reset: () => void }) {
  return <div className="grid min-h-[60vh] place-items-center p-6 text-center"><div><h1 className="font-display text-2xl font-semibold">Expenses are unavailable</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">The cost ledger could not be loaded. No financial records were changed.</p><button onClick={reset} className="mt-5 min-h-11 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white hover:bg-[#E64B00]">Try again</button></div></div>;
}
