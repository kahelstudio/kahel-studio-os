import { NextResponse } from "next/server";
import { getPortalAccessTokenExpiry, getPortalActivity, getPortalConfig, recordPortalAccess, verifyPortalTokenAccess } from "@/lib/server/client-portal-db";
import { authenticationDisabled } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

function sessionCookieName(projectRef: string) {
  return `client_portal_access_${projectRef}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    const { projectRef } = await params;
    if (authenticationDisabled()) {
      return NextResponse.json({ published: true, authorized: true });
    }
    const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${sessionCookieName(projectRef)}=([^;]+)`))?.[1];
    const config = await getPortalConfig(projectRef);
    return NextResponse.json({ published: config.published, authorized: Boolean(token && await verifyPortalTokenAccess(projectRef, token)) });
  } catch (error) {
    const detail = error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown error";
    console.error("Client portal access lookup failed", detail);
    return NextResponse.json({ error: "Client portal not found." }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    const { projectRef } = await params;
    const { token } = await request.json() as { token?: unknown };
    if (!authenticationDisabled() && (typeof token !== "string" || !await verifyPortalTokenAccess(projectRef, token))) {
      return NextResponse.json({ error: "Invalid portal access." }, { status: 401 });
    }
    if (authenticationDisabled()) {
      await recordPortalAccess(projectRef);
      return NextResponse.json({ activity: await getPortalActivity(projectRef) });
    }
    if (typeof token !== "string") return NextResponse.json({ error: "Invalid portal access." }, { status: 401 });
    const expiresAt = await getPortalAccessTokenExpiry(projectRef, token);
    if (!expiresAt) return NextResponse.json({ error: "Invalid portal access." }, { status: 401 });
    await recordPortalAccess(projectRef);
    const response = NextResponse.json({ activity: await getPortalActivity(projectRef) });
    response.cookies.set(sessionCookieName(projectRef), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(expiresAt),
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Client portal not found." }, { status: 404 });
  }
}
