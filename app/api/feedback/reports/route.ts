import { NextResponse } from "next/server";
import { getFeedbackReports } from "@/lib/server/feedback-data";

export async function GET() {
  try {
    const reports = await getFeedbackReports();
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "Failed to fetch feedback reports" }, { status: 500 });
  }
}
