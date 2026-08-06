import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signInStaffWithVerifiedEmail, STAFF_SESSION_COOKIE } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Google sign-in was cancelled.")}`, origin));
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user?.email) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Unable to complete Google sign-in.")}`, origin));
  }

  const session = await signInStaffWithVerifiedEmail(data.user.email);
  if (!session) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("This Google account is not authorized for staff access.")}`, origin));
  }

  const response = NextResponse.redirect(new URL("/os", origin));
  response.cookies.set(STAFF_SESSION_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: session.expires_in,
    path: "/",
  });
  return response;
}