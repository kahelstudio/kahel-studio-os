import Link from "next/link";
import Image from "next/image";
import { getPortalGalleries } from "@/lib/server/customer-gallery-data";

const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(value));

export default async function PortalGalleriesPage() {
  const galleries = await getPortalGalleries();
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
    <p className="text-xs font-bold uppercase tracking-[.16em] text-kahel-700">Client Portal</p>
    <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Your galleries</h1>
    <p className="mt-3 max-w-2xl text-text-secondary">View, favorite, and download photographs delivered by Kahel Studio.</p>
    {galleries.length ? <section className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Customer galleries">
      {galleries.map((gallery) => <Link key={gallery.id} href={`/portal/galleries/${gallery.id}`} className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-kahel-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30">
        <div className="aspect-[4/3] bg-surface-muted">{gallery.coverUrl ? <Image src={gallery.coverUrl} alt="" width={640} height={480} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" unoptimized className="h-full w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.015]" /> : <div className="grid h-full place-items-center px-6 text-center text-sm text-text-muted">{gallery.state === "processing" ? "Photographs are being prepared" : "No preview available"}</div>}</div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3"><h2 className="font-display text-xl font-semibold">{gallery.title}</h2><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${gallery.state === "available" ? "bg-success-bg text-success-text" : gallery.state === "processing" ? "bg-attention-bg text-attention-text" : "bg-surface-muted text-text-muted"}`}>{gallery.state}</span></div>
          <p className="mt-3 text-sm text-text-secondary">{gallery.imageCount} {gallery.imageCount === 1 ? "image" : "images"}{gallery.projectReference ? ` · ${gallery.projectReference}` : ""}</p>
          {gallery.sessionDate ? <p className="mt-1 text-sm text-text-muted">Session {date(gallery.sessionDate)}</p> : null}
          {gallery.expiresAt ? <p className="mt-1 text-sm text-text-muted">{gallery.state === "unavailable" ? "Expired" : "Available until"} {date(gallery.expiresAt)}</p> : null}
        </div>
      </Link>)}
    </section> : <section className="mt-9 rounded-xl border border-dashed border-border bg-surface p-8 sm:p-12"><h2 className="font-display text-xl font-semibold">No galleries yet</h2><p className="mt-2 max-w-xl text-text-secondary">Your galleries will appear here when photographs from a session are ready to prepare or view.</p></section>}
  </main>;
}
