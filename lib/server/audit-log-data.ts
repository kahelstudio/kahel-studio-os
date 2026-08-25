/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

export type AuditLogEntry = {
  id: string;
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

type AuditResult = { data: any[] | null; error: unknown };

function label(action: string) {
  const value = action.replaceAll(/[._-]+/g, " ").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "System activity";
}

function rows(result: AuditResult, source: string) {
  if (result.error) {
    console.error(`[audit-log] ${source} unavailable:`, result.error);
    return [];
  }
  return result.data ?? [];
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const admin = getSupabaseAdmin();
  const [staffResult, customerResult, loyaltyResult, approvalResult] = await Promise.all([
    admin.from("staff_audit_log").select("id,actor_id,actor_name,event,event_type,entity_type,entity_id,metadata,ip_address,created_at").order("created_at", { ascending: false }).limit(200),
    admin.from("customer_audit_log").select("id,actor_user_id,actor_type,action,entity_type,entity_id,metadata,ip_address,created_at").order("created_at", { ascending: false }).limit(200),
    admin.from("loyalty_audit_log").select("id,actor_user_id,action,entity_type,entity_id,reason,created_at").order("created_at", { ascending: false }).limit(200),
    admin.from("approval_audit_log").select("id,request_id,actor_id,action,comment,metadata,created_at").order("created_at", { ascending: false }).limit(200),
  ]) as AuditResult[];

  const staffRows = rows(staffResult, "staff audit log");
  const customerRows = rows(customerResult, "customer audit log");
  const loyaltyRows = rows(loyaltyResult, "loyalty audit log");
  const approvalRows = rows(approvalResult, "approval audit log");
  const actorIds = [...new Set([
    ...customerRows.map((entry) => entry.actor_user_id),
    ...loyaltyRows.map((entry) => entry.actor_user_id),
    ...approvalRows.map((entry) => entry.actor_id),
  ].filter((id): id is string => typeof id === "string" && Boolean(id)))];
  const actorNames = new Map<string, string>();

  if (actorIds.length) {
    const profiles = await admin.from("staff_profiles").select("user_id,display_name").in("user_id", actorIds);
    if (profiles.error) console.error("[audit-log] Staff names unavailable:", profiles.error);
    for (const profile of profiles.data ?? []) actorNames.set(profile.user_id, profile.display_name);
  }

  const entries: AuditLogEntry[] = [
    ...staffRows.map((entry) => ({
      id: `staff:${entry.id}`,
      actorId: entry.actor_id,
      actorName: entry.actor_name,
      event: entry.event,
      eventType: entry.event_type,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      metadata: entry.metadata,
      ipAddress: entry.ip_address,
      createdAt: entry.created_at,
    })),
    ...customerRows.map((entry) => ({
      id: `customer:${entry.id}`,
      actorId: entry.actor_user_id,
      actorName: entry.actor_user_id ? actorNames.get(entry.actor_user_id) ?? (entry.actor_type === "customer" ? "Customer" : label(entry.actor_type)) : label(entry.actor_type),
      event: label(entry.action),
      eventType: entry.actor_type === "customer" ? "auth" : "data",
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      metadata: entry.metadata,
      ipAddress: entry.ip_address,
      createdAt: entry.created_at,
    })),
    ...loyaltyRows.map((entry) => ({
      id: `loyalty:${entry.id}`,
      actorId: entry.actor_user_id,
      actorName: entry.actor_user_id ? actorNames.get(entry.actor_user_id) ?? "Staff" : "System",
      event: label(entry.action),
      eventType: "data",
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      metadata: entry.reason ? { reason: entry.reason } : null,
      ipAddress: null,
      createdAt: entry.created_at,
    })),
    ...approvalRows.map((entry) => ({
      id: `approval:${entry.id}`,
      actorId: entry.actor_id,
      actorName: entry.actor_id ? actorNames.get(entry.actor_id) ?? "Staff" : "System",
      event: `Approval ${label(entry.action).toLowerCase()}`,
      eventType: "action",
      entityType: "approval",
      entityId: entry.request_id,
      metadata: { ...(entry.metadata ?? {}), ...(entry.comment ? { comment: entry.comment } : {}) },
      ipAddress: null,
      createdAt: entry.created_at,
    })),
  ];

  return entries.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(0, 500);
}
