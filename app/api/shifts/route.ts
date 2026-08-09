import { NextRequest, NextResponse } from "next/server";
import { getShifts } from "@/lib/server/shifts-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!await getStaffPrincipal(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart") || new Date().toISOString().slice(0, 10);
    const data = await getShifts(weekStart);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
