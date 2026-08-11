import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const manilaOffset = 8 * 60;
    const localOffset = now.getTimezoneOffset();
    const manila = new Date(now.getTime() + (manilaOffset + localOffset) * 60000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayIso = `${manila.getFullYear()}-${pad(manila.getMonth() + 1)}-${pad(manila.getDate())}`;

    const { data, error } = await admin
      .from("bookings")
      .select("service_date, service_time")
      .gte("service_date", todayIso)
      .not("status", "in", '("cancelled","inquiry")');

    if (error) throw error;

    const bookedSlots = (data ?? []).map((row) => ({
      date: (row.service_date as string).slice(0, 10),
      time: (row.service_time as string).slice(0, 5),
    }));

    return NextResponse.json({ bookedSlots }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ bookedSlots: [] });
  }
}
