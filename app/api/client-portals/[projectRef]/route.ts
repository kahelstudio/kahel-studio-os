import { NextResponse } from "next/server";
import { getPortalActivity, getPortalConfig, getPortalStatus, updatePortalConfig } from "@/lib/server/client-portal-db";
import type { ClientPortalConfig } from "@/lib/client-portal-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

async function authorizeClientPortal(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return false;
  if (principal.role === "super_admin" || principal.role === "admin") return true;
  return principal.permissions.includes("galleries.manage");
}

export async function GET(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    if (!await authorizeClientPortal(request)) return NextResponse.json({ error: "Staff authorization required." }, { status: 401 });
    const { projectRef } = await params;
    const [config, activity, status] = await Promise.all([getPortalConfig(projectRef), getPortalActivity(projectRef), getPortalStatus(projectRef)]);
    return NextResponse.json({ config, activity, status });
  } catch {
    return NextResponse.json({ error: "Client portal not found." }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    if (!await authorizeClientPortal(request)) return NextResponse.json({ error: "Staff authorization required." }, { status: 401 });
    const { projectRef } = await params;
    const config = await request.json() as ClientPortalConfig;
    if (typeof config.published !== "boolean" || typeof config.email !== "string" || typeof config.accessCode !== "string" || !config.email.trim() || !config.accessCode.trim()) {
      return NextResponse.json({ error: "Published state, email, and access code are required." }, { status: 400 });
    }
    return NextResponse.json({ config: await updatePortalConfig(projectRef, config) });
  } catch {
    return NextResponse.json({ error: "Unable to update client portal." }, { status: 400 });
  }
}
