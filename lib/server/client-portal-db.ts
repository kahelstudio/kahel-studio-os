import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { CLIENT_PORTAL, CLIENT_PORTAL_DEFAULT_CONFIG, type ClientPortalConfig } from "@/lib/client-portal-data";

export type ClientPortalActivity = {
  favorites: Record<string, true>;
  rating: number;
  tags: Record<string, true>;
  feedbackSent: boolean;
  selectsSubmitted: boolean;
  selectsSubmittedAt: string | null;
  feedbackSubmittedAt: string | null;
  lastAccessedAt: string | null;
  downloadCount: number;
  lastDownloadedAt: string | null;
};

type PortalRow = { project_ref: string; published: boolean; email: string; access_code: string };
type ActivityRow = { favorites_json: Record<string, true>; rating: number; tags_json: Record<string, true>; feedback_sent: boolean; selects_submitted: boolean; selects_submitted_at: string | null; feedback_submitted_at: string | null; last_accessed_at: string | null; download_count: number; last_downloaded_at: string | null };
type TokenRow = { expires_at: string };
type Database = {
  public: {
    Tables: {
      client_portals: { Row: PortalRow; Insert: PortalRow; Update: Partial<PortalRow>; Relationships: [] };
      client_portal_activity: { Row: ActivityRow & { project_ref: string }; Insert: Partial<ActivityRow> & { project_ref: string }; Update: Partial<ActivityRow>; Relationships: [] };
      client_portal_tokens: { Row: TokenRow & { token_hash: string; project_ref: string; created_at: string }; Insert: { token_hash: string; project_ref: string; expires_at: string }; Update: Partial<TokenRow>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const globalForSupabase = globalThis as unknown as { supabaseAdmin?: ReturnType<typeof createClient<Database>> };

function supabase() {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured.");
  globalForSupabase.supabaseAdmin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return globalForSupabase.supabaseAdmin;
}

function assertPortal(projectRef: string) {
  if (projectRef !== CLIENT_PORTAL.projectRef) throw new Error("Unknown client portal.");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function ensurePortal(projectRef: string) {
  assertPortal(projectRef);
  const db = supabase();
  const { data, error } = await db.from("client_portals").select("project_ref,published,email,access_code").eq("project_ref", projectRef).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: createError } = await db.from("client_portals").insert({ project_ref: projectRef, published: CLIENT_PORTAL_DEFAULT_CONFIG.published, email: CLIENT_PORTAL_DEFAULT_CONFIG.email, access_code: CLIENT_PORTAL_DEFAULT_CONFIG.accessCode }).select("project_ref,published,email,access_code").single();
  if (createError) throw createError;
  return created;
}

export async function getPortalConfig(projectRef: string): Promise<ClientPortalConfig> {
  const row = await ensurePortal(projectRef);
  return { published: row.published, email: row.email, accessCode: row.access_code };
}

export async function updatePortalConfig(projectRef: string, config: ClientPortalConfig) {
  assertPortal(projectRef);
  const { error } = await supabase().from("client_portals").upsert({ project_ref: projectRef, published: config.published, email: config.email.trim().toLowerCase(), access_code: config.accessCode.trim().toUpperCase() });
  if (error) throw error;
  return getPortalConfig(projectRef);
}

export async function getPortalActivity(projectRef: string): Promise<ClientPortalActivity> {
  assertPortal(projectRef);
  const { data, error } = await supabase().from("client_portal_activity").select("favorites_json,rating,tags_json,feedback_sent,selects_submitted,selects_submitted_at,feedback_submitted_at,last_accessed_at,download_count,last_downloaded_at").eq("project_ref", projectRef).maybeSingle();
  if (error) throw error;
  if (!data) return { favorites: {}, rating: 0, tags: {}, feedbackSent: false, selectsSubmitted: false, selectsSubmittedAt: null, feedbackSubmittedAt: null, lastAccessedAt: null, downloadCount: 0, lastDownloadedAt: null };
  return { favorites: data.favorites_json, rating: data.rating, tags: data.tags_json, feedbackSent: data.feedback_sent, selectsSubmitted: data.selects_submitted, selectsSubmittedAt: data.selects_submitted_at, feedbackSubmittedAt: data.feedback_submitted_at, lastAccessedAt: data.last_accessed_at, downloadCount: data.download_count, lastDownloadedAt: data.last_downloaded_at };
}

export async function updatePortalActivity(projectRef: string, activity: ClientPortalActivity) {
  assertPortal(projectRef);
  const existing = await getPortalActivity(projectRef);
  const now = new Date().toISOString();
  const { error } = await supabase().from("client_portal_activity").upsert({ project_ref: projectRef, favorites_json: activity.favorites, rating: activity.rating, tags_json: activity.tags, feedback_sent: activity.feedbackSent, selects_submitted: activity.selectsSubmitted, selects_submitted_at: existing.selectsSubmittedAt ?? (activity.selectsSubmitted ? now : null), feedback_submitted_at: existing.feedbackSubmittedAt ?? (activity.feedbackSent ? now : null) });
  if (error) throw error;
}

export async function createPortalAccessToken(projectRef: string) {
  assertPortal(projectRef);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const db = supabase();
  const { error: deleteError } = await db.from("client_portal_tokens").delete().eq("project_ref", projectRef);
  if (deleteError) throw deleteError;
  const { error } = await db.from("client_portal_tokens").insert({ token_hash: hashToken(token), project_ref: projectRef, expires_at: expiresAt });
  if (error) throw error;
  return { token, expiresAt };
}

export async function getPortalAccessTokenExpiry(projectRef: string, token: string) {
  assertPortal(projectRef);
  if (!token || token.length > 512) return null;
  const { data, error } = await supabase().from("client_portal_tokens").select("expires_at").eq("token_hash", hashToken(token)).eq("project_ref", projectRef).maybeSingle();
  if (error) throw error;
  return data && new Date(data.expires_at).getTime() > Date.now() ? data.expires_at : null;
}

export async function verifyPortalTokenAccess(projectRef: string, token: string) {
  const config = await getPortalConfig(projectRef);
  return config.published && Boolean(await getPortalAccessTokenExpiry(projectRef, token));
}

export async function recordPortalAccess(projectRef: string) {
  assertPortal(projectRef);
  const activity = await getPortalActivity(projectRef);
  const { error } = await supabase().from("client_portal_activity").upsert({ project_ref: projectRef, favorites_json: activity.favorites, rating: activity.rating, tags_json: activity.tags, feedback_sent: activity.feedbackSent, selects_submitted: activity.selectsSubmitted, selects_submitted_at: activity.selectsSubmittedAt, feedback_submitted_at: activity.feedbackSubmittedAt, last_accessed_at: new Date().toISOString(), download_count: activity.downloadCount, last_downloaded_at: activity.lastDownloadedAt });
  if (error) throw error;
}

export async function recordPortalDownload(projectRef: string) {
  const activity = await getPortalActivity(projectRef);
  await updatePortalActivity(projectRef, { ...activity, downloadCount: activity.downloadCount + 1, lastDownloadedAt: new Date().toISOString() });
}

export async function getPortalStatus(projectRef: string) {
  const config = await getPortalConfig(projectRef);
  const { data, error } = await supabase().from("client_portal_tokens").select("expires_at").eq("project_ref", projectRef).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return { published: config.published, linkExpiresAt: data?.expires_at ?? null, linkActive: Boolean(data && new Date(data.expires_at).getTime() > Date.now()) };
}
