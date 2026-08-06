import { NextRequest, NextResponse } from "next/server";
import { getTasksBoard, getMyTasks } from "@/lib/server/tasks-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine");

    if (mine) {
      const principal = await getStaffPrincipal(request);
      const userId = principal?.userId;
      if (!userId) return NextResponse.json([], { status: 401 });
      const tasks = await getMyTasks(userId);
      return NextResponse.json(tasks);
    }

    const data = await getTasksBoard();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ todo: [], doing: [], blocked: [], done: [] }, { status: 500 });
  }
}
