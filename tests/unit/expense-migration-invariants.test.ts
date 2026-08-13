import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("supabase/migrations/20260813170000_expense_cost_control.sql"), "utf8").replace(/--.*$/gm, " ").replace(/\s+/g, " ").toLowerCase();

describe("expense cost-control migration", () => {
  it("upgrades the canonical expense table instead of creating a replacement", () => {
    expect(sql).toContain("alter table public.expenses");
    expect(sql).not.toContain("create table public.expenses (");
    expect(sql).toContain("subtotal_amount_centavos integer");
    expect(sql).toContain("total_amount_centavos integer");
  });

  it("enforces allocation equality server-side", () => {
    expect(sql).toContain("if allocation_sum <> total then raise exception 'allocations must equal the expense total'");
    expect(sql).toContain("amount_centavos integer not null check (amount_centavos > 0)");
    expect(sql).toContain("expense_allocations_unique_destination");
  });

  it("keeps reviews and owner repayments immutable", () => {
    expect(sql).toContain("create trigger expense_reviews_immutable before update or delete");
    expect(sql).toContain("create trigger owner_advance_repayments_immutable before update or delete");
    expect(sql).toContain("approved financial values require a controlled correction");
  });

  it("blocks self-approval and concurrent stale transitions", () => {
    expect(sql).toContain("if current_expense.version <> requested_expected_version");
    expect(sql).toContain("you cannot approve your own expense");
    expect(sql).toContain("using errcode = '40001'");
  });

  it("prevents duplicate payout and owner over-repayment", () => {
    expect(sql).toContain("financial_event_id uuid unique");
    expect(sql).toContain("idempotency_key uuid not null unique");
    expect(sql).toContain("repayment exceeds the outstanding owner advance");
    expect(sql).toContain("amount_repaid_centavos <= amount_advanced_centavos");
    expect(sql).toContain("only scheduled approved reimbursements can be paid");
    expect(sql).toContain("financial_event_id = event_id");
  });

  it("links reimbursements to the existing approval workflow", () => {
    expect(sql).toContain("public.approval_create_request(");
    expect(sql).toContain("'expense_reimbursement'");
    expect(sql).toContain("update public.approval_requests set source_record_id = created.id");
    expect(sql).not.toContain("insert into public.payments");
  });

  it("keeps recurring templates out of paid totals and generation idempotent", () => {
    expect(sql).toContain("create table public.recurring_expense_templates");
    expect(sql).toContain("expenses_recurring_instance_unique");
    expect(sql).toContain("obligation templates only");
    expect(sql).toContain("create or replace function public.recurring_expense_generate");
    expect(sql).toContain("where recurring_template_id = template.id and expense_date = template.next_due_date");
  });

  it("uses persisted request fingerprints for race-safe creation retries", () => {
    expect(sql).toContain("expenses_create_idempotency_unique");
    expect(sql).toContain("request_fingerprint");
    expect(sql).toContain("submission key was reused with different expense details");
  });

  it("blocks unsafe voids and approval with unresolved duplicates", () => {
    expect(sql).toContain("payout_status in ('scheduled','paid')");
    expect(sql).toContain("amount_repaid_centavos > 0");
    expect(sql).toContain("resolve the duplicate warning before approval");
  });

  it("preserves prior values and allocations during correction", () => {
    expect(sql).toContain("create or replace function public.expense_update_draft");
    expect(sql).toContain("previous_allocations");
    expect(sql).toContain("corrected_and_resubmitted");
    expect(sql).toContain("only drafts or returned expenses can be corrected");
  });

  it("enables RLS and denies browser writes", () => {
    for (const table of ["expense_categories", "expense_payment_sources", "expense_allocations", "expense_attachments", "expense_reviews", "reimbursement_claims", "owner_advances", "owner_advance_repayments", "recurring_expense_templates"]) expect(sql).toContain(`alter table public.${table} enable row level security;`);
    expect(sql).toContain("revoke all on public.expense_reference_counters");
    expect(sql).toContain("grant execute on function public.expense_create");
    expect(sql).toContain("to service_role");
    expect(sql).not.toMatch(/grant (insert|update|delete|all) on public\.expenses[^;]*to authenticated/);
  });

  it("does not classify owner funding as incoming payment or revenue", () => {
    expect(sql).toContain("owner_advance");
    expect(sql).not.toContain("insert into public.payments");
    expect(sql).toContain("owner funding are not revenue/negative payments");
  });
});
