import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";
import { sendRecoveryPasswordLink } from "./security-email";
import { recordSupabaseAuthEmailRequest } from "./transactional-email-service";

const COOKIE_NAME = "kahel_staff_access_token";
const REFRESH_COOKIE_NAME = "kahel_staff_refresh_token";

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

export const IS_PRODUCTION = (process.env.APP_ENV as string) === "production" || process.env.NODE_ENV === "production";

type AuthConfig = {
  url: string;
  publishableKey: string;
  redirectUrl: string;
};

export function authenticationDisabled() {
  const environment = process.env.APP_ENV as string | undefined;
  return environment !== "production" && process.env.KAHEL_AUTH_DISABLED === "true";
}

function config(): AuthConfig | null {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const redirectUrl = process.env.AUTH_REDIRECT_URL;
  if (!url || !publishableKey || !redirectUrl) return null;
  return { url, publishableKey, redirectUrl };
}

function client(settings: AuthConfig, accessToken?: string) {
  return createClient(settings.url, settings.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function canonicalStaffEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

type ActiveStaffProfile = {
  user_id: string;
  role: "super_admin" | "admin" | "staff";
  active: boolean;
  can_manage_bookings: boolean;
  can_manage_loyalty: boolean;
  can_manage_rewards: boolean;
  can_manage_galleries: boolean;
};

async function activeStaffProfile(userId: string) {
  const result = await getSupabaseAdmin().from("staff_profiles")
    .select("user_id,role,active,can_manage_bookings,can_manage_loyalty,can_manage_rewards,can_manage_galleries")
    .eq("user_id", userId).maybeSingle<ActiveStaffProfile>();
  return result.error || !result.data?.active ? null : result.data;
}

export async function isApprovedStaffUser(userId: string) {
  return Boolean(await activeStaffProfile(userId));
}

function accessTokenFromRequest(request: Request) {
  const headerToken = request.headers.get("x-staff-access-token");
  if (headerToken) return headerToken;
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
    return { userId: null, email: "development@kahel.local", role: "super_admin", permissions: ["bookings.manage", "loyalty.read", "loyalty.issue", "loyalty.correct_progress", "loyalty.exclude_booking", "loyalty.restore_booking", "loyalty.cancel_reward", "loyalty.reinstate_reward", "loyalty.redeem_reward", "loyalty.resend", "galleries.read", "galleries.manage", "galleries.publish"], accessToken: null };
  }
  const settings = config();
  const accessToken = accessTokenFromRequest(request);
  if (!settings || !accessToken) return null;
  const { data, error } = await client(settings).auth.getUser(accessToken);
  const user = data.user;
  const email = canonicalStaffEmail(user?.email);
  if (error || !user || !email) return null;
  const assurance = await client(settings, accessToken).auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error || (assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2")) return null;

  const profile = await activeStaffProfile(user.id);
  if (!profile) return null;
  const permissions = ["loyalty.read"];
  if (profile.role !== "staff" || profile.can_manage_bookings) permissions.push("bookings.manage");
  if (profile.role !== "staff" || profile.can_manage_loyalty) permissions.push("loyalty.correct_progress", "loyalty.exclude_booking", "loyalty.restore_booking", "loyalty.resend");
  if (profile.role !== "staff" || profile.can_manage_rewards) permissions.push("loyalty.issue", "loyalty.cancel_reward", "loyalty.reinstate_reward", "loyalty.redeem_reward");
  if (profile.role !== "staff" || profile.can_manage_galleries) permissions.push("galleries.read", "galleries.manage");
  if (profile.role !== "staff") permissions.push("galleries.publish");
  return { userId: user.id, email, role: profile.role, permissions, accessToken };
}

export async function hasAuthenticatedStaffIdentity(request: Request) {
  const settings = config();
  const accessToken = accessTokenFromRequest(request);
  if (!settings || !accessToken) return false;
  const { data, error } = await client(settings).auth.getUser(accessToken);
  return !error && Boolean(data.user && canonicalStaffEmail(data.user.email));
}

export function staffAuthConfigured() {
  return authenticationDisabled() || Boolean(config());
}

export async function signInStaff(email: string, password: string) {
  const settings = config();
  if (!settings) return { session: null, forbidden: false } as const;
  const { data, error } = await client(settings).auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.session || !data.user || !canonicalStaffEmail(data.user.email)) return { session: null, forbidden: false } as const;
  if (!await isApprovedStaffUser(data.user.id)) return { session: null, forbidden: true } as const;
  return { session: data.session, forbidden: false } as const;
}

export async function requestPasswordReset(email: string) {
  const settings = config();
  if (!settings) return false;
  const normalized = email.trim().toLowerCase();
  const admin = getSupabaseAdmin();
  const users = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) return false;
  const primaryUser = users.data.users.find((item) => item.email?.toLowerCase() === normalized);
  if (primaryUser && await isApprovedStaffUser(primaryUser.id)) {
    const { error } = await client(settings).auth.resetPasswordForEmail(normalized, { redirectTo: settings.redirectUrl });
    if (!error) await recordSupabaseAuthEmailRequest({
      templateKey: "supabase-auth-password-reset", operationId: crypto.randomUUID(), to: normalized,
      recipientUserId: primaryUser.id, sourceReference: "staff-primary",
    });
    return !error;
  }
  const recovery = await admin.from("staff_recovery_emails").select("staff_id").eq("recovery_email", normalized).maybeSingle<{ staff_id: string }>();
  if (recovery.error || !recovery.data) return false;
  const recoveryStaffId = recovery.data.staff_id;
  const user = users.data.users.find((item) => item.id === recoveryStaffId);
  if (!user?.email || !await isApprovedStaffUser(user.id)) return false;
  const link = await admin.auth.admin.generateLink({ type: "recovery", email: user.email, options: { redirectTo: settings.redirectUrl } });
  if (link.error) return false;
  const resetUrl = new URL(settings.redirectUrl);
  resetUrl.searchParams.set("token_hash", link.data.properties.hashed_token);
  resetUrl.searchParams.set("type", "recovery");
  return sendRecoveryPasswordLink(normalized, resetUrl.toString());
}

export async function updateStaffPassword(accessToken: string, password: string) {
  const settings = config();
  if (!settings) return false;
  const supabase = client(settings, accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !canonicalStaffEmail(data.user.email) || !await isApprovedStaffUser(data.user.id)) return false;
  const admin = getSupabaseAdmin();
  const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, { password });
  return !updateError;
}

export async function updateStaffPasswordWithRecoveryToken(tokenHash: string, password: string) {
  const settings = config();
  if (!settings) return false;
  const supabase = client(settings);
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (error || !data.session || !data.user || !canonicalStaffEmail(data.user.email) || !await isApprovedStaffUser(data.user.id)) return false;
  return updateStaffPassword(data.session.access_token, password);
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
  if (error || !data.session || !data.user || !canonicalStaffEmail(data.user.email)) return null;
  const assurance = await client(settings, data.session.access_token).auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error || (assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2")) return null;
  if (!await isApprovedStaffUser(data.user.id)) return null;
  return data.session;
}

function refreshTokenFromRequest(request: Request) {
  return request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${REFRESH_COOKIE_NAME}=([^;]+)`))?.[1];
}

export const STAFF_SESSION_COOKIE = COOKIE_NAME;
export const STAFF_REFRESH_COOKIE = REFRESH_COOKIE_NAME;
export { REMEMBER_ME_MAX_AGE };
