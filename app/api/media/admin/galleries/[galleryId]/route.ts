import { NextResponse } from "next/server";
import { authorize, errorResponse, GalleryApiError, getGallery, isUuid, mediaTable, readJson, writeAudit, type GalleryAssetRecord } from "../_shared";

export const runtime = "nodejs";

type Context = { params: Promise<{ galleryId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await authorize(request, "galleries.manage", true);
  if ("response" in auth) return auth.response;
  try {
    const { galleryId } = await params;
    if (!isUuid(galleryId)) throw new GalleryApiError("Invalid gallery ID.", 400);
    const gallery = await getGallery(galleryId);
    if (gallery.status === "archived") throw new GalleryApiError("Archived galleries cannot be edited.", 409);
    const body = await readJson(request);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200) throw new GalleryApiError("Title must be between 1 and 200 characters.", 400);
      update.title = body.title.trim();
    }
    if (body.description !== undefined) {
      if (body.description !== null && typeof body.description !== "string") throw new GalleryApiError("Description must be text.", 400);
      update.description = typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 4000) : null;
    }
    if (body.downloadsEnabled !== undefined) {
      if (typeof body.downloadsEnabled !== "boolean") throw new GalleryApiError("Invalid download setting.", 400);
      update.downloads_enabled = body.downloadsEnabled;
    }
    if (body.watermarkEnabled !== undefined) {
      if (typeof body.watermarkEnabled !== "boolean") throw new GalleryApiError("Invalid watermark setting.", 400);
      update.watermark_enabled = body.watermarkEnabled;
    }
    const assetOrder = body.assetOrder;
    if (assetOrder !== undefined) {
      if (!Array.isArray(assetOrder) || assetOrder.length > 2000 || assetOrder.some((id) => !isUuid(id)) || new Set(assetOrder).size !== assetOrder.length) throw new GalleryApiError("Invalid asset order.", 400);
      const existing = await mediaTable("gallery_assets").select("id,gallery_id,sort_order").eq("gallery_id", galleryId).returns<GalleryAssetRecord[]>();
      if (existing.error) throw existing.error;
      if (existing.data.length !== assetOrder.length || existing.data.some((asset) => !assetOrder.includes(asset.id))) throw new GalleryApiError("Asset order must include every gallery asset once.", 400);
      for (let index = 0; index < assetOrder.length; index += 1) {
        const reordered = await mediaTable("gallery_assets").update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", assetOrder[index]).eq("gallery_id", galleryId);
        if (reordered.error) throw reordered.error;
      }
    }
    const assetUpdates = body.assetUpdates;
    if (assetUpdates !== undefined) {
      if (!Array.isArray(assetUpdates) || assetUpdates.length > 200) throw new GalleryApiError("Invalid asset updates.", 400);
      for (const item of assetUpdates) {
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new GalleryApiError("Invalid asset update.", 400);
        const asset = item as Record<string, unknown>;
        if (!isUuid(asset.id)) throw new GalleryApiError("Invalid asset ID.", 400);
        const assetUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (asset.altText !== undefined) assetUpdate.alt_text = typeof asset.altText === "string" ? asset.altText.trim().slice(0, 500) || null : null;
        if (asset.caption !== undefined) assetUpdate.caption = typeof asset.caption === "string" ? asset.caption.trim().slice(0, 1000) || null : null;
        if (asset.downloadEnabled !== undefined) {
          if (typeof asset.downloadEnabled !== "boolean") throw new GalleryApiError("Invalid asset download setting.", 400);
          assetUpdate.downloadable = asset.downloadEnabled;
        }
        if (asset.approvalStatus !== undefined) {
          if (!["pending", "approved", "rejected"].includes(String(asset.approvalStatus))) throw new GalleryApiError("Invalid asset approval status.", 400);
          assetUpdate.approval_status = asset.approvalStatus;
        }
        const changesFocalPoint = asset.focalX !== undefined || asset.focalY !== undefined;
        if (changesFocalPoint) {
          if (typeof asset.focalX !== "number" || typeof asset.focalY !== "number" || asset.focalX < 0 || asset.focalX > 1 || asset.focalY < 0 || asset.focalY > 1) throw new GalleryApiError("Focal points must be between 0 and 1.", 400);
        }
        const changed = await mediaTable("gallery_assets").update(assetUpdate).eq("id", asset.id).eq("gallery_id", galleryId).select("id,media_asset_id").maybeSingle<Record<string, unknown>>();
        if (changed.error) throw changed.error;
        if (!changed.data) throw new GalleryApiError("Gallery asset not found.", 404);
        if (changesFocalPoint) {
          if (!isUuid(changed.data.media_asset_id)) throw new GalleryApiError("Gallery asset has no media record.", 409);
          const mediaChanged = await mediaTable("media_assets").update({ focal_x: asset.focalX, focal_y: asset.focalY, updated_at: new Date().toISOString() }).eq("id", changed.data.media_asset_id).eq("client_id", gallery.client_id);
          if (mediaChanged.error) throw mediaChanged.error;
        }
      }
    }
    const galleryFieldsChanged = Object.keys(update).length > 1;
    const updated = galleryFieldsChanged ? await mediaTable("galleries").update(update).eq("id", galleryId).select("*").single() : { data: gallery, error: null };
    if (updated.error) throw updated.error;
    await writeAudit(request, auth.principal, gallery, "gallery.updated", { fields: Object.keys(body) });
    return NextResponse.json({ gallery: updated.data });
  } catch (error) {
    return errorResponse(error);
  }
}
