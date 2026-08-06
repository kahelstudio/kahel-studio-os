import { NextRequest, NextResponse } from "next/server";
import { getShifts } from "@/lib/server/shifts-data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart") || new Date().toISOString().slice(0, 10);
    const data = await getShifts(weekStart);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
