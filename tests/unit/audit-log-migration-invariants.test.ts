import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("supabase/migrations/20260913020000_grant_service_role_audit_access.sql"), "utf8")
  .replace(/--.*$/gm, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

describe("audit log service-role grants", () => {
  it("allows the server to read every audit source", () => {
    expect(sql).toMatch(/grant select, insert on table public\.staff_audit_log, public\.customer_audit_log to service_role/);
    expect(sql).toMatch(/grant select on table public\.loyalty_audit_log, public\.approval_audit_log to service_role/);
  });

  it("allows direct staff audit inserts to use the identity sequence", () => {
    expect(sql).toContain("grant usage, select on sequence public.staff_audit_log_id_seq to service_role");
  });
});
