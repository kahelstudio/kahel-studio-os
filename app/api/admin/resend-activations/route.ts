import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { sendResendEmail } from "@/lib/resend-email";

export const runtime = "nodejs";

type InvitedProfile = {
  profile_id: string;
  first_name: string;
  email: string;
  user_id: string;
  client_id: string;
  latest_booking: string | null;
  service_date: string | null;
  booking_id: string | null;
};

export async function GET(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal || !["admin", "super_admin"].includes(principal.role)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_invited_customers_for_reactivation" as never) as unknown as { data: InvitedProfile[] | null; error: { message?: string } | null };

  if (error) {
    // Fallback: raw query if RPC not available
    const result = await admin.from("client_profiles" as never).select(`
      id,
      first_name,
      email,
      user_id,
      client_id,
      status
    `).eq("status" as never, "invited").not("user_id" as never, "is", null);
    const profiles = (result.data ?? []) as Array<{ id: string; first_name: string; email: string; user_id: string; client_id: string }>;
    return NextResponse.json({ count: profiles.length, profiles: profiles.map((p) => ({ profile_id: p.id, first_name: p.first_name, email: p.email, client_id: p.client_id })) });
  }

  return NextResponse.json({ count: data?.length ?? 0, profiles: data ?? [] });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal || !["admin", "super_admin"].includes(principal.role)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;
  const replyTo = process.env.BOOKING_EMAIL_REPLY_TO;
  const callbackBase = process.env.CUSTOMER_AUTH_CALLBACK_URL ?? `${process.env.PUBLIC_SITE_URL}/auth/callback`;
  if (!apiKey || !from || !replyTo) return NextResponse.json({ error: "Email is not configured." }, { status: 503 });

  const admin = getSupabaseAdmin();

  // Fetch all invited customers with their most recent booking
  const { data: profiles, error: profileError } = await admin.from("client_profiles" as never).select(`
    id,
    first_name,
    email,
    user_id,
    client_id,
    status
  `).eq("status" as never, "invited").not("user_id" as never, "is", null) as unknown as { data: Array<{ id: string; first_name: string; email: string; user_id: string; client_id: string; status: string }> | null; error: unknown };
  if (profileError || !profiles) return NextResponse.json({ error: "Unable to load invited customers." }, { status: 500 });

  const results: Array<{ email: string; booking: string | null; status: "sent" | "failed"; reason?: string }> = [];

  for (const profile of profiles) {
    try {
      // Get their most recent booking
      const { data: bookingData } = await admin.from("bookings" as never).select("id,reference,service_type,service_date,service_time").eq("client_id" as never, profile.client_id).order("created_at" as never, { ascending: false }).limit(1).maybeSingle() as unknown as { data: { id: string; reference: string; service_type: string; service_date: string; service_time: string } | null };

      const bookingPath = bookingData ? `/portal/bookings/${bookingData.reference}` : "/portal";
      const redirectTo = `${callbackBase}${callbackBase.includes("?") ? "&" : "?"}next=${encodeURIComponent(bookingPath)}`;

      // Generate a recovery link (user already exists in auth)
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: profile.email,
        options: { redirectTo },
      });
      if (linkError || !linkData.properties?.action_link) {
        results.push({ email: profile.email, booking: bookingData?.reference ?? null, status: "failed", reason: linkError?.message ?? "Failed to generate link" });
        continue;
      }

      const activationUrl = linkData.properties.action_link;
      const bookingRef = bookingData?.reference ?? null;
      const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
      const safeName = escHtml(profile.first_name);
      const safeUrl = escHtml(activationUrl);
      const bookingLine = bookingRef ? `<p><strong>Booking:</strong> ${escHtml(bookingRef)}</p>` : "";

      const html = `<div style="background:#f5f3ef;padding:32px 16px;font:16px/1.6 Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #dedbd5"><div style="padding:24px 32px;background:#171717;color:#fff;font-size:20px;font-weight:700">KAHEL STUDIO</div><div style="padding:32px"><h1 style="margin:0 0 16px;font-size:28px">Set up your Customer Portal access</h1><p>Hi ${safeName}, you have a booking with Kahel Studio but your portal account hasn't been activated yet.</p>${bookingLine}<p style="margin:20px 0 8px">Click below to set up your password and access your booking details:</p><p><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;background:#FF5300;color:#fff;text-decoration:none;font-weight:700;border-radius:4px">Set up portal access</a></p><p style="color:#888;font-size:14px">This link is unique to you and expires in 24 hours. Do not share it.</p><p style="color:#666;margin-top:24px">If you didn't book with us, you can ignore this email.</p></div></div></div>`;
      const text = `Set up your Customer Portal access\n\nHi ${profile.first_name}, you have a booking with Kahel Studio but your portal account hasn't been activated yet.${bookingRef ? `\nBooking: ${bookingRef}` : ""}\n\nSet up your password and access your booking:\n${activationUrl}\n\nThis link expires in 24 hours. Do not share it.\n\nIf you didn't book with us, you can ignore this email.`;

      await sendResendEmail(apiKey, {
        to: profile.email,
        from,
        replyTo,
        subject: "Set up your Kahel Studio portal access",
        html,
        text,
        idempotencyKey: `resend-activation-${profile.id}`,
      });

      results.push({ email: profile.email, booking: bookingRef, status: "sent" });
    } catch (err) {
      results.push({ email: profile.email, booking: null, status: "failed", reason: err instanceof Error ? err.message : "Unknown error" });
    }

    // Small delay to avoid hitting Resend rate limits
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  return NextResponse.json({ total: results.length, sent, failed, results }, { headers: { "Cache-Control": "no-store" } });
}
