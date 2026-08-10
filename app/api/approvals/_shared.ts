import "server-only";

import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal, type StaffPrincipal } from "@/lib/server/staff-auth";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ApprovalApiError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export async function authorizeApproval(request: Request, mutation = false): Promise<{ principal: StaffPrincipal } | { response: NextResponse }> {
  if (mutation && !hasTrustedOrigin(request)) return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  const principal = await getStaffPrincipal(request);
  if (!principal) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  return { principal };
}

export async function readApprovalJson(request: Request, maximumBytes = 32_768) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maximumBytes) throw new ApprovalApiError("Request is too large.", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) throw new ApprovalApiError("Request is too large.", 413);
  const body = JSON.parse(raw) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApprovalApiError("Invalid request body.");
  return body as Record<string, unknown>;
}

export function optionalUuid(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !UUID.test(value)) throw new ApprovalApiError(`${label} is invalid.`);
  return value;
}

export function cleanText(value: unknown, label: string, maximum: number, required = false) {
  const result = typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
  if (required && !result) throw new ApprovalApiError(`${label} is required.`);
  if (result.length > maximum) throw new ApprovalApiError(`${label} must be ${maximum} characters or fewer.`);
  return result;
}

export function approvalError(error: unknown) {
  if (error instanceof ApprovalApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  const candidate = error as { code?: string; message?: string };
  if (candidate.code === "40001" || candidate.code === "23505") return NextResponse.json({ error: candidate.message ?? "This request changed before your action completed. Refresh and try again.", stale: true }, { status: 409 });
  if (candidate.code === "42501") return NextResponse.json({ error: candidate.message ?? "You do not have permission to perform this action." }, { status: 403 });
  console.error("Approval operation failed", error);
  return NextResponse.json({ error: "Unable to complete the approval operation." }, { status: 500 });
}
