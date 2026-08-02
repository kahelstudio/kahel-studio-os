import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getLoyaltyAdmin, performLoyaltyAdminAction, processLoyaltyRewardEmail } from "@/lib/server/loyalty";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ clientRef: string }> }) {
  const principal = await getStaffPrincipal(request);
  if (!principal?.permissions.includes("loyalty.read")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { clientRef } = await params;
    const data = await getLoyaltyAdmin(clientRef);
    if (!data) return NextResponse.json({ linked: false, client: null, loyaltyAccount: null, permissions: principal.permissions });
    return NextResponse.json({ ...data, permissions: principal.permissions });
  } catch {
    return NextResponse.json({ error: "Unable to load loyalty administration." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ clientRef: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 16_384) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const { clientRef } = await params;
    const body = await request.json() as { action?: unknown; targetId?: unknown; value?: unknown; reason?: unknown };
    if (typeof body.action !== "string" || typeof body.reason !== "string" || (body.targetId !== undefined && typeof body.targetId !== "string") || (body.value !== undefined && typeof body.value !== "number")) {
      return NextResponse.json({ error: "Invalid loyalty action." }, { status: 400 });
    }
    await performLoyaltyAdminAction(principal, clientRef, { action: body.action, targetId: body.targetId, value: body.value, reason: body.reason });
    if (body.action === "issue") await processLoyaltyRewardEmail();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && ["Forbidden", "A reason is required.", "Client not found.", "Unsupported loyalty action."].includes(error.message) ? error.message : "Unable to complete loyalty action.";
    const status = message === "Forbidden" ? 403 : message === "Unable to complete loyalty action." ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
