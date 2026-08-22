import { NextResponse } from "next/server";
import { getRealBookings } from "@/lib/server/bookings-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!principal.permissions.includes("bookings.manage")) return NextResponse.json({ error: "Booking management permission is required." }, { status: 403 });
  try {
    const bookings = await getRealBookings();
    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
