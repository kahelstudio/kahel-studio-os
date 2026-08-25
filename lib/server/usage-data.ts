import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";

export type UsageMetrics = {
  mediaAssets: number;
  mediaBytes: number;
  emailsSent: number;
  emailsFailed: number;
  activeSeats: number;
  totalSeats: number;
  databaseRecords: number;
  queuedAutomations: number;
};

export async function getUsageMetrics(): Promise<UsageMetrics | null> {
  try {
    const admin = getSupabaseAdmin();
    const [assets, mediaSizes, loyaltySent, loyaltyFailed, gallerySent, galleryFailed, activeSeats, totalSeats, bookings, projects, clients, pendingLoyalty, pendingGallery] = await Promise.all([
      admin.from("media_assets").select("id", { count: "exact", head: true }),
      admin.from("media_assets").select("byte_size").not("byte_size", "is", null).limit(10_000),
      admin.from("loyalty_email_outbox").select("id", { count: "exact", head: true }).eq("status", "sent"),
      admin.from("loyalty_email_outbox").select("id", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("gallery_email_outbox").select("id", { count: "exact", head: true }).eq("status", "sent"),
      admin.from("gallery_email_outbox").select("id", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("staff_profiles").select("user_id", { count: "exact", head: true }).eq("active", true),
      admin.from("staff_profiles").select("user_id", { count: "exact", head: true }),
      admin.from("bookings").select("id", { count: "exact", head: true }),
      admin.from("projects").select("id", { count: "exact", head: true }),
      admin.from("clients").select("id", { count: "exact", head: true }),
      admin.from("loyalty_email_outbox").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
      admin.from("gallery_email_outbox").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
    ]);
    const results = [assets, mediaSizes, loyaltySent, loyaltyFailed, gallerySent, galleryFailed, activeSeats, totalSeats, bookings, projects, clients, pendingLoyalty, pendingGallery];
    const failure = results.find((result) => result.error)?.error;
    if (failure) throw failure;
    return {
      mediaAssets: assets.count ?? 0,
      mediaBytes: (mediaSizes.data ?? []).reduce((total, row) => total + Number(row.byte_size ?? 0), 0),
      emailsSent: (loyaltySent.count ?? 0) + (gallerySent.count ?? 0),
      emailsFailed: (loyaltyFailed.count ?? 0) + (galleryFailed.count ?? 0),
      activeSeats: activeSeats.count ?? 0,
      totalSeats: totalSeats.count ?? 0,
      databaseRecords: (bookings.count ?? 0) + (projects.count ?? 0) + (clients.count ?? 0),
      queuedAutomations: (pendingLoyalty.count ?? 0) + (pendingGallery.count ?? 0),
    };
  } catch (error) {
    console.error("getUsageMetrics: metrics unavailable", error instanceof Error ? error.message : error);
    return null;
  }
}
