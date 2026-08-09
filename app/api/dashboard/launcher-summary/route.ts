import { NextResponse } from "next/server";
import { getLauncherSummary } from "@/lib/server/dashboard-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await getStaffPrincipal(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json(await getLauncherSummary(), { headers: { "Cache-Control": "private, no-store" } });
}
