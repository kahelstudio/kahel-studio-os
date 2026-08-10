import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { ApprovalApiError, approvalError, authorizeApproval, readApprovalJson, UUID } from "../_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorizeApproval(request);
  if ("response" in auth) return auth.response;
  if (auth.principal.role !== "super_admin") return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const result = await getSupabaseAdmin().from("approval_workflow_rules").select("id,name,request_type,min_amount_php,max_amount_php,steps,bulk_approval_allowed,bulk_amount_limit_php,active").order("priority").order("name");
  if (result.error) return approvalError(result.error);
  return Response.json({ rules: result.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const auth = await authorizeApproval(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (auth.principal.role !== "super_admin" || !auth.principal.userId) throw new ApprovalApiError("Super Admin access is required.", 403);
    const body = await readApprovalJson(request);
    if (typeof body.id !== "string" || !UUID.test(body.id)) throw new ApprovalApiError("Workflow rule is invalid.");
    const min = nullableAmount(body.minAmount);
    const max = nullableAmount(body.maxAmount);
    const bulkLimit = nullableAmount(body.bulkLimit);
    if (min !== null && max !== null && max < min) throw new ApprovalApiError("Maximum amount must be greater than the minimum amount.");
    const result = await getSupabaseAdmin().rpc("approval_update_workflow_rule", { requested_rule_id: body.id, requested_actor_id: auth.principal.userId, requested_min_amount_php: min === null ? null : Math.round(min * 100), requested_max_amount_php: max === null ? null : Math.round(max * 100), requested_bulk_allowed: body.bulkAllowed === true, requested_bulk_limit_php: bulkLimit === null ? null : Math.round(bulkLimit * 100), requested_active: body.active === true });
    if (result.error) throw result.error;
    return Response.json({ rule: result.data });
  } catch (error) { return approvalError(error); }
}

function nullableAmount(value: unknown) { if (value === null || value === undefined || value === "") return null; const number = Number(value); if (!Number.isFinite(number) || number < 0 || number > 100_000_000) throw new ApprovalApiError("Enter a valid workflow amount."); return number; }
