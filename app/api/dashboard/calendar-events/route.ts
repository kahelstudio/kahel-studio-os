import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/server/bookings-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await getStaffPrincipal(request))) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const events = await getCalendarEvents(month, year);
  return NextResponse.json({ events }, { headers: { "Cache-Control": "private, no-store" } });
}
