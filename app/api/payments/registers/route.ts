import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizePayments, isUuid, operationalPaymentError, PaymentApiError, readPaymentJson } from "../_shared";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type RegisterSession = { id: string; register_id: string; status: string; opening_amount_centavos: number; opened_by: string; opened_at: string };
type RegisterDatabase = { public: { Tables: Record<string, never>; Views: Record<string, never>; Functions: {
  get_cash_collection_registers: { Args: Record<string, never>; Returns: Array<Record<string, unknown>> };
  open_cash_register: { Args: Record<string, unknown>; Returns: RegisterSession };
}; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };

function database() {
  return getSupabaseAdmin() as unknown as SupabaseClient<RegisterDatabase>;
}

export async function GET(request: Request) {
  const auth = await authorizePayments(request);
  if ("response" in auth) return auth.response;
  const result = await database().rpc("get_cash_collection_registers");
  if (result.error) return operationalPaymentError(result.error);
  return Response.json({ registers: result.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await authorizePayments(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!auth.principal.userId) throw new PaymentApiError("Sign in with an active staff account to open a register.", 403);
    const body = await readPaymentJson(request);
    if (!isUuid(body.registerId)) throw new PaymentApiError("A valid cash register is required.");
    if (!Number.isSafeInteger(body.openingAmountCentavos) || Number(body.openingAmountCentavos) < 0) throw new PaymentApiError("Opening cash must be a non-negative integer number of centavos.");
    if (body.note !== undefined && body.note !== null && (typeof body.note !== "string" || body.note.length > 2000)) throw new PaymentApiError("Opening note must be no longer than 2,000 characters.");
    const result = await database().rpc("open_cash_register", {
      requested_register_id: body.registerId,
      requested_opening_amount_centavos: Number(body.openingAmountCentavos),
      requested_actor_id: auth.principal.userId,
      requested_note: typeof body.note === "string" ? body.note.trim() || null : null,
    });
    if (result.error || !result.data) throw result.error ?? new Error("Register opening returned no session.");
    return Response.json({ session: result.data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return operationalPaymentError(error);
  }
}
