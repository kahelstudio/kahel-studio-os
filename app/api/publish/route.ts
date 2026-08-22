import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

// Roughly one Pages build per minute, coalescing publish bursts.
const DEBOUNCE_SECONDS = 60;
const PENDING_KEY = "pages-build:pending";

/**
 * POST /api/publish — fires the kahelstudio.com Pages deploy hook.
 *
 * Auth: the caller's Supabase access token as `Authorization: Bearer <token>`,
 * falling back to the staff session cookie. Verified through getStaffPrincipal
 * (Supabase /auth/v1/user + staff allowlist + active staff profile), so expired
 * or non-staff tokens are rejected. Cookie-authenticated calls must also come
 * from a trusted origin; Bearer calls need no origin check because the header
 * cannot be attached cross-origin by a browser.
 *
 * The deploy hook URL is the PAGES_DEPLOY_HOOK Worker secret. It never reaches
 * the client bundle; this route is the only place it is used.
 */
export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer && !hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const principal = await getStaffPrincipal(
    bearer ? new Request(request.url, { headers: { "x-staff-access-token": bearer } }) : request,
  );
  if (!principal) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { env } = await getCloudflareContext({ async: true });
  const kv = env.PUBLISH_KV;
  const deployHook = process.env.PAGES_DEPLOY_HOOK;
  if (!kv || !deployHook) {
    return NextResponse.json({ error: "Publishing is not configured in this environment." }, { status: 503 });
  }

  // A build is already pending inside the debounce window: coalesce.
  if (await kv.get(PENDING_KEY)) {
    return NextResponse.json({ queued: true });
  }
  await kv.put(PENDING_KEY, new Date().toISOString(), { expirationTtl: DEBOUNCE_SECONDS });

  let hookResponse: Response;
  try {
    hookResponse = await fetch(deployHook, { method: "POST", signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    console.error("Deploy hook request failed", error);
    await kv.delete(PENDING_KEY);
    return NextResponse.json({ error: "Unable to reach the deploy hook." }, { status: 502 });
  }
  if (!hookResponse.ok) {
    console.error("Deploy hook rejected", hookResponse.status);
    // Release the lock so staff can retry immediately after a failed build trigger.
    await kv.delete(PENDING_KEY);
    return NextResponse.json({ error: "Deploy hook failed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
