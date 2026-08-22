import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getActiveStaffDirectory } from "@/lib/server/staff-directory-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await getStaffPrincipal(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getActiveStaffDirectory());
  } catch {
    return NextResponse.json({ error: "Unable to load staff." }, { status: 500 });
  }
}
