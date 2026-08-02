import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerGallery } from "@/components/client-portal/customer-gallery";
import { getPortalGallery } from "@/lib/server/customer-gallery-data";

const date = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(new Date(value));

export default async function PortalGalleryPage({ params }: { params: Promise<{ galleryId: string }> }) {
  const { galleryId } = await params;
  const gallery = await getPortalGallery(galleryId);
  if (!gallery) notFound();

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
    <Link href="/portal/galleries" className="inline-flex min-h-11 items-center text-sm font-semibold text-kahel-700 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF5300]/30">← All galleries</Link>
    <header className="mt-5 border-b border-border pb-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{gallery.title}</h1>{gallery.description ? <p className="mt-3 max-w-3xl text-text-secondary">{gallery.description}</p> : null}</div><span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${gallery.state === "available" ? "bg-success-bg text-success-text" : gallery.state === "processing" ? "bg-attention-bg text-attention-text" : "bg-surface-muted text-text-muted"}`}>{gallery.state}</span></div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted"><span>{gallery.imageCount} {gallery.imageCount === 1 ? "image" : "images"}</span>{gallery.projectReference ? <span>Project {gallery.projectReference}</span> : null}{gallery.sessionDate ? <span>Session {date(gallery.sessionDate)}</span> : null}{gallery.expiresAt ? <span>{gallery.state === "unavailable" ? "Expired" : "Available until"} {date(gallery.expiresAt)}</span> : null}</div>
    </header>
    {gallery.state === "processing" ? <GalleryMessage title="Your gallery is being prepared" body="We are processing and reviewing your photographs. Please check back soon." /> : gallery.state === "unavailable" ? <GalleryMessage title="This gallery is unavailable" body="This delivery has expired or is no longer published. Contact Kahel Studio if you need access restored." /> : gallery.assets.length ? <section className="mt-7"><CustomerGallery galleryId={gallery.id} title={gallery.title} assets={gallery.assets} favoritesEnabled={gallery.favoritesEnabled} /></section> : <GalleryMessage title="No photographs are available yet" body="This gallery is published, but its photographs are still being added. Please check back soon." />}
  </main>;
}

function GalleryMessage({ title, body }: { title: string; body: string }) {
  return <section className="mt-8 rounded-xl border border-dashed border-border bg-surface p-8 sm:p-12"><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-2 max-w-xl text-text-secondary">{body}</p></section>;
}
