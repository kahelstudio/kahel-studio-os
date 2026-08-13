import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizePayments, isUuid, operationalPaymentError, PaymentApiError, readPaymentJson } from "../_shared";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type ReconcileDatabase = { public: { Tables: Record<string, never>; Views: Record<string, never>; Functions: { reconcile_failed_provider_payment: { Args: Record<string, unknown>; Returns: { id: string; status: string } } }; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };

export async function POST(request: Request) {
  const auth = await authorizePayments(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!auth.principal.userId) throw new PaymentApiError("Sign in with an active staff account to reconcile payments.", 403);
    const body = await readPaymentJson(request);
    if (!isUuid(body.paymentId)) throw new PaymentApiError("A valid payment ID is required.");
    if (typeof body.reason !== "string" || body.reason.trim().length < 5 || body.reason.trim().length > 1000) throw new PaymentApiError("A reconciliation reason of 5 to 1,000 characters is required.");
    const admin = getSupabaseAdmin() as unknown as SupabaseClient<ReconcileDatabase>;
    const result = await admin.rpc("reconcile_failed_provider_payment", { requested_payment_id: body.paymentId, requested_actor_id: auth.principal.userId, requested_reason: body.reason.trim() });
    if (result.error || !result.data) throw result.error ?? new Error("Reconciliation returned no payment.");
    return Response.json({ paymentId: result.data.id, status: result.data.status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return operationalPaymentError(error);
  }
}
