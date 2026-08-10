import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { ApprovalApiError, approvalError, authorizeApproval, cleanText, readApprovalJson, UUID } from "../../_shared";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await authorizeApproval(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!auth.principal.userId) throw new ApprovalApiError("A persisted staff profile is required.", 403);
    const { requestId } = await context.params;
    if (!UUID.test(requestId)) throw new ApprovalApiError("Request identifier is invalid.");
    const body = await readApprovalJson(request, 8_192);
    const result = await getSupabaseAdmin().rpc("approval_add_comment", {
      requested_request_id: requestId,
      requested_actor_id: auth.principal.userId,
      requested_body: cleanText(body.body, "Comment", 2000, true),
      requested_visibility: cleanText(body.visibility, "Visibility", 20) || "participants",
    });
    if (result.error) throw result.error;
    return Response.json({ comment: result.data }, { status: 201 });
  } catch (error) {
    return approvalError(error);
  }
}
