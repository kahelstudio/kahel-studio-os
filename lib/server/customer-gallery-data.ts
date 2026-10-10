import "server-only";

import { getGalleryAccessState, type GalleryAccessState } from "@/lib/gallery-access";
import { requireCustomerIdentity, getSupabaseCustomerClient, type CustomerIdentity } from "./customer-auth";
import { getSupabaseAdmin } from "./supabase-admin";

type QueryError = { code?: string; message?: string };
type QueryResult = { data: unknown; error: QueryError | null; count?: number | null };
type GalleryQuery = PromiseLike<QueryResult> & {
  select(columns: string, options?: { count?: "exact"; head?: boolean }): GalleryQuery;
  insert(values: Record<string, unknown>): GalleryQuery;
  delete(): GalleryQuery;
  eq(column: string, value: unknown): GalleryQuery;
  in(column: string, values: readonly string[]): GalleryQuery;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): GalleryQuery;
  maybeSingle(): GalleryQuery;
};
type GalleryTable = "galleries" | "gallery_assets" | "gallery_favorites" | "media_assets" | "projects";
type GalleryDatabase = { from(table: GalleryTable): GalleryQuery };

type GalleryRow = {
  id: string;
  client_id: string;
  project_id: string | null;
  booking_id: string | null;
  title: string;
  description: string | null;
  status: string;
  published: boolean;
  published_at: string | null;
  expires_at: string | null;
  downloads_enabled: boolean;
  favorites_enabled: boolean;
  watermark_enabled: boolean;
  session_date: string | null;
  cover_media_asset_id: string | null;
};
type AssetRow = {
  id: string;
  gallery_id: string;
  media_asset_id: string;
  sort_order: number;
  visibility: string;
  approval_status: string;
  downloadable: boolean;
  download_variant: string | null;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
};
type MediaRow = { id: string; width: number | null; height: number | null; dominant_color: string | null };
type ProjectRow = { id: string; reference: string };
type FavoriteRow = { gallery_asset_id: string };

export type PortalGallerySummary = {
  id: string;
  title: string;
  description: string | null;
  state: GalleryAccessState;
  status: string;
  sessionDate: string | null;
  expiresAt: string | null;
  projectReference: string | null;
  imageCount: number;
  coverUrl: string | null;
};

export type PortalGalleryAsset = {
  id: string;
  mediaAssetId: string;
  title: string | null;
  altText: string;
  caption: string | null;
  width: number;
  height: number;
  dominantColor: string | null;
  gridUrl: string;
  previewUrl: string;
  downloadUrl: string | null;
  favorite: boolean;
};

export type PortalGalleryDetail = PortalGallerySummary & {
  downloadsEnabled: boolean;
  favoritesEnabled: boolean;
  watermarkEnabled: boolean;
  assets: PortalGalleryAsset[];
};

function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? data as T[] : [];
}

function row<T>(data: unknown): T | null {
  return data && typeof data === "object" ? data as T : null;
}

function mediaUrl(mediaAssetId: string, variant: "gallery-grid" | "gallery-preview" | "download") {
  return `/media/${encodeURIComponent(mediaAssetId)}/${variant}`;
}

// media_assets has no customer RLS policy; service-role is required.
function adminDb() {
  return getSupabaseAdmin() as unknown as GalleryDatabase;
}

// All other gallery tables (galleries, gallery_assets, gallery_favorites, projects)
// have customer RLS policies enforcing ownership via customer_owns_client().
function customerDb(accessToken: string) {
  return getSupabaseCustomerClient(accessToken) as unknown as GalleryDatabase;
}

async function projectReferences(accessToken: string, projectIds: string[]) {
  if (!projectIds.length) return new Map<string, string>();
  const result = await customerDb(accessToken).from("projects").select("id,reference").in("id", projectIds);
  if (result.error) throw new Error("Unable to load gallery projects.");
  return new Map(rows<ProjectRow>(result.data).map((project) => [project.id, project.reference]));
}

function summary(gallery: GalleryRow, assets: AssetRow[], projects: Map<string, string>): PortalGallerySummary {
  const state = getGalleryAccessState({ published: gallery.published, publishedAt: gallery.published_at, expiresAt: gallery.expires_at, status: gallery.status });
  const cover = assets.find((asset) => asset.media_asset_id === gallery.cover_media_asset_id) ?? assets[0];
  return {
    id: gallery.id,
    title: gallery.title,
    description: gallery.description,
    state,
    status: gallery.status,
    sessionDate: gallery.session_date,
    expiresAt: gallery.expires_at,
    projectReference: gallery.project_id ? projects.get(gallery.project_id) ?? null : null,
    imageCount: assets.length,
    coverUrl: state === "available" && cover ? mediaUrl(cover.media_asset_id, "gallery-grid") : null,
  };
}

const GALLERY_COLUMNS = "id,client_id,project_id,booking_id,title,description,status,published,published_at,expires_at,downloads_enabled,favorites_enabled,watermark_enabled,session_date,cover_media_asset_id";
const ASSET_COLUMNS = "id,gallery_id,media_asset_id,sort_order,visibility,approval_status,downloadable,download_variant,title,alt_text,caption,width,height";

export async function getPortalGalleries(): Promise<PortalGallerySummary[]> {
  const identity = await requireCustomerIdentity("/portal/galleries");
  const cdb = customerDb(identity.accessToken);
  const galleryResult = await cdb.from("galleries").select(GALLERY_COLUMNS).eq("status", "published").eq("published", true).order("session_date", { ascending: false, nullsFirst: false });
  if (galleryResult.error) throw new Error("Unable to load galleries.");
  const galleries = rows<GalleryRow>(galleryResult.data);
  if (!galleries.length) return [];

  const [assetResult, projects] = await Promise.all([
    cdb.from("gallery_assets").select(ASSET_COLUMNS).in("gallery_id", galleries.map((gallery) => gallery.id)).eq("visibility", "gallery").eq("approval_status", "approved").order("sort_order", { ascending: true }),
    projectReferences(identity.accessToken, [...new Set(galleries.flatMap((gallery) => gallery.project_id ? [gallery.project_id] : []))]),
  ]);
  if (assetResult.error) throw new Error("Unable to load gallery images.");
  const assets = rows<AssetRow>(assetResult.data);
  return galleries.map((gallery) => summary(gallery, assets.filter((asset) => asset.gallery_id === gallery.id), projects));
}

export async function getPortalGallery(galleryId: string): Promise<PortalGalleryDetail | null> {
  const identity = await requireCustomerIdentity(`/portal/galleries/${galleryId}`);
  return getPortalGalleryForIdentity(galleryId, identity);
}

export async function getPortalGalleryForIdentity(galleryId: string, identity: Pick<CustomerIdentity, "clientId" | "profileId" | "accessToken">): Promise<PortalGalleryDetail | null> {
  const cdb = customerDb(identity.accessToken);
  const galleryResult = await cdb.from("galleries").select(GALLERY_COLUMNS).eq("id", galleryId).eq("client_id", identity.clientId).maybeSingle();
  if (galleryResult.error) throw new Error("Unable to load gallery.");
  const gallery = row<GalleryRow>(galleryResult.data);
  if (!gallery) return null;

  const state = getGalleryAccessState({ published: gallery.published, publishedAt: gallery.published_at, expiresAt: gallery.expires_at, status: gallery.status });

  // For non-available galleries (expired, processing, disabled): return gallery
  // metadata with empty assets so the page can show a graceful state message
  // instead of a generic 404.
  if (state !== "available") {
    const projects = await projectReferences(identity.accessToken, gallery.project_id ? [gallery.project_id] : []);
    return {
      ...summary(gallery, [], projects),
      state,
      downloadsEnabled: false,
      favoritesEnabled: false,
      watermarkEnabled: gallery.watermark_enabled,
      assets: [],
    };
  }

  const [assetResult, projects] = await Promise.all([
    cdb.from("gallery_assets").select(ASSET_COLUMNS).eq("gallery_id", gallery.id).eq("visibility", "gallery").eq("approval_status", "approved").order("sort_order", { ascending: true }),
    projectReferences(identity.accessToken, gallery.project_id ? [gallery.project_id] : []),
  ]);
  if (assetResult.error) throw new Error("Unable to load gallery images.");
  const assets = rows<AssetRow>(assetResult.data);
  const mediaIds = assets.map((asset) => asset.media_asset_id);
  const [mediaResult, favoriteResult] = await Promise.all([
    // media_assets has no customer RLS — must use service-role admin with explicit ownership filter
    mediaIds.length ? adminDb().from("media_assets").select("id,width,height,dominant_color").in("id", mediaIds).eq("client_id", identity.clientId) : Promise.resolve({ data: [], error: null }),
    mediaIds.length && gallery.favorites_enabled
      ? cdb.from("gallery_favorites").select("gallery_asset_id").eq("gallery_id", gallery.id).eq("client_id", identity.clientId).eq("client_profile_id", identity.profileId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (mediaResult.error || favoriteResult.error) throw new Error("Unable to load gallery images.");
  const media = new Map(rows<MediaRow>(mediaResult.data).map((item) => [item.id, item]));
  const favorites = new Set(rows<FavoriteRow>(favoriteResult.data).map((favorite) => favorite.gallery_asset_id));

  return {
    ...summary(gallery, assets, projects),
    state,
    downloadsEnabled: gallery.downloads_enabled,
    favoritesEnabled: gallery.favorites_enabled,
    watermarkEnabled: gallery.watermark_enabled,
    assets: assets.map((asset) => {
      const mediaAsset = media.get(asset.media_asset_id);
      return {
        id: asset.id,
        mediaAssetId: asset.media_asset_id,
        title: asset.title,
        altText: asset.alt_text?.trim() || asset.title?.trim() || "Gallery photograph",
        caption: asset.caption,
        width: asset.width ?? mediaAsset?.width ?? 1600,
        height: asset.height ?? mediaAsset?.height ?? 1067,
        dominantColor: mediaAsset?.dominant_color ?? null,
        gridUrl: mediaUrl(asset.media_asset_id, "gallery-grid"),
        previewUrl: mediaUrl(asset.media_asset_id, "gallery-preview"),
        downloadUrl: gallery.downloads_enabled && asset.downloadable ? mediaUrl(asset.media_asset_id, "download") : null,
        favorite: favorites.has(asset.id),
      };
    }),
  };
}

export { adminDb as getCustomerGalleryDatabase };
