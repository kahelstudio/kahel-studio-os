import { NextResponse } from "next/server";
import { getProjectPipeline } from "@/lib/server/projects-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pipeline = await getProjectPipeline();
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ pre: [], production: [], post: [] }, { status: 500 });
  }
}
