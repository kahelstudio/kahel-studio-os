export type GalleryAccessState = "available" | "processing" | "unavailable";

type GalleryAccessInput = {
  published: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  status: string;
};

const PROCESSING_STATUSES = new Set(["draft", "processing", "uploading"]);
const UNAVAILABLE_STATUSES = new Set(["archived", "disabled", "expired", "unavailable"]);

export function getGalleryAccessState(gallery: GalleryAccessInput, now = new Date()): GalleryAccessState {
  const status = gallery.status.toLowerCase();
  if (gallery.expiresAt && new Date(gallery.expiresAt).getTime() <= now.getTime()) return "unavailable";
  if (UNAVAILABLE_STATUSES.has(status)) return "unavailable";
  if (!gallery.published || (gallery.publishedAt && new Date(gallery.publishedAt).getTime() > now.getTime())) {
    return PROCESSING_STATUSES.has(status) ? "processing" : "unavailable";
  }
  return "available";
}

export function canFavoriteGalleryAsset(input: {
  galleryState: GalleryAccessState;
  favoritesEnabled: boolean;
  visibility: string;
  approvalStatus: string;
}) {
  return input.galleryState === "available"
    && input.favoritesEnabled
    && input.visibility === "gallery"
    && input.approvalStatus === "approved";
}
