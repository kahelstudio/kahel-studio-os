import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

async function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(provided)), crypto.subtle.digest("SHA-256", encoder.encode(expected))]);
  const a = new Uint8Array(left); const b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!await secretMatches(bearer, process.env.CRON_SECRET)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const result = await getSupabaseAdmin().rpc("approval_enqueue_due_notifications", {});
  if (result.error) return Response.json({ error: "Unable to enqueue approval reminders." }, { status: 500 });
  return Response.json({ queued: result.data });
}
