import { NextResponse } from "next/server";
import { signInStaffWithVerifiedEmail, STAFF_SESSION_COOKIE } from "@/lib/server/staff-auth";
import { OAUTH_STATE_COOKIE } from "../route";

export const runtime = "nodejs";

const SIMPLELOGIN_TOKEN_URL = "https://app.simplelogin.io/oauth2/token";
const SIMPLELOGIN_USERINFO_URL = "https://app.simplelogin.io/oauth2/userinfo";

function loginRedirect(request: Request, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url.toString());
}

function stateCookie(request: Request): string | null {
  const raw = request.headers.get("cookie")?.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${OAUTH_STATE_COOKIE}=`))?.slice(OAUTH_STATE_COOKIE.length + 1);
  return raw ? decodeURIComponent(raw) : null;
}

async function exchangeCodeForToken(code: string): Promise<string | null> {
  const response = await fetch(SIMPLELOGIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.SIMPLELOGIN_CLIENT_ID!,
      client_secret: process.env.SIMPLELOGIN_CLIENT_SECRET!,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json() as { access_token?: string };
  return data.access_token ?? null;
}

async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const response = await fetch(SIMPLELOGIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = await response.json() as { email?: string };
  return typeof data.email === "string" ? data.email : null;
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !returnedState) {
    return loginRedirect(request, "SimpleLogin sign-in was cancelled.");
  }

  const storedState = stateCookie(request);
  if (!storedState || storedState !== returnedState) {
    return loginRedirect(request, "OAuth session expired or invalid. Please try again.");
  }

  const slToken = await exchangeCodeForToken(code);
  if (!slToken) {
    return loginRedirect(request, "Unable to complete SimpleLogin sign-in. Please try again.");
  }

  const email = await fetchUserEmail(slToken);
  if (!email) {
    return loginRedirect(request, "Could not retrieve your email from SimpleLogin.");
  }

  const session = await signInStaffWithVerifiedEmail(email);
  if (!session) {
    return loginRedirect(request, "This SimpleLogin account is not authorized for staff access.");
  }

  const response = NextResponse.redirect(new URL("/os", request.url).toString());
  response.cookies.set(STAFF_SESSION_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: session.expires_in,
    path: "/",
  });
  clearStateCookie(response);
  return response;
}
