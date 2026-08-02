import { NextResponse } from "next/server";
import { assertPublishable, authorize, enqueueGalleryEmail, errorResponse, GalleryApiError, getGallery, isUuid, mediaTable, readJson, writeAudit } from "../../_shared";
import { getMediaBindings } from "@/lib/server/cloudflare-media";
import type { MediaProcessingMessage } from "@/lib/media-contract";

export const runtime = "nodejs";

type Action = "publish" | "unpublish" | "archive" | "resend-email";
type Context = { params: Promise<{ galleryId: string; action: string }> };

export async function POST(request: Request, { params }: Context) {
  const { galleryId, action: rawAction } = await params;
  if (!isUuid(galleryId)) return NextResponse.json({ error: "Invalid gallery ID." }, { status: 400 });
  if (!["publish", "unpublish", "archive", "resend-email"].includes(rawAction)) return NextResponse.json({ error: "Unsupported gallery action." }, { status: 404 });
  const action = rawAction as Action;
  const permission = action === "archive" ? "galleries.manage" : "galleries.publish";
  const auth = await authorize(request, permission, true);
  if ("response" in auth) return auth.response;
  try {
    await readJson(request);
    const gallery = await getGallery(galleryId);
    if (action === "publish") {
      if (gallery.status === "archived") throw new GalleryApiError("Archived galleries cannot be published.", 409);
      await assertPublishable(gallery);
      const now = new Date().toISOString();
      const result = await mediaTable("galleries").update({ status: "published", published: true, published_at: now, updated_at: now }).eq("id", galleryId);
      if (result.error) throw result.error;
      const outboxId = await enqueueGalleryEmail(gallery, "gallery_published", now);
      const message: MediaProcessingMessage = { kind: "gallery-email", outboxId };
      await (await getMediaBindings()).processing.send(message, { contentType: "json" });
    } else if (action === "unpublish") {
      if (gallery.status !== "published" && gallery.published !== true) throw new GalleryApiError("Gallery is not published.", 409);
      const result = await mediaTable("galleries").update({ status: "ready", published: false, published_at: null, updated_at: new Date().toISOString() }).eq("id", galleryId);
      if (result.error) throw result.error;
    } else if (action === "archive") {
      if (gallery.status === "published" || gallery.published === true) throw new GalleryApiError("Unpublish the gallery before archiving it.", 409);
      const now = new Date().toISOString();
      const result = await mediaTable("galleries").update({ status: "archived", published: false, published_at: null, updated_at: now }).eq("id", galleryId);
      if (result.error) throw result.error;
    } else {
      if (gallery.status !== "published" && gallery.published !== true) throw new GalleryApiError("Publish the gallery before sending its email.", 409);
      const outboxId = await enqueueGalleryEmail(gallery, "gallery_published", `resend:${crypto.randomUUID()}`);
      const message: MediaProcessingMessage = { kind: "gallery-email", outboxId };
      await (await getMediaBindings()).processing.send(message, { contentType: "json" });
    }
    await writeAudit(request, auth.principal, gallery, `gallery.${action.replace("-", "_")}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
