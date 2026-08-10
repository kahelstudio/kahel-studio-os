import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const result = await getSupabaseAdmin().rpc("approval_enqueue_due_notifications", {});
  if (result.error) return Response.json({ error: "Unable to enqueue approval reminders." }, { status: 500 });
  return Response.json({ queued: result.data });
}
