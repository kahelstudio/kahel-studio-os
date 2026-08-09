import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

export type ApprovalItem = {
  id: string;
  galleryId: string;
  gallery: string;
  project: string;
  client: string;
  filename: string;
  caption: string | null;
  mediaStatus: string;
  submittedAt: string;
};

type ApprovalRow = {
  id: string;
  gallery_id: string;
  caption: string | null;
  created_at: string;
  media: { original_filename: string; status: string } | null;
  gallery: {
    title: string;
    project: { reference: string; title: string } | null;
    client: { name: string } | null;
  } | null;
};

export async function getPendingApprovals(): Promise<ApprovalItem[]> {
  const result = await getSupabaseAdmin()
    .from("gallery_assets")
    .select(`
      id,
      gallery_id,
      caption,
      created_at,
      media:media_asset_id ( original_filename, status ),
      gallery:gallery_id (
        title,
        project:project_id ( reference, title ),
        client:client_id ( name )
      )
    `)
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);

  if (result.error) throw result.error;
  return (result.data as unknown as ApprovalRow[]).map((item) => ({
    id: item.id,
    galleryId: item.gallery_id,
    gallery: item.gallery?.title ?? "Untitled gallery",
    project: item.gallery?.project ? `${item.gallery.project.reference} · ${item.gallery.project.title}` : "Unlinked project",
    client: item.gallery?.client?.name ?? "Unknown client",
    filename: item.media?.original_filename ?? "Media asset",
    caption: item.caption,
    mediaStatus: item.media?.status ?? "processing",
    submittedAt: item.created_at,
  }));
}
