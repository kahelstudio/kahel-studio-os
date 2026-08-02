import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { assertCanonicalProject, authorize, errorResponse, GalleryApiError, isUuid, mediaTable, readJson, slugify, writeAudit, type GalleryAssetRecord, type GalleryRecord } from "./_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorize(request, "galleries.read");
  if ("response" in auth) return auth.response;
  try {
    const [galleriesResult, projectsResult, clientsResult] = await Promise.all([
      mediaTable("galleries").select("*").order("updated_at", { ascending: false }).returns<GalleryRecord[]>(),
      getSupabaseAdmin().from("projects").select("id,client_id,reference,title,status").order("updated_at", { ascending: false }),
      getSupabaseAdmin().from("clients").select("id,name,status").order("name"),
    ]);
    if (galleriesResult.error) throw galleriesResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (clientsResult.error) throw clientsResult.error;
    const galleryIds = galleriesResult.data.map((gallery) => gallery.id);
    const linksResult = galleryIds.length
      ? await mediaTable("gallery_assets").select("*").in("gallery_id", galleryIds).order("sort_order").returns<GalleryAssetRecord[]>()
      : { data: [] as GalleryAssetRecord[], error: null };
    if (linksResult.error) throw linksResult.error;
    const mediaIds = linksResult.data.map((link) => link.media_asset_id).filter(isUuid);
    const mediaResult = mediaIds.length
      ? await mediaTable("media_assets").select("*").in("id", mediaIds).returns<Array<Record<string, unknown>>>()
      : { data: [] as Array<Record<string, unknown>>, error: null };
    if (mediaResult.error) throw mediaResult.error;
    const mediaById = new Map(mediaResult.data.map((asset) => [asset.id, asset]));
    const assetsByGallery = new Map<string, Array<Record<string, unknown>>>();
    for (const link of linksResult.data) {
      const current = assetsByGallery.get(link.gallery_id) ?? [];
      current.push({ ...link, media: link.media_asset_id ? mediaById.get(link.media_asset_id) ?? null : null });
      assetsByGallery.set(link.gallery_id, current);
    }
    return NextResponse.json({
      galleries: galleriesResult.data.map((gallery) => ({ ...gallery, assets: assetsByGallery.get(gallery.id) ?? [] })),
      projects: projectsResult.data,
      clients: clientsResult.data,
      permissions: auth.principal.permissions,
      role: auth.principal.role,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request, "galleries.manage", true);
  if ("response" in auth) return auth.response;
  try {
    const body = await readJson(request);
    if (!isUuid(body.projectId) || !isUuid(body.clientId)) throw new GalleryApiError("Valid project and client IDs are required.", 400);
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200) throw new GalleryApiError("Title must be between 1 and 200 characters.", 400);
    const project = await assertCanonicalProject(body.projectId, body.clientId);
    const payload = {
      project_id: project.id,
      client_id: project.client_id,
      title: body.title.trim(),
      description: typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 4000) : null,
      slug: `${slugify(body.title) || "gallery"}-${crypto.randomUUID().slice(0, 8)}`,
      status: "draft",
      published: false,
      published_at: null,
      downloads_enabled: body.downloadsEnabled === true,
      watermark_enabled: body.watermarkEnabled !== false,
    };
    const created = await mediaTable("galleries").insert(payload).select("*").single<GalleryRecord>();
    if (created.error) throw created.error;
    await writeAudit(request, auth.principal, created.data, "gallery.created", { projectReference: project.reference });
    return NextResponse.json({ gallery: { ...created.data, assets: [] } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
