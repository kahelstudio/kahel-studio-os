import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseAdmin, getSupabaseAuthClient } from "./supabase-admin";
import type { Json } from "./supabase-database";

export const CUSTOMER_ACCESS_COOKIE = "kahel_customer_access_token";
export const CUSTOMER_REFRESH_COOKIE = "kahel_customer_refresh_token";

export type CustomerIdentity = {
  user: User;
  profileId: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
};

type CustomerProfile = {
  id: string;
  client_id: string;
  user_id: string | null;
  email: string;
  normalized_email: string;
  first_name: string;
  last_name: string;
  mobile: string | null;
  status: "invited" | "active" | "disabled";
  email_verified_at: string | null;
};

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  priority: "high" as const,
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeMobile(mobile: string) {
  const trimmed = mobile.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+63${digits.slice(1)}`;
  return trimmed;
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isSafePortalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return false;
  try {
    const url = new URL(value, "https://kahel.invalid");
    return url.origin === "https://kahel.invalid" && (url.pathname === "/portal" || url.pathname.startsWith("/portal/"));
  } catch {
    return false;
  }
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === new URL(request.url).origin;
}

export function customerCallbackUrl() {
  const configured = process.env.CUSTOMER_AUTH_CALLBACK_URL;
  if (!configured) throw new Error("Customer Auth callback is not configured.");
  const url = new URL(configured);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Customer Auth callback must use HTTPS.");
  return url.toString();
}

function staffEmails() {
  return new Set((process.env.KAHEL_STAFF_EMAILS ?? process.env.KAHEL_STAFF_EMAIL ?? "")
    .split(",").map(normalizeEmail).filter(Boolean));
}

export function isStaffAddress(email: string | null | undefined) {
  return email ? staffEmails().has(normalizeEmail(email)) : false;
}

function cookieValue(request: Request, name: string) {
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : undefined;
}

export function setCustomerSessionCookies(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }, session: Session) {
  response.cookies.set(CUSTOMER_ACCESS_COOKIE, session.access_token, { ...cookieOptions, maxAge: session.expires_in });
  response.cookies.set(CUSTOMER_REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export function clearCustomerSessionCookies(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }) {
  response.cookies.set(CUSTOMER_ACCESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(CUSTOMER_REFRESH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

async function identityForToken(accessToken: string | undefined): Promise<CustomerIdentity | null> {
  if (!accessToken) return null;
  const { data, error } = await getSupabaseAuthClient(accessToken).auth.getUser(accessToken);
  const user = data.user;
  if (error || !user?.email || !user.email_confirmed_at || isStaffAddress(user.email)) return null;
  const { data: profile, error: profileError } = await getSupabaseAdmin()
    .from("client_profiles")
    .select("id,client_id,user_id,email,normalized_email,first_name,last_name,mobile,status,email_verified_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<CustomerProfile>();
  if (profileError || !profile) return null;
  return {
    user,
    profileId: profile.id,
    clientId: profile.client_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    mobile: profile.mobile,
  };
}

export async function getCustomerIdentityFromRequest(request: Request) {
  return identityForToken(cookieValue(request, CUSTOMER_ACCESS_COOKIE));
}

export async function getCustomerIdentity() {
  const store = await cookies();
  return identityForToken(store.get(CUSTOMER_ACCESS_COOKIE)?.value);
}

export async function requireCustomerIdentity(next = "/portal") {
  const identity = await getCustomerIdentity();
  if (identity) return identity;
  const store = await cookies();
  const safeNext = isSafePortalPath(next) ? next : "/portal";
  if (store.has(CUSTOMER_REFRESH_COOKIE)) redirect(`/auth/refresh?next=${encodeURIComponent(safeNext)}`);
  redirect(`/sign-in?next=${encodeURIComponent(safeNext)}`);
}

export async function refreshCustomerSession(request: Request) {
  const refreshToken = cookieValue(request, CUSTOMER_REFRESH_COOKIE);
  if (!refreshToken) return null;
  const { data, error } = await getSupabaseAuthClient().auth.refreshSession({ refresh_token: refreshToken });
  return error ? null : data.session;
}

export async function getProfileByEmail(email: string) {
  const { data, error } = await getSupabaseAdmin().from("client_profiles")
    .select("id,client_id,user_id,email,normalized_email,first_name,last_name,mobile,status,email_verified_at")
    .eq("normalized_email", normalizeEmail(email)).maybeSingle<CustomerProfile>();
  if (error) throw error;
  return data;
}

export async function createCustomerProfile(input: { firstName: string; lastName: string; email: string; mobile?: string | null }) {
  const admin = getSupabaseAdmin();
  const email = normalizeEmail(input.email);
  const existing = await getProfileByEmail(email);
  if (existing) return existing;
  const { data: client, error: clientError } = await admin.from("clients")
    .insert({ name: `${input.firstName} ${input.lastName}`.trim(), external_ref: `cus-${crypto.randomUUID().slice(0, 12)}` }).select("id").single<{ id: string }>();
  if (clientError) throw clientError;
  const { data: profile, error: profileError } = await admin.from("client_profiles").insert({
    client_id: client.id,
    email,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    mobile: input.mobile ? normalizeMobile(input.mobile) : null,
    status: "invited",
  }).select("id,client_id,user_id,email,normalized_email,first_name,last_name,mobile,status,email_verified_at").single<CustomerProfile>();
  if (!profileError) return profile;
  await admin.from("clients").delete().eq("id", client.id);
  const concurrent = await getProfileByEmail(email);
  if (concurrent) return concurrent;
  throw profileError;
}

async function findAuthUser(email: string) {
  const admin = getSupabaseAdmin();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => normalizeEmail(user.email ?? "") === email);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  throw new Error("Auth user lookup exceeded the supported page limit.");
}

export async function auditCustomerEvent(event: {
  action: string;
  actorType?: "customer" | "staff" | "service" | "system";
  userId?: string | null;
  clientId?: string | null;
  profileId?: string | null;
  entityType?: string;
  entityId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, Json | undefined>;
}) {
  const { error } = await getSupabaseAdmin().from("customer_audit_log").insert({
    action: event.action,
    actor_type: event.actorType ?? "service",
    actor_user_id: event.userId ?? null,
    client_id: event.clientId ?? null,
    client_profile_id: event.profileId ?? null,
    entity_type: event.entityType ?? "customer_auth",
    entity_id: event.entityId ?? null,
    request_id: event.requestId ?? null,
    metadata: event.metadata ?? {},
  });
  if (error) console.error("Customer security audit write failed.");
}

export async function ensureCustomerAccount(profile: CustomerProfile, source: "signup" | "booking") {
  if (isStaffAddress(profile.email)) throw new Error("Staff identities cannot be linked to customer profiles.");
  if (profile.status === "disabled") throw new Error("Disabled customer profiles cannot request account access.");
  const admin = getSupabaseAdmin();
  const email = normalizeEmail(profile.email);
  let user = profile.user_id ? (await admin.auth.admin.getUserById(profile.user_id)).data.user : null;
  let invited = false;
  let createdUser = false;

  if (!user) user = await findAuthUser(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: customerCallbackUrl(),
      data: { first_name: profile.first_name, last_name: profile.last_name, account_type: "customer" },
    });
    if (error || !data.user) throw error ?? new Error("Customer invitation failed.");
    user = data.user;
    invited = true;
    createdUser = true;
  }

  const { error: linkError } = await admin.from("client_profiles").update({ user_id: user.id, status: profile.status === "active" ? "active" : "invited" }).eq("id", profile.id);
  if (linkError) {
    if (createdUser) await admin.auth.admin.deleteUser(user.id);
    throw linkError;
  }

  if (!invited) {
    const { error } = await getSupabaseAuthClient().auth.resetPasswordForEmail(email, { redirectTo: customerCallbackUrl() });
    if (error) throw error;
  }

  await auditCustomerEvent({
    action: invited ? "invitation_sent" : "password_setup_requested",
    userId: user.id,
    clientId: profile.client_id,
    profileId: profile.id,
    entityId: profile.id,
    metadata: { source },
  });
  if (createdUser) await auditCustomerEvent({ action: "account_created", userId: user.id, clientId: profile.client_id, profileId: profile.id, entityId: profile.id, metadata: { source } });
  return { user, invited };
}

export async function activateCustomerProfile(user: User) {
  if (!user.email || isStaffAddress(user.email)) return null;
  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin.from("client_profiles")
    .update({ status: "active", email_verified_at: user.email_confirmed_at ?? new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("normalized_email", normalizeEmail(user.email))
    .in("status", ["invited", "active"])
    .select("id,client_id").maybeSingle<{ id: string; client_id: string }>();
  if (error || !profile) return null;
  await auditCustomerEvent({ action: "email_verified", actorType: "customer", userId: user.id, clientId: profile.client_id, profileId: profile.id, entityId: profile.id });
  return profile;
}

export async function consumeCustomerRateLimit(request: Request, scope: string, email: string, maximumAttempts: number, window = "15 minutes") {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const material = new TextEncoder().encode(`${scope}|${ip}|${normalizeEmail(email)}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  const keyHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const { data, error } = await getSupabaseAdmin().rpc("consume_customer_auth_rate_limit", {
    requested_scope: scope,
    requested_key_hash: keyHash,
    maximum_attempts: maximumAttempts,
    window_duration: window,
  });
  if (error) throw error;
  return Boolean((data as Array<{ allowed: boolean }> | null)?.[0]?.allowed);
}
