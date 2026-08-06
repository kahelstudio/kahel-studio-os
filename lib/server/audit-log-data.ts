import { getSupabaseAdmin } from "./supabase-admin";

export type AuditLogEntry = {
  id: number;
  actorId: string | null;
  actorName: string;
  event: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("staff_audit_log")
    .select("id, actor_id, actor_name, event, event_type, entity_type, entity_id, metadata, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((e: any) => ({
    id: e.id,
    actorId: e.actor_id,
    actorName: e.actor_name,
    event: e.event,
    eventType: e.event_type,
    entityType: e.entity_type,
    entityId: e.entity_id,
    metadata: e.metadata,
    ipAddress: e.ip_address,
    createdAt: e.created_at,
  }));
}
