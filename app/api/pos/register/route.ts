import { hasTrustedOrigin } from "@/lib/server/customer-auth";
import { getRegisterWorkspace } from "@/lib/server/register-data";
import { getStaffPrincipal, type StaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CENTAVOS = 100_000_000_000;

class RegisterApiError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

async function authorize(request: Request, mutation = false): Promise<StaffPrincipal> {
  if (mutation && !hasTrustedOrigin(request)) throw new RegisterApiError("Request origin is not trusted.", 403);
  const principal = await getStaffPrincipal(request);
  if (!principal) throw new RegisterApiError("Staff authentication is required.", 401);
  return principal;
}

async function readJson(request: Request) {
  const maximumBytes = 16_000;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maximumBytes) throw new RegisterApiError("Request is too large.", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) throw new RegisterApiError("Request is too large.", 413);
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new RegisterApiError("Request body must be a JSON object.");
  }
}

function uuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID.test(value)) throw new RegisterApiError(`${label} is invalid.`);
  return value;
}

function amount(value: unknown, label: string, positive = false) {
  if (!Number.isSafeInteger(value) || Number(value) < (positive ? 1 : 0) || Number(value) > MAX_CENTAVOS) {
    throw new RegisterApiError(`${label} must be ${positive ? "a positive" : "a non-negative"} integer number of centavos.`);
  }
  return Number(value);
}

function text(value: unknown, label: string, maximum: number, minimum = 0) {
  if (value === undefined || value === null || value === "") {
    if (minimum > 0) throw new RegisterApiError(`${label} must be between ${minimum} and ${maximum} characters.`);
    return null;
  }
  if (typeof value !== "string" || value.length > maximum || value.trim().length < minimum) {
    throw new RegisterApiError(`${label} must be between ${minimum} and ${maximum} characters.`);
  }
  return value.trim();
}

function safeError(error: unknown) {
  if (error instanceof RegisterApiError) return Response.json({ error: error.message }, { status: error.status });
  const dbError = error as { code?: string; message?: string };
  const message = dbError?.message?.toLowerCase() ?? "";
  const known = [
    ["active cash register not found", "The selected register is unavailable.", 404],
    ["opening cash is below", "Opening cash is below the location minimum.", 409],
    ["cash_register_sessions_one_active_idx", "This register already has an active session.", 409],
    ["duplicate key value", "This register already has an active session or request key.", 409],
    ["open register session not found", "This register session is no longer open.", 409],
    ["pending close not found", "This close is no longer awaiting review.", 409],
    ["only the opener", "Only the staff member who opened the register may submit its close.", 403],
    ["opener cannot review", "The opener cannot review their own close.", 403],
    ["super admin access", "Super Admin access is required.", 403],
    ["admin access", "Admin access is required.", 403],
    ["cash out would breach", "Cash out would breach the location minimum.", 409],
    ["idempotency key was used", "This request key was already used with different details.", 409],
    ["active staff actor", "An active staff profile is required.", 403],
  ] as const;
  const match = known.find(([needle]) => message.includes(needle));
  if (match) return Response.json({ error: match[1] }, { status: match[2] });
  console.error("[register-api] operation failed", { code: dbError?.code, message: dbError?.message });
  return Response.json({ error: "The register operation could not be completed safely." }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    await authorize(request);
    return Response.json({ workspace: await getRegisterWorkspace() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const principal = await authorize(request, true);
    if (!principal.userId) throw new RegisterApiError("A persisted active staff profile is required.", 403);
    const body = await readJson(request);
    const action = body.action;
    const admin = getSupabaseAdmin();
    let result: { data: unknown; error: unknown };

    if (action === "open") {
      result = await admin.rpc("open_cash_register", {
        requested_register_id: uuid(body.registerId, "Register"),
        requested_opening_amount_centavos: amount(body.openingAmountCentavos, "Opening cash"),
        requested_actor_id: principal.userId,
        requested_note: text(body.note, "Opening note", 2000),
      });
    } else if (action === "manual_cash_in" || action === "manual_cash_out") {
      if (principal.role !== "super_admin") throw new RegisterApiError("Super Admin access is required.", 403);
      const idempotencyKey = text(body.idempotencyKey, "Request key", 200, 8);
      result = await admin.rpc("record_manual_cash_event", {
        requested_session_id: uuid(body.sessionId, "Session"), requested_event_type: action,
        requested_amount_centavos: amount(body.amountCentavos, "Cash amount", true),
        requested_actor_id: principal.userId, requested_reason: text(body.reason, "Reason", 1000, 3)!,
        requested_idempotency_key: idempotencyKey!,
      });
    } else if (action === "submit_close") {
      result = await admin.rpc("submit_cash_register_close", {
        requested_session_id: uuid(body.sessionId, "Session"),
        requested_counted_amount_centavos: amount(body.countedAmountCentavos, "Counted cash"),
        requested_actor_id: principal.userId, requested_note: text(body.note, "Close note", 2000),
      });
    } else if (action === "review") {
      if (principal.role !== "admin" && principal.role !== "super_admin") throw new RegisterApiError("Admin access is required.", 403);
      if (typeof body.approve !== "boolean") throw new RegisterApiError("Review decision is invalid.");
      result = await admin.rpc("review_cash_register_close", {
        requested_session_id: uuid(body.sessionId, "Session"), requested_reviewer_id: principal.userId,
        requested_approve: body.approve, requested_note: text(body.note, "Review note", 2000),
      });
    } else {
      throw new RegisterApiError("Register action is invalid.");
    }
    if (result.error || !result.data) throw result.error ?? new Error("Register operation returned no result.");
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return safeError(error);
  }
}
