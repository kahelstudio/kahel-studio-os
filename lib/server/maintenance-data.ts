import { getSupabaseAdmin } from "./supabase-admin";

export type MaintenanceRecord = {
  id: string;
  task: string;
  assetLabel: string;
  maintenanceType: string;
  issue: string | null;
  assignee: string;
  nextDue: string | null;
  recurrence: string | null;
  estimatedCost: number | null;
  warranty: string | null;
  status: string;
  createdAt: string;
};

export async function getMaintenanceRecords(status?: string): Promise<MaintenanceRecord[]> {
  const admin = getSupabaseAdmin();

  let query = admin
    .from("maintenance_records")
    .select("id, task, asset_label, maintenance_type, issue, assignee, next_due, recurrence, estimated_cost, warranty, status, created_at")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.limit(200);

  if (error) throw error;

  return (data ?? []).map((m: any) => ({
    id: m.id,
    task: m.task,
    assetLabel: m.asset_label,
    maintenanceType: m.maintenance_type,
    issue: m.issue,
    assignee: m.assignee,
    nextDue: m.next_due,
    recurrence: m.recurrence,
    estimatedCost: m.estimated_cost ? Number(m.estimated_cost) : null,
    warranty: m.warranty,
    status: m.status,
    createdAt: m.created_at,
  }));
}
