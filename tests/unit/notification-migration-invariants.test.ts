import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("supabase/migrations/20260813120000_all_activity_notifications.sql"), "utf8")
  .replace(/--.*$/gm, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

describe("activity notification migration", () => {
  it("fans staff and customer audit events out to active staff", () => {
    expect(sql).toContain("after insert on public.staff_audit_log");
    expect(sql).toContain("after insert on public.customer_audit_log");
    expect(sql.match(/from public\.staff_profiles profile where profile\.active/g)).toHaveLength(2);
  });

  it("uses deterministic recipient-specific event keys", () => {
    expect(sql).toContain("'staff-audit:' || new.id || ':' || profile.user_id");
    expect(sql).toContain("'customer-audit:' || new.id || ':' || profile.user_id");
    expect(sql.match(/on conflict \(event_key\) do nothing/g)).toHaveLength(2);
  });

  it("keeps trigger functions private and search-path safe", () => {
    expect(sql.match(/security definer set search_path = ''/g)).toHaveLength(2);
    expect(sql).toContain("revoke all on function public.notify_staff_audit_activity(), public.notify_customer_audit_activity() from public, anon, authenticated;");
  });
});
