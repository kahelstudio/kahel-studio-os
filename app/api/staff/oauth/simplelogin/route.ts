import { NextResponse } from "next/server";
import { simpleLoginConfigured, staffAuthConfigured } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

const SIMPLELOGIN_AUTHORIZE_URL = "https://app.simplelogin.io/oauth2/authorize";
export const OAUTH_STATE_COOKIE = "kahel_sl_state";

export async function GET(request: Request) {
  if (!simpleLoginConfigured() || !staffAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=simplelogin_not_configured", request.url));
  }

  const state = crypto.randomUUID();
  const redirectUri = process.env.SIMPLELOGIN_REDIRECT_URI ?? new URL("/api/staff/oauth/simplelogin/callback", request.url).toString();

  const authUrl = new URL(SIMPLELOGIN_AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", process.env.SIMPLELOGIN_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, redirectUri }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 300,
    path: "/",
  });
  return response;
}
