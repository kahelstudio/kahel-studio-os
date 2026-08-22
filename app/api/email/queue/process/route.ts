import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { processTransactionalEmailQueue } from "@/lib/server/transactional-email-service";

export const runtime = "nodejs";

async function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(provided)), crypto.subtle.digest("SHA-256", encoder.encode(expected))]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const scheduled = await secretMatches(bearer, process.env.EMAIL_QUEUE_SECRET);
  const principal = scheduled ? null : await getStaffPrincipal(request);
  if (!scheduled && (!principal || !hasTrustedOrigin(request) || !["admin", "super_admin"].includes(principal.role))) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const result = await processTransactionalEmailQueue({ limit: 25, workerId: scheduled ? "scheduled-api" : `staff:${principal!.userId ?? principal!.email}` });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
