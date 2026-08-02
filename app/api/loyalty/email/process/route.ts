import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { processLoyaltyRewardEmail } from "@/lib/server/loyalty";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";

export const runtime = "nodejs";

async function secretMatches(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const principal = await getStaffPrincipal(request);
  const authorized = principal?.permissions.includes("loyalty.resend") || await secretMatches(bearer, process.env.LOYALTY_CRON_SECRET);
  if (!authorized) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let processed = 0;
  let sent = 0;
  for (let index = 0; index < 10; index += 1) {
    const result = await processLoyaltyRewardEmail();
    if (!result.processed) break;
    processed += 1;
    if (result.sent) sent += 1;
  }
  return NextResponse.json({ processed, sent, failed: processed - sent });
}
