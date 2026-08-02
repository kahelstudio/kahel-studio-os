import { NextResponse } from "next/server";
import { createPortalAccessToken } from "@/lib/server/client-portal-db";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

async function authorizeClientPortalTokens(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return false;
  if (principal.role === "super_admin" || principal.role === "admin") return true;
  return principal.permissions.includes("galleries.manage");
}

export async function POST(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    if (!await authorizeClientPortalTokens(request)) return NextResponse.json({ error: "Staff authorization required." }, { status: 401 });
    const { projectRef } = await params;
    const { token, expiresAt } = await createPortalAccessToken(projectRef);
    return NextResponse.json({ token, expiresAt });
  } catch {
    return NextResponse.json({ error: "Client portal not found." }, { status: 404 });
  }
}
