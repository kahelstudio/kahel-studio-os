export const dynamic = "force-dynamic";

import { getPages } from "@/lib/server/website-data";
import { CmsTable } from "../cms-table";
import { PublishButton } from "../publish-button";

export default async function WebsitePagesPage() {
  const pages = await getPages();

  return (
    <div className="max-w-[1000px]">
      <header className="flex items-end justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-9 pt-[34px] sm:px-6">
        <div>
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.25rem)] font-semibold leading-11 tracking-[-0.025em] text-[var(--color-text-primary)]">Pages</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">Standalone pages on kahelstudio.com</p>
        </div>
        <PublishButton />
      </header>
      <div className="px-4 pb-12 pt-6 sm:px-6">
        <CmsTable
          table="website_pages"
          slugPrefix="kahelstudio.com/"
          rows={pages.map((p) => ({ id: p.id, slug: p.slug, title: p.title, status: p.status, publishedAt: p.publishedAt, updatedAt: p.updatedAt, subtitle: p.seoDescription ?? null }))}
        />
      </div>
    </div>
  );
}
