import "server-only";

import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getStaffPrincipal, type StaffPrincipal } from "@/lib/server/staff-auth";

export type DatabaseError = { code?: string; message?: string; details?: string; hint?: string };

export class PaymentApiError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "PaymentApiError";
  }
}

export async function authorizePayments(request: Request, mutation = false): Promise<{ principal: StaffPrincipal } | { response: Response }> {
  if (mutation && !hasTrustedOrigin(request)) return { response: Response.json({ error: "Request origin is not trusted." }, { status: 403 }) };
  const principal = await getStaffPrincipal(request);
  if (!principal) return { response: Response.json({ error: "Staff authentication is required." }, { status: 401 }) };
  if (principal.role !== "admin" && principal.role !== "super_admin") return { response: Response.json({ error: "Admin access is required for payments." }, { status: 403 }) };
  return { principal };
}

export function operationalPaymentError(error: unknown) {
  if (error instanceof PaymentApiError) return Response.json({ error: error.message }, { status: error.status });
  const dbError = error as DatabaseError;
  const message = typeof dbError?.message === "string" ? dbError.message.toLowerCase() : "";
  const known = [
    ["booking not found", "Booking was not found.", 404],
    ["product was not found or inactive", "An add-on product is unavailable.", 409],
    ["cannot collect a cancelled booking", "Payments cannot be collected for a cancelled booking.", 409],
    ["cannot collect a void invoice", "Payments cannot be collected against a void invoice.", 409],
    ["exceeds unreserved outstanding balance", "The amount exceeds the balance currently available to collect.", 409],
    ["exceeds unreserved invoice balance", "The amount exceeds the invoice balance currently available to collect.", 409],
    ["idempotency key was used with different details", "This request key was already used for a different payment.", 409],
    ["insufficient stock", "An add-on no longer has enough stock.", 409],
    ["cash received does not cover", "Cash received must cover the payment amount.", 400],
    ["open register session not found", "The selected cash register is not open.", 409],
    ["register session not found", "The selected cash register session was not found.", 404],
    ["paid cash retry is not registered to the requested session", "This cash payment was already recorded against another register session.", 409],
    ["payment is already assigned to another register session", "This payment is already assigned to another cash register.", 409],
    ["cash payment register event mismatch", "The cash register entry requires reconciliation.", 409],
    ["opening cash is below the location minimum", "Opening cash is below the location minimum.", 400],
    ["active cash register not found", "The selected cash register is unavailable.", 404],
    ["active staff actor is required", "Your active staff profile is required to collect payment.", 403],
    ["payment must include", "Enter a balance amount or at least one add-on.", 400],
    ["amount exceeds legacy integer range", "The payment amount is too large.", 400],
    ["add_on total exceeds supported range", "The add-on quantity or total is too large.", 400],
    ["failed or expired paymongo payment not found", "Only failed or expired PayMongo payments can be reconciled.", 409],
    ["reconciliation reason is required", "A reconciliation reason is required.", 400],
  ] as const;
  const match = known.find(([needle]) => message.includes(needle));
  if (match) return Response.json({ error: match[1] }, { status: match[2] });
  console.error("[payments-api] operation failed", { code: dbError?.code, message: dbError?.message });
  return Response.json({ error: "The payment operation could not be completed safely." }, { status: 503 });
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function readPaymentJson(request: Request, maximumBytes = 32_000): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maximumBytes) throw new PaymentApiError("Request is too large.", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) throw new PaymentApiError("Request is too large.", 413);
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new PaymentApiError("Request body must be a JSON object.");
  }
}

export function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
