import { NextResponse } from "next/server";
import { getCurrentBookingTerms } from "@/lib/server/legal-documents";

export async function GET() {
  const terms = await getCurrentBookingTerms();
  if (!terms) return NextResponse.json({ error: "Booking terms are not currently available." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ terms }, { headers: { "Cache-Control": "public, max-age=60, must-revalidate" } });
}
