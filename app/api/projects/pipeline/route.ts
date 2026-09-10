import { NextResponse } from "next/server";
import { getProjectPipeline } from "@/lib/server/projects-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const pipeline = await getProjectPipeline();
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ pre: [], production: [], post: [] }, { status: 500 });
  }
}
