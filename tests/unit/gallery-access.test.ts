import { describe, expect, it } from "vitest";
import { canFavoriteGalleryAsset, getGalleryAccessState } from "@/lib/gallery-access";

const now = new Date("2026-08-02T12:00:00Z");

describe("customer gallery access", () => {
  it("allows a currently published gallery", () => {
    expect(getGalleryAccessState({ published: true, publishedAt: "2026-08-01T12:00:00Z", expiresAt: "2026-08-03T12:00:00Z", status: "ready" }, now)).toBe("available");
  });

  it("marks work in progress separately from unavailable delivery", () => {
    expect(getGalleryAccessState({ published: false, publishedAt: null, expiresAt: null, status: "processing" }, now)).toBe("processing");
    expect(getGalleryAccessState({ published: false, publishedAt: null, expiresAt: null, status: "disabled" }, now)).toBe("unavailable");
  });

  it("expires access at the exact expiration time", () => {
    expect(getGalleryAccessState({ published: true, publishedAt: "2026-08-01T12:00:00Z", expiresAt: now.toISOString(), status: "ready" }, now)).toBe("unavailable");
  });

  it("only permits favorites for approved visible assets in an enabled gallery", () => {
    expect(canFavoriteGalleryAsset({ galleryState: "available", favoritesEnabled: true, visibility: "gallery", approvalStatus: "approved" })).toBe(true);
    expect(canFavoriteGalleryAsset({ galleryState: "available", favoritesEnabled: true, visibility: "hidden", approvalStatus: "approved" })).toBe(false);
    expect(canFavoriteGalleryAsset({ galleryState: "unavailable", favoritesEnabled: true, visibility: "gallery", approvalStatus: "approved" })).toBe(false);
  });
});
