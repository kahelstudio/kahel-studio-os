import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve("supabase/migrations/20260810120000_payment_collection_ledger.sql");
const correctionPath = resolve("supabase/migrations/20260813140000_fix_payment_add_on_record.sql");
const sql = readFileSync(migrationPath, "utf8")
  .replace(/--.*$/gm, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();
const correctionSql = readFileSync(correctionPath, "utf8").replace(/\s+/g, " ").toLowerCase();

const ledgerTables = [
  "payments",
  "payment_line_items",
  "payment_allocations",
  "invoice_items",
  "cash_transactions",
  "receipts",
  "receipt_line_items",
  "payment_events",
  "payment_settlements",
  "inventory_movements",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function definition(kind: "table" | "view", name: string) {
  const nextStatement = kind === "table" ? "create (?:unique )?index|create table|create or replace function" : "create view|revoke|grant|alter table";
  const match = sql.match(new RegExp(`create ${kind} public\\.${escapeRegExp(name)}\\b([\\s\\S]*?)(?= ${nextStatement}|$)`));
  expect(match, `missing ${kind} public.${name}`).not.toBeNull();
  return match![0];
}

function functionBody(name: string) {
  const match = sql.match(new RegExp(`create or replace function public\\.${escapeRegExp(name)}\\([^$]*?as \\$\\$([\\s\\S]*?)\\$\\$;`));
  expect(match, `missing function public.${name}`).not.toBeNull();
  return match![1];
}

function grantStatementsFor(role: string) {
  return [...sql.matchAll(/\bgrant\s+[^;]+;/g)]
    .map(([statement]) => statement)
    .filter((statement) => new RegExp(`\\bto ${escapeRegExp(role)}\\b`).test(statement));
}

describe("payment ledger migration security", () => {
  it("enables RLS on every ledger table", () => {
    for (const table of ledgerTables) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("gives authenticated customers read-only, ownership-filtered safe views", () => {
    const safeViews = {
      customer_payments: "payments",
      customer_payment_lines: "payment_line_items",
      customer_receipts: "receipts",
      customer_receipt_lines: "receipt_line_items",
    } as const;

    for (const [view, table] of Object.entries(safeViews)) {
      const viewSql = definition("view", view);
      expect(viewSql).toContain("with (security_invoker = true)");
      expect(viewSql).toContain(`from public.${table}`);
      expect(sql).toMatch(new RegExp(`create policy \\w+ on public\\.${table} for select to authenticated using \\(public\\.customer_owns_client\\(client_id\\)\\);`));
    }

    const authenticatedGrants = grantStatementsFor("authenticated");
    expect(authenticatedGrants.length).toBeGreaterThan(0);
    expect(authenticatedGrants.every((grant) => /^grant select\b/.test(grant))).toBe(true);
    expect(authenticatedGrants.join(" ")).not.toMatch(/\b(insert|update|delete|truncate|execute|all)\b/);

    const paymentView = definition("view", "customer_payments");
    expect(paymentView).not.toMatch(/\b(idempotency_key|request_fingerprint|provider_payment_id|checkout_url|prepared_by)\b/);
    expect(sql).toMatch(/grant select on public\.customer_payments, public\.customer_payment_lines, public\.customer_receipts, public\.customer_receipt_lines to authenticated;/);
  });

  it("allows service_role to mutate the ledger only through public RPCs", () => {
    const serviceGrants = grantStatementsFor("service_role");
    expect(serviceGrants).toHaveLength(9);
    expect(serviceGrants.every((grant) => /^grant execute on function public\.\w+\([^;]+\) to service_role;$/.test(grant))).toBe(true);
    expect(serviceGrants.join(" ")).not.toContain("payment_post_success");

    const mutationRevoke = sql.match(/revoke insert, update, delete, truncate on table ([^;]+) from service_role;/)?.[1];
    expect(mutationRevoke).toBeDefined();
    for (const table of ledgerTables) expect(mutationRevoke).toContain(`public.${table}`);
  });
});

describe("payment ledger migration invariants", () => {
  it("keeps processor and payment method combinations distinct", () => {
    const payments = definition("table", "payments");
    expect(payments).toMatch(/payment_method = 'cash' and processor = 'none'/);
    expect(payments).toMatch(/payment_method in \('digital', 'card', 'gcash', 'paymaya', 'qrph', 'billease'\) and processor = 'paymongo'/);
    expect(payments).toMatch(/payment_method = 'legacy_import' and processor = 'legacy_import'/);
  });

  it("posts cash through one atomic prepare-and-post wrapper", () => {
    const body = functionBody("collect_cash_payment");
    const prepareCall = body.indexOf("public.prepare_payment_collection(");
    const postCall = body.indexOf("public.post_cash_payment(");
    expect(prepareCall).toBeGreaterThanOrEqual(0);
    expect(postCall).toBeGreaterThan(prepareCall);
    expect(sql).toMatch(/create or replace function public\.collect_cash_payment\([^$]+security definer set search_path = '' as \$\$/);
    expect(grantStatementsFor("service_role").some((grant) => grant.includes("public.collect_cash_payment("))).toBe(true);
  });

  it("deduplicates webhook confirmations before the once-only posting gate", () => {
    const confirmation = functionBody("confirm_paymongo_payment");
    expect(sql).toMatch(/create unique index payment_events_provider_event_key on public\.payment_events \(provider, provider_event_id\) where provider_event_id is not null/);
    expect(confirmation).toMatch(/where provider = 'paymongo' and provider_event_id = btrim\(requested_provider_event_id\)/);
    expect(confirmation).toMatch(/if existing_event\.payment_id <> current_payment\.id then raise exception 'paymongo event belongs to another payment'/);
    expect(confirmation.indexOf("if existing_event.id is not null")).toBeLessThan(confirmation.indexOf("public.payment_post_success("));
    expect(confirmation).toMatch(/if current_payment\.status = 'paid' then insert into public\.payment_events[\s\S]*?'ignored'/);
  });

  it("requires and audits a reason when failed reservations are reconciled", () => {
    const reconciliation = functionBody("reconcile_failed_provider_payment");
    expect(reconciliation).toMatch(/length\(btrim\(coalesce\(requested_reason, ''\)\)\) not between 5 and 1000/);
    expect(reconciliation).toMatch(/current_payment\.status not in \('failed', 'expired'\)/);
    expect(reconciliation).toMatch(/'payment\.reservation_released'[\s\S]*jsonb_build_object\('actor_id', requested_actor_id, 'reason', btrim\(requested_reason\)\)/);
    expect(reconciliation).toMatch(/insert into public\.staff_audit_log[\s\S]*'failed payment reconciled'[\s\S]*jsonb_build_object\('reason', btrim\(requested_reason\), 'new_status', 'cancelled'\)/);
  });

  it("enforces one receipt and one inventory movement per source item", () => {
    expect(definition("table", "receipts")).toMatch(/payment_id uuid not null unique/);
    expect(definition("table", "receipts")).toMatch(/receipt_number text not null unique/);
    expect(definition("table", "inventory_movements")).toMatch(/payment_line_item_id uuid not null unique/);
  });

  it("reserves inventory for every recoverable provider status and moves it only on paid posting", () => {
    const preparation = functionBody("prepare_payment_collection");
    const posting = functionBody("payment_post_success");
    expect(preparation).toMatch(/payment\.status in \('pending', 'failed', 'expired'\)/);
    expect(preparation).toMatch(/select p\.id as product_id, p\.name, p\.stock/);
    expect(preparation).toMatch(/add_on\.quantity::bigint \+ reserved_quantity > add_on\.stock::bigint/);
    expect(posting).toMatch(/if line_row\.line_type = 'add_on' then update public\.products set stock = stock - line_row\.quantity/);
    expect(posting).toMatch(/insert into public\.inventory_movements[\s\S]*'paid_add_on'/);
    expect(posting.indexOf("if current_payment.status = 'paid' then return current_payment")).toBeLessThan(posting.indexOf("insert into public.inventory_movements"));
  });

  it("forward-patches already deployed add-on record definitions", () => {
    expect(correctionSql).toContain("public.prepare_payment_collection(uuid,text,text,text,bigint,text,jsonb,boolean,text,boolean,uuid)");
    expect(correctionSql).toContain("select p.id as product_id, p.name, p.stock,");
  });
});
