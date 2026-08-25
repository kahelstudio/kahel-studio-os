import { NextResponse } from "next/server";
import { getPortalActivity, recordPortalDownload, updatePortalActivity, verifyPortalTokenAccess, type ClientPortalActivity } from "@/lib/server/client-portal-db";
import { authenticationDisabled } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function hasPortalSession(request: Request, projectRef: string) {
  if (authenticationDisabled()) return true;
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${escapeRegExp(`client_portal_access_${projectRef}`)}=([^;]+)`))?.[1];
  return Boolean(token && await verifyPortalTokenAccess(projectRef, token));
}

const EMPTY_ACTIVITY: ClientPortalActivity = { favorites: {}, rating: 0, tags: {}, feedbackSent: false, selectsSubmitted: false, selectsSubmittedAt: null, feedbackSubmittedAt: null, lastAccessedAt: null, downloadCount: 0, lastDownloadedAt: null };

export async function GET(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    const { projectRef } = await params;
    if (!await hasPortalSession(request, projectRef)) return NextResponse.json({ error: "Portal authorization required." }, { status: 401 });
    return NextResponse.json({ activity: await getPortalActivity(projectRef) });
  } catch {
    if (authenticationDisabled()) return NextResponse.json({ activity: EMPTY_ACTIVITY });
    return NextResponse.json({ error: "Client portal not found." }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    const { projectRef } = await params;
    if (!await hasPortalSession(request, projectRef)) return NextResponse.json({ error: "Portal authorization required." }, { status: 401 });
    const activity = await request.json() as ClientPortalActivity;
    if (typeof activity.rating !== "number" || typeof activity.feedbackSent !== "boolean" || typeof activity.selectsSubmitted !== "boolean" || typeof activity.favorites !== "object" || typeof activity.tags !== "object") {
      return NextResponse.json({ error: "Invalid client activity." }, { status: 400 });
    }
    await updatePortalActivity(projectRef, activity);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to update client activity." }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectRef: string }> }) {
  try {
    const { projectRef } = await params;
    if (!await hasPortalSession(request, projectRef)) return NextResponse.json({ error: "Portal authorization required." }, { status: 401 });
    await recordPortalDownload(projectRef);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to record download activity." }, { status: 400 });
  }
}
