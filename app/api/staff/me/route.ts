import { NextResponse } from "next/server";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ role: principal.role, permissions: principal.permissions });
}
