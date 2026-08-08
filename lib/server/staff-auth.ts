import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";

const COOKIE_NAME = "kahel_staff_access_token";
const REFRESH_COOKIE_NAME = "kahel_staff_refresh_token";

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

export const IS_PRODUCTION = (process.env.APP_ENV as string) === "production" || process.env.NODE_ENV === "production";

type AuthConfig = {
  emails: Set<string>;
  url: string;
  publishableKey: string;
  redirectUrl: string;
};

export function authenticationDisabled() {
  return process.env.KAHEL_AUTH_DISABLED === "true";
}

function config(): AuthConfig | null {
  const emailList = process.env.KAHEL_STAFF_EMAILS ?? process.env.KAHEL_STAFF_EMAIL;
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const redirectUrl = process.env.AUTH_REDIRECT_URL;
  const emails = new Set(emailList?.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!emails.size || !url || !publishableKey || !redirectUrl) return null;
  return { emails, url, publishableKey, redirectUrl };
}

function client(settings: AuthConfig, accessToken?: string) {
  return createClient(settings.url, settings.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function isAllowedStaffEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith("@kahelstudio.com")) return true;
  const match = normalized.match(/^([^@]+)@gmail\.com$/);
  if (!match) return false;
  return match[1].includes("kahelstudio");
}

function isStaffEmail(email: string | undefined, settings: AuthConfig) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (settings.emails.has(normalized)) return true;
  return isAllowedStaffEmail(normalized);
}

export function staffEmailAuthorized(email: string | undefined) {
  const settings = config();
  return Boolean(settings && isStaffEmail(email, settings));
}

function accessTokenFromRequest(request: Request) {
  return request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`))?.[1];
}

export type StaffPrincipal = {
  userId: string | null;
  email: string;
  role: "super_admin" | "admin" | "staff";
  permissions: string[];
  accessToken: string | null;
};

export async function getStaffPrincipal(request: Request): Promise<StaffPrincipal | null> {
  if (authenticationDisabled()) {
    return { userId: null, email: "development@kahel.local", role: "super_admin", permissions: ["loyalty.read", "loyalty.issue", "loyalty.correct_progress", "loyalty.exclude_booking", "loyalty.restore_booking", "loyalty.cancel_reward", "loyalty.reinstate_reward", "loyalty.redeem_reward", "loyalty.resend", "galleries.read", "galleries.manage", "galleries.publish"], accessToken: null };
  }
  const settings = config();
  const accessToken = accessTokenFromRequest(request);
  if (!settings || !accessToken) return null;
  const { data, error } = await client(settings).auth.getUser(accessToken);
  const user = data.user;
  if (error || !user?.email || !isStaffEmail(user.email, settings)) return null;

  const admin = getSupabaseAdmin();
  let { data: profile, error: profileError } = await admin.from("staff_profiles")
    .select("user_id,role,active,can_manage_bookings,can_manage_loyalty,can_manage_rewards,can_manage_galleries")
    .eq("user_id", user.id).maybeSingle<{ user_id: string; role: "super_admin" | "admin" | "staff"; active: boolean; can_manage_bookings: boolean; can_manage_loyalty: boolean; can_manage_rewards: boolean; can_manage_galleries: boolean }>();
  if (profileError) return null;
  if (!profile) {
    const configuredEmails = [...settings.emails];
    const firstConfiguredEmail = configuredEmails[0];
    const secondConfiguredEmail = configuredEmails[1];
    const normalizedEmail = user.email.trim().toLowerCase();
    const role = normalizedEmail === firstConfiguredEmail ? "super_admin" as const
      : normalizedEmail === secondConfiguredEmail ? "admin" as const
      : "staff" as const;
    const hasAllPermissions = role !== "staff";
    const created = await admin.from("staff_profiles").insert({
      user_id: user.id,
      role,
      display_name: user.user_metadata?.full_name || user.email,
      active: true,
      can_manage_bookings: hasAllPermissions,
      can_manage_loyalty: hasAllPermissions,
      can_manage_rewards: hasAllPermissions,
      can_manage_galleries: hasAllPermissions,
    }).select("user_id,role,active,can_manage_bookings,can_manage_loyalty,can_manage_rewards,can_manage_galleries")
      .single<typeof profile>();
    profile = created.data;
    profileError = created.error;
  }
  if (profileError || !profile?.active) return null;
  const configuredEmails = [...settings.emails];
  const normalizedEmail = user.email.trim().toLowerCase();
  if (profile.role === "staff" && normalizedEmail === configuredEmails[1]) {
    const { data: upgraded, error: upgradeError } = await admin.from("staff_profiles").update({
      role: "admin",
      can_manage_bookings: true,
      can_manage_loyalty: true,
      can_manage_rewards: true,
      can_manage_galleries: true,
    }).eq("user_id", user.id).select("user_id,role,active,can_manage_bookings,can_manage_loyalty,can_manage_rewards,can_manage_galleries").single<typeof profile>();
    if (!upgradeError && upgraded) {
      profile = upgraded;
    }
  }
  const permissions = ["loyalty.read"];
  if (profile.role !== "staff" || profile.can_manage_loyalty) permissions.push("loyalty.correct_progress", "loyalty.exclude_booking", "loyalty.restore_booking", "loyalty.resend");
  if (profile.role !== "staff" || profile.can_manage_rewards) permissions.push("loyalty.issue", "loyalty.cancel_reward", "loyalty.reinstate_reward", "loyalty.redeem_reward");
  if (profile.role !== "staff" || profile.can_manage_galleries) permissions.push("galleries.read", "galleries.manage");
  if (profile.role !== "staff") permissions.push("galleries.publish");
  return { userId: user.id, email: user.email, role: profile.role, permissions, accessToken };
}

export function staffAuthConfigured() {
  return authenticationDisabled() || Boolean(config());
}

export async function signInStaff(email: string, password: string) {
  const settings = config();
  if (!settings || !isStaffEmail(email, settings)) return null;
  const { data, error } = await client(settings).auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  return !error && data.session && isStaffEmail(data.user?.email, settings) ? data.session : null;
}

export async function requestPasswordReset(email: string) {
  const settings = config();
  if (!settings || !isStaffEmail(email, settings)) return false;
  const { error } = await client(settings).auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: settings.redirectUrl });
  return !error;
}

export async function updateStaffPassword(accessToken: string, password: string) {
  const settings = config();
  if (!settings) return false;
  const supabase = client(settings, accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isStaffEmail(data.user.email, settings)) return false;
  const admin = getSupabaseAdmin();
  const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, { password });
  return !updateError;
}

export async function hasStaffSession(request: Request) {
  return Boolean(await getStaffPrincipal(request));
}

export async function tryRefreshStaffSession(request: Request) {
  const settings = config();
  if (!settings) return null;
  const refreshToken = refreshTokenFromRequest(request);
  if (!refreshToken) return null;
  const { data, error } = await client(settings).auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user?.email || !isStaffEmail(data.user.email, settings)) return null;
  return data.session;
}

function refreshTokenFromRequest(request: Request) {
  return request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${REFRESH_COOKIE_NAME}=([^;]+)`))?.[1];
}

export const STAFF_SESSION_COOKIE = COOKIE_NAME;
export const STAFF_REFRESH_COOKIE = REFRESH_COOKIE_NAME;
export { REMEMBER_ME_MAX_AGE };
