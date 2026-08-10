"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <div className="grid min-h-80 place-items-center p-8 text-center"><div><h1 className="font-display text-2xl font-semibold">Unable to load glitches</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">The data request failed. Your records have not been changed.</p><button onClick={reset} className="mt-5 h-11 rounded-control bg-[var(--color-kahel-500)] px-4 text-sm font-semibold text-white">Try again</button></div></div>;
}
