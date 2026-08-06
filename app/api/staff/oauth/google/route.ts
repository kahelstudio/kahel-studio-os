import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { staffAuthConfigured } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET() {
  if (!staffAuthConfigured()) {
    return NextResponse.json({ error: "Staff authentication is not configured." }, { status: 503 });
  }
  if (process.env.GOOGLE_AUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 503 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.PUBLIC_SITE_URL || process.env.AUTH_REDIRECT_URL?.replace(/\/reset-password$/, "")}/api/staff/oauth/google/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return NextResponse.json({ error: "Unable to initiate Google sign-in." }, { status: 502 });
  }
  return NextResponse.redirect(data.url);
}