import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { IS_PRODUCTION, staffAuthConfigured } from "@/lib/server/staff-auth";
import { createStaffOAuthStorage, STAFF_OAUTH_VERIFIER_COOKIE } from "@/lib/server/staff-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!staffAuthConfigured()) {
    return NextResponse.json({ error: "Staff authentication is not configured." }, { status: 503 });
  }
  if (process.env.GOOGLE_AUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 503 });
  }

  const oauthStorage = createStaffOAuthStorage();
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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${(process.env.PUBLIC_SITE_URL || process.env.AUTH_REDIRECT_URL?.replace(/\/reset-password$/, ""))?.replace(/\/$/, "")}/api/staff/oauth/google/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return NextResponse.json({ error: "Unable to initiate Google sign-in." }, { status: 502 });
  }
  const verifier = oauthStorage.verifier();
  if (!verifier) {
    return NextResponse.json({ error: "Unable to secure Google sign-in." }, { status: 502 });
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set(STAFF_OAUTH_VERIFIER_COOKIE, encodeURIComponent(verifier), {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    maxAge: 60 * 10,
    path: "/api/staff/oauth/google/callback",
  });
  return response;
}
