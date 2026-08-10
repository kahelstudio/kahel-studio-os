import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { ApprovalApiError, approvalError, authorizeApproval, cleanText, readApprovalJson, UUID } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authorizeApproval(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!auth.principal.userId) throw new ApprovalApiError("A persisted staff profile is required.", 403);
    const body = await readApprovalJson(request);
    if (!Array.isArray(body.requestIds) || body.requestIds.length < 1 || body.requestIds.length > 50 || body.requestIds.some((id) => typeof id !== "string" || !UUID.test(id))) throw new ApprovalApiError("Select between 1 and 50 valid requests.");
    const result = await getSupabaseAdmin().rpc("approval_bulk_approve", { requested_request_ids: body.requestIds as string[], requested_actor_id: auth.principal.userId, requested_comment: cleanText(body.comment, "Approval note", 2000) || null });
    if (result.error) throw result.error;
    return Response.json({ approved: result.data });
  } catch (error) {
    return approvalError(error);
  }
}
