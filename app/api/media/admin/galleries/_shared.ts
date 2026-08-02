import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffPrincipal } from "@/lib/server/staff-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { Json } from "@/lib/server/supabase-database";

export type GalleryPermission = "galleries.read" | "galleries.manage" | "galleries.publish";

export type GalleryRecord = Record<string, unknown> & {
  id: string;
  client_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status?: string;
  published?: boolean;
  downloads_enabled?: boolean;
  watermark_enabled?: boolean;
};

export type GalleryAssetRecord = Record<string, unknown> & {
  id: string;
  gallery_id: string;
  media_asset_id?: string;
  sort_order: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DynamicTable = { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
type MediaDatabase = {
  public: {
    Tables: Record<string, DynamicTable>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function hasGalleryPermission(principal: StaffPrincipal, permission: GalleryPermission) {
  if (principal.permissions.includes(permission)) return true;
  if (principal.role === "super_admin") return true;
  if (principal.role === "admin") return permission !== "galleries.publish" || principal.permissions.includes("galleries.manage");
  return false;
}

export async function authorize(request: Request, permission: GalleryPermission, mutation = false) {
  if (mutation && !hasTrustedOrigin(request)) {
    return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  }
  const principal = await getStaffPrincipal(request);
  if (!principal) return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (!hasGalleryPermission(principal, permission)) {
    return { response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { principal };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 16_384) throw new GalleryApiError("Request is too large.", 413);
  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 16_384) throw new GalleryApiError("Request is too large.", 413);
    body = JSON.parse(text);
  } catch (error) {
    if (error instanceof GalleryApiError) throw error;
    throw new GalleryApiError("Invalid JSON body.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new GalleryApiError("Invalid request body.", 400);
  return body as Record<string, unknown>;
}

// The generated database type currently trails the deployed media schema. Keep the
// escape hatch local to these routes instead of weakening shared database typing.
export function mediaTable(name: string) {
  return (getSupabaseAdmin() as unknown as SupabaseClient<MediaDatabase>).from(name);
}

export async function getGallery(galleryId: string) {
  const result = await mediaTable("galleries").select("*").eq("id", galleryId).maybeSingle<GalleryRecord>();
  if (result.error) throw result.error;
  if (!result.data) throw new GalleryApiError("Gallery not found.", 404);
  return result.data;
}

export async function assertCanonicalProject(projectId: string, clientId?: string) {
  const result = await getSupabaseAdmin().from("projects").select("id,client_id,reference,title").eq("id", projectId).maybeSingle<{ id: string; client_id: string; reference: string; title: string }>();
  if (result.error) throw result.error;
  if (!result.data || (clientId && result.data.client_id !== clientId)) throw new GalleryApiError("Project and client do not match.", 400);
  return result.data;
}

export async function writeAudit(request: Request, principal: StaffPrincipal, gallery: GalleryRecord, action: string, metadata: Record<string, Json | undefined> = {}) {
  const result = await getSupabaseAdmin().from("customer_audit_log").insert({
    client_id: gallery.client_id,
    actor_user_id: principal.userId,
    actor_type: "staff",
    action,
    entity_type: "gallery",
    entity_id: gallery.id,
    request_id: request.headers.get("x-request-id"),
    user_agent: request.headers.get("user-agent"),
    metadata,
  });
  if (result.error) throw result.error;
}

export async function enqueueGalleryEmail(gallery: GalleryRecord, templateKey: string, idempotencySuffix: string) {
  const client = await getSupabaseAdmin().from("clients").select("primary_contact_profile_id").eq("id", gallery.client_id).single<{ primary_contact_profile_id: string | null }>();
  if (client.error) throw client.error;
  let recipientProfileId = client.data.primary_contact_profile_id;
  if (!recipientProfileId) {
    const profile = await getSupabaseAdmin().from("client_profiles").select("id").eq("client_id", gallery.client_id).eq("status", "active").order("created_at").limit(1).maybeSingle<{ id: string }>();
    if (profile.error) throw profile.error;
    recipientProfileId = profile.data?.id ?? null;
  }
  if (!recipientProfileId) throw new GalleryApiError("The client needs an active contact before gallery email can be queued.", 409);
  const payload = {
    gallery_id: gallery.id,
    client_id: gallery.client_id,
    recipient_profile_id: recipientProfileId,
    template_key: templateKey,
    idempotency_key: `${templateKey}:${gallery.id}:${idempotencySuffix}`,
    status: "pending",
    payload: { galleryId: gallery.id, projectId: gallery.project_id },
  };
  const result = await mediaTable("gallery_email_outbox").insert(payload).select("id").single<{ id: string }>();
  if (result.error) throw result.error;
  return result.data.id;
}

export async function assertPublishable(gallery: GalleryRecord) {
  await assertCanonicalProject(gallery.project_id, gallery.client_id);
  if (typeof gallery.downloads_enabled !== "boolean" || typeof gallery.watermark_enabled !== "boolean") {
    throw new GalleryApiError("Choose download and watermark settings before publishing.", 409);
  }
  const links = await mediaTable("gallery_assets").select("*").eq("gallery_id", gallery.id).order("sort_order").returns<GalleryAssetRecord[]>();
  if (links.error) throw links.error;
  if (!links.data.length) throw new GalleryApiError("Add at least one asset before publishing.", 409);
  const mediaIds = links.data.map((asset) => asset.media_asset_id).filter(isUuid);
  if (mediaIds.length !== links.data.length) throw new GalleryApiError("Every gallery item must reference a media asset.", 409);
  const media = await mediaTable("media_assets").select("*").in("id", mediaIds).returns<Array<Record<string, unknown>>>();
  if (media.error) throw media.error;
  const allApproved = links.data.every((asset) => asset.approval_status === "approved");
  const ready = allApproved && media.data.length === mediaIds.length && media.data.every((asset) => asset.status === "ready");
  if (!ready) throw new GalleryApiError("All assets must be processed and approved before publishing.", 409);
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export class GalleryApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof GalleryApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Gallery administration failed", error);
  return NextResponse.json({ error: "Unable to complete the gallery request." }, { status: 500 });
}
