import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { activateCustomerProfile, setCustomerSessionCookies } from "@/lib/server/customer-auth";
import { getSupabaseAuthClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const SAFE_NEXT_RE = /^\/portal\//;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const rawNext = url.searchParams.get("next") ?? "";
  // Only allow redirects to the customer portal to prevent open redirect abuse.
  const next = SAFE_NEXT_RE.test(rawNext) ? rawNext : "";

  if (!tokenHash || (type !== "invite" && type !== "recovery")) return NextResponse.redirect(new URL("/set-password?error=invalid", url.origin));
  const { data, error } = await getSupabaseAuthClient().auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
  if (error || !data.session || !data.user) return NextResponse.redirect(new URL("/set-password?error=invalid", url.origin));
  const profile = await activateCustomerProfile(data.user);
  if (!profile) {
    await getSupabaseAuthClient(data.session.access_token).auth.signOut();
    return NextResponse.redirect(new URL("/set-password?error=profile", url.origin));
  }
  const destination = next ? `/set-password?next=${encodeURIComponent(next)}` : "/set-password";
  const response = NextResponse.redirect(new URL(destination, url.origin));
  setCustomerSessionCookies(response, data.session);
  return response;
}
