import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "You're offline | Kahel Studio" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 bg-white px-8 text-center text-neutral-950 dark:bg-neutral-950 dark:text-neutral-100">
      <Image className="h-auto w-40 dark:invert" src="/kahelstudio-logo_b.svg" alt="Kahel Studio" width={160} height={48} priority />
      <span className="text-4xl" aria-hidden="true">Offline</span>
      <h1 className="text-2xl font-bold text-[#ff5300]">You&apos;re offline</h1>
      <p className="max-w-xs leading-6 text-neutral-600 dark:text-neutral-400">Check your internet connection and try again.</p>
      <Link className="rounded-full bg-[#ff5300] px-6 py-3 font-semibold text-white" href="/">Try again</Link>
    </main>
  );
}
