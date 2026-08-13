import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("supabase/migrations/20260812110000_cash_registers_and_refunds.sql"), "utf8")
  .replace(/--.*$/gm, " ").replace(/\s+/g, " ").trim().toLowerCase();
const enforcementSql = readFileSync(resolve("supabase/migrations/20260813130000_require_cash_register_collection.sql"), "utf8")
  .replace(/--.*$/gm, " ").replace(/\s+/g, " ").trim().toLowerCase();

describe("cash register migration", () => {
  it("replaces unrestricted cash posting with register-aware collection", () => {
    expect(enforcementSql).toContain("revoke all on function public.collect_cash_payment(");
    expect(enforcementSql).toContain("from service_role;");
    expect(sql).toContain("grant execute on function public.collect_cash_payment_with_register(");
    expect(sql).toContain("where id = requested_register_session_id and status = 'open' for update");
  });

  it("exposes only a service-only register-state RPC", () => {
    expect(sql).toContain("create or replace function public.get_cash_collection_registers()");
    expect(sql).toContain("where r.active and l.active");
    expect(sql).toContain("revoke all on function public.get_cash_collection_registers() from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.get_cash_collection_registers() to service_role;");
  });

  it("records retained payment cash rather than tender", () => {
    expect(sql).toContain("'payment_received', 'in', cash_row.amount_centavos");
    expect(sql).not.toContain("'payment_received', 'in', cash_row.cash_received_centavos");
  });
});
