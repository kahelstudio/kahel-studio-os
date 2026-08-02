import { NextResponse } from "next/server";
import { authenticationDisabled } from "@/lib/server/staff-auth";
import { verifyPortalTokenAccess } from "@/lib/server/client-portal-db";
import { getLoyaltySummary, resolveProjectClientId } from "@/lib/server/loyalty";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    const { projectRef } = await params;
    const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )client_portal_access_${projectRef}=([^;]+)`))?.[1];
    if (!authenticationDisabled() && (!token || !await verifyPortalTokenAccess(projectRef, token))) {
      return NextResponse.json({ error: "Portal authorization required." }, { status: 401 });
    }
    const clientId = await resolveProjectClientId(projectRef);
    return NextResponse.json({ loyalty: clientId ? await getLoyaltySummary(clientId) : null });
  } catch {
    return NextResponse.json({ error: "Unable to load loyalty rewards." }, { status: 500 });
  }
}
