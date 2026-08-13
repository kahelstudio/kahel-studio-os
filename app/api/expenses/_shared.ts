import "server-only";

import { NextResponse } from "next/server";
import { parsePesoToCentavos } from "@/lib/expenses";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal, type StaffPrincipal } from "@/lib/server/staff-auth";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ExpenseApiError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function authorizeExpense(request: Request, mutation = false): Promise<{ principal: StaffPrincipal } | { response: NextResponse }> {
  if (mutation && !hasTrustedOrigin(request)) return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  const principal = await getStaffPrincipal(request);
  if (!principal) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (!principal.userId) return { response: NextResponse.json({ error: "A persisted staff profile is required." }, { status: 403 }) };
  return { principal };
}

export async function readExpenseJson(request: Request, maximumBytes = 65_536) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maximumBytes) throw new ExpenseApiError("Request is too large.", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) throw new ExpenseApiError("Request is too large.", 413);
  const body = JSON.parse(raw) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ExpenseApiError("Invalid request body.");
  return body as Record<string, unknown>;
}

export function cleanText(value: unknown, label: string, maximum: number, required = false) {
  const result = typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
  if (required && !result) throw new ExpenseApiError(`${label} is required.`);
  if (result.length > maximum) throw new ExpenseApiError(`${label} must be ${maximum} characters or fewer.`);
  return result;
}

export function uuid(value: unknown, label: string, required = false) {
  if ((value === null || value === undefined || value === "") && !required) return null;
  if (typeof value !== "string" || !UUID.test(value)) throw new ExpenseApiError(`${label} is invalid.`);
  return value;
}

export function centavos(value: unknown, label: string) {
  const result = parsePesoToCentavos(value);
  if (result === null) throw new ExpenseApiError(`${label} must be greater than zero with no more than two decimal places.`);
  return result;
}

export function expenseError(error: unknown) {
  if (error instanceof ExpenseApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  const candidate = error as { code?: string; message?: string };
  if (candidate.code === "40001" || candidate.code === "23505") return NextResponse.json({ error: candidate.message ?? "This expense changed before your action completed. Refresh and try again.", stale: true }, { status: 409 });
  if (candidate.code === "42501") return NextResponse.json({ error: candidate.message ?? "You do not have permission to perform this action." }, { status: 403 });
  const safeMessages = ["Allocations must equal", "At least one allocation", "Expense amount", "Payment source", "Expense category", "Repayment exceeds", "reason is required", "cannot approve your own"];
  if (candidate.message && safeMessages.some((message) => candidate.message!.includes(message))) return NextResponse.json({ error: candidate.message }, { status: 400 });
  console.error("Expense operation failed", error);
  return NextResponse.json({ error: "Unable to complete the expense operation." }, { status: 500 });
}
