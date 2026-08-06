import { NextResponse } from "next/server";
import { getRealBookings } from "@/lib/server/bookings-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bookings = await getRealBookings();
    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}