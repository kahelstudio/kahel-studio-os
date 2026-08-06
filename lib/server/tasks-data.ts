/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  columnStatus: string;
  priority: string;
  category: string;
  assignee: string | null;
  dueDate: string | null;
  recurrence: string | null;
  linkedRef: string | null;
  sortOrder: number;
};

export type TasksBoard = {
  todo: TaskRow[];
  doing: TaskRow[];
  blocked: TaskRow[];
  done: TaskRow[];
};

export async function getTasksBoard(): Promise<TasksBoard> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("tasks")
      .select("id, title, description, column_status, priority, category, assignee, due_date, recurrence, linked_ref, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const map = (row: any): TaskRow => ({
      id: row.id,
      title: row.title,
      description: row.description,
      columnStatus: row.column_status,
      priority: row.priority,
      category: row.category,
      assignee: row.assignee,
      dueDate: row.due_date,
      recurrence: row.recurrence,
      linkedRef: row.linked_ref,
      sortOrder: row.sort_order,
    });

    const all = (data ?? []).map(map);

    return {
      todo: all.filter((t) => t.columnStatus === "todo"),
      doing: all.filter((t) => t.columnStatus === "doing"),
      blocked: all.filter((t) => t.columnStatus === "blocked"),
      done: all.filter((t) => t.columnStatus === "done"),
    };
  } catch (error) {
    console.error("getTasksBoard: table not available", (error as Error).message);
    return { todo: [], doing: [], blocked: [], done: [] };
  }
}

export async function getMyTasks(userId: string): Promise<TaskRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data: staffProfile, error: staffError } = await admin
      .from("staff_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (staffError || !staffProfile) {
      return [];
    }

    const name = (staffProfile as any).display_name;

    const { data, error } = await admin
      .from("tasks")
      .select("id, title, description, column_status, priority, category, assignee, due_date, recurrence, linked_ref, sort_order")
      .eq("assignee", name)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      columnStatus: row.column_status,
      priority: row.priority,
      category: row.category,
      assignee: row.assignee,
      dueDate: row.due_date,
      recurrence: row.recurrence,
      linkedRef: row.linked_ref,
      sortOrder: row.sort_order,
    }));
  } catch (error) {
    console.error("getMyTasks: table not available", (error as Error).message);
    return [];
  }
}
