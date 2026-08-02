import { NextResponse } from "next/server";
import { canFavoriteGalleryAsset, getGalleryAccessState } from "@/lib/gallery-access";
import { getCustomerIdentityFromRequest, hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getCustomerGalleryDatabase } from "@/lib/server/customer-gallery-data";

export const runtime = "nodejs";

type Gallery = { id: string; published: boolean; published_at: string | null; expires_at: string | null; status: string; favorites_enabled: boolean };
type Asset = { id: string; visibility: string; approval_status: string };

type FavoriteRouteContext = { params: Promise<{ galleryId: string; assetId: string }> };

async function mutateFavorite(request: Request, context: FavoriteRouteContext, method: "POST" | "DELETE") {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unable to update favorite." }, { status: 403 });
  const identity = await getCustomerIdentityFromRequest(request);
  if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { galleryId, assetId } = await context.params;
  const db = getCustomerGalleryDatabase();
  const [galleryResult, assetResult] = await Promise.all([
    db.from("galleries").select("id,published,published_at,expires_at,status,favorites_enabled").eq("id", galleryId).eq("client_id", identity.clientId).maybeSingle(),
    db.from("gallery_assets").select("id,visibility,approval_status").eq("id", assetId).eq("gallery_id", galleryId).maybeSingle(),
  ]);
  if (galleryResult.error || assetResult.error) return NextResponse.json({ error: "Unable to update favorite." }, { status: 500 });
  const gallery = galleryResult.data as Gallery | null;
  const asset = assetResult.data as Asset | null;
  if (!gallery || !asset || !canFavoriteGalleryAsset({ galleryState: getGalleryAccessState({ published: gallery.published, publishedAt: gallery.published_at, expiresAt: gallery.expires_at, status: gallery.status }), favoritesEnabled: gallery.favorites_enabled, visibility: asset.visibility, approvalStatus: asset.approval_status })) {
    return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });
  }

  const scope = db.from("gallery_favorites");
  if (method === "DELETE") {
    const result = await scope.delete().eq("gallery_id", galleryId).eq("gallery_asset_id", assetId).eq("client_id", identity.clientId).eq("client_profile_id", identity.profileId);
    if (result.error) return NextResponse.json({ error: "Unable to update favorite." }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  }

  const existing = await scope.select("gallery_asset_id").eq("gallery_id", galleryId).eq("gallery_asset_id", assetId).eq("client_id", identity.clientId).eq("client_profile_id", identity.profileId).maybeSingle();
  if (existing.error) return NextResponse.json({ error: "Unable to update favorite." }, { status: 500 });
  if (existing.data) return new NextResponse(null, { status: 204 });
  const result = await db.from("gallery_favorites").insert({ gallery_id: galleryId, gallery_asset_id: assetId, client_id: identity.clientId, client_profile_id: identity.profileId });
  if (result.error && result.error.code !== "23505") return NextResponse.json({ error: "Unable to update favorite." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

export function POST(request: Request, context: FavoriteRouteContext) {
  return mutateFavorite(request, context, "POST");
}

export function DELETE(request: Request, context: FavoriteRouteContext) {
  return mutateFavorite(request, context, "DELETE");
}
