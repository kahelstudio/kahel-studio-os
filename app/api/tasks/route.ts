import { NextRequest, NextResponse } from "next/server";
import { getTasksBoard, getMyTasks } from "@/lib/server/tasks-data";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const principal = await getStaffPrincipal(request);
    if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine");

    if (mine) {
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

const statuses = new Set(["todo", "doing", "blocked", "done"]);
const priorities = new Set(["High", "Med", "Low"]);

export async function POST(request: NextRequest) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const value = (key: string, max = 500) => typeof body?.[key] === "string" ? String(body[key]).trim().slice(0, max) : "";
  const title = value("title"), status = value("status"), priority = value("priority"), category = value("category", 64);
  if (!title || !category || !statuses.has(status) || !priorities.has(priority)) return NextResponse.json({ error: "Complete the task title, category, status, and priority." }, { status: 400 });
  const result = await getSupabaseAdmin().from("tasks").insert({ title, description: value("context", 1000) || null, column_status: status, priority, category, assignee: value("assignee", 255) === "Unassigned" ? null : value("assignee", 255), due_date: value("dueDate", 10) || null, created_by: principal.userId }).select("id").single();
  if (result.error || !result.data) return NextResponse.json({ error: "Unable to create the task." }, { status: 500 });
  return NextResponse.json(result.data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const principal = await getStaffPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
  if (typeof body?.title === "string" && !body.title.trim()) return NextResponse.json({ error: "Task title cannot be empty." }, { status: 400 });
  if (typeof body?.category === "string" && !body.category.trim()) return NextResponse.json({ error: "Task category cannot be empty." }, { status: 400 });
  if (typeof body?.dueDate === "string" && body.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) return NextResponse.json({ error: "Enter a valid due date." }, { status: 400 });
  const update: { updated_at: string; column_status?: string; title?: string; description?: string | null; category?: string; priority?: string; assignee?: string | null; due_date?: string | null } = { updated_at: new Date().toISOString() };
  if (typeof body?.status === "string" && statuses.has(body.status)) update.column_status = body.status;
  if (typeof body?.title === "string") update.title = body.title.trim();
  if (typeof body?.context === "string") update.description = body.context.trim() || null;
  if (typeof body?.category === "string") update.category = body.category.trim();
  if (typeof body?.priority === "string" && priorities.has(body.priority)) update.priority = body.priority;
  if (typeof body?.assignee === "string") update.assignee = body.assignee === "Unassigned" ? null : body.assignee;
  if (typeof body?.dueDate === "string") update.due_date = body.dueDate || null;
  const result = await getSupabaseAdmin().from("tasks").update(update).eq("id", id).select("id").single();
  if (result.error || !result.data) return NextResponse.json({ error: "Unable to update the task." }, { status: 500 });
  return NextResponse.json(result.data);
}
