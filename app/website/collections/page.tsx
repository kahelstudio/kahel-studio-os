export const dynamic = "force-dynamic";

import { getCollections } from "@/lib/server/website-data";
import { CmsTable } from "../cms-table";
import { PublishButton } from "../publish-button";

export default async function WebsiteCollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="max-w-[1000px]">
      <header className="flex items-end justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-9 pt-[34px] sm:px-6">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">Collections</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Portfolio collections displayed on kahelstudio.com</p>
        </div>
        <PublishButton />
      </header>
      <div className="px-4 pb-12 pt-6 sm:px-6">
        <CmsTable
          table="website_collections"
          slugPrefix="kahelstudio.com/collections/"
          rows={collections.map((c) => ({ id: c.id, slug: c.slug, title: c.title, status: c.status, publishedAt: c.publishedAt, updatedAt: c.updatedAt, subtitle: c.description ? c.description.slice(0, 80) + (c.description.length > 80 ? "…" : "") : null }))}
        />
      </div>
    </div>
  );
}
