import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { IS_PRODUCTION, REMEMBER_ME_MAX_AGE, staffEmailAuthorized, STAFF_REFRESH_COOKIE, STAFF_SESSION_COOKIE } from "@/lib/server/staff-auth";
import { createStaffOAuthStorage, oauthVerifierFromRequest, STAFF_OAUTH_VERIFIER_COOKIE } from "@/lib/server/staff-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const siteOrigin = process.env.PUBLIC_SITE_URL ?? origin;
  const code = searchParams.get("code");
  const verifier = oauthVerifierFromRequest(request);

  if (!code || !verifier) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Google sign-in was cancelled or expired.")}`, siteOrigin));
  }

  const oauthStorage = createStaffOAuthStorage(verifier);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
        storage: oauthStorage.storage,
        storageKey: oauthStorage.storageKey,
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user?.email) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Unable to complete Google sign-in.")}`, siteOrigin));
  }

  if (!staffEmailAuthorized(data.user.email)) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("This Google account is not authorized for staff access.")}`, siteOrigin));
  }

  const response = NextResponse.redirect(new URL("/os", siteOrigin));
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: IS_PRODUCTION, maxAge: REMEMBER_ME_MAX_AGE, path: "/" };
  response.cookies.set(STAFF_SESSION_COOKIE, data.session.access_token, cookieOptions);
  response.cookies.set(STAFF_REFRESH_COOKIE, data.session.refresh_token, cookieOptions);
  response.cookies.set(STAFF_OAUTH_VERIFIER_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: IS_PRODUCTION, maxAge: 0, path: "/api/staff/oauth/google/callback" });
  return response;
}
