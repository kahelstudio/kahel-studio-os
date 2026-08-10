import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { APPROVAL_PRIORITIES, APPROVAL_TYPE_BY_VALUE, FINANCIAL_REQUEST_TYPES, validateApprovalDetails } from "@/lib/approvals";
import type { Json } from "@/lib/server/supabase-database";
import { ApprovalApiError, approvalError, authorizeApproval, cleanText, readApprovalJson, UUID } from "../_shared";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await authorizeApproval(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!auth.principal.userId) throw new ApprovalApiError("A persisted staff profile is required.", 403);
    const { requestId } = await context.params;
    if (!UUID.test(requestId)) throw new ApprovalApiError("Request identifier is invalid.");
    const body = await readApprovalJson(request);
    const action = cleanText(body.action, "Action", 40, true);
    const comment = cleanText(body.comment, "Comment", 2000) || null;
    let result;
    if (action === "update" || action === "update_submit") {
      const existing = await getSupabaseAdmin().from("approval_requests").select("request_type").eq("id", requestId).maybeSingle();
      if (existing.error) throw existing.error;
      const requestType = existing.data?.request_type ?? "";
      const definition = APPROVAL_TYPE_BY_VALUE[requestType];
      if (!definition || !body.details || typeof body.details !== "object" || Array.isArray(body.details)) throw new ApprovalApiError("Request details are invalid.");
      const detailErrors = validateApprovalDetails(requestType, body.details as Record<string, unknown>);
      if (action === "update_submit" && detailErrors.length) throw new ApprovalApiError(detailErrors[0]);
      const priority = cleanText(body.priority, "Priority", 20, true);
      if (!APPROVAL_PRIORITIES.includes(priority as (typeof APPROVAL_PRIORITIES)[number])) throw new ApprovalApiError("Choose a valid priority.");
      let amount = body.amount === "" || body.amount === null || body.amount === undefined ? null : Number(body.amount);
      if (requestType === "cash_advance_liquidation") amount = Number((body.details as Record<string, unknown>).totalSpent);
      if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new ApprovalApiError("Enter a valid amount.");
      if (action === "update_submit" && FINANCIAL_REQUEST_TYPES.has(requestType) && (!amount || amount <= 0)) throw new ApprovalApiError("An amount greater than zero is required.");
      const requiredBy = cleanText(body.requiredBy, "Required-by date", 10);
      if (requiredBy && !/^\d{4}-\d{2}-\d{2}$/.test(requiredBy)) throw new ApprovalApiError("Required-by date is invalid.");
      result = await getSupabaseAdmin().rpc("approval_update_request", { requested_request_id: requestId, requested_actor_id: auth.principal.userId, requested_subject: cleanText(body.subject, "Subject", 255, true), requested_description: cleanText(body.description, "Description", 4000, true), requested_priority: priority.toLowerCase(), requested_details: body.details as Json, requested_required_by: requiredBy || null, requested_amount_php: amount === null ? null : Math.round(amount * 100), requested_notes: cleanText(body.notesToApprover, "Notes to approver", 2000) || null, requested_submit: action === "update_submit" });
    } else if (["approve", "reject", "return", "request_document", "override_approve", "override_reject"].includes(action)) {
      result = await getSupabaseAdmin().rpc("approval_decide_request", { requested_request_id: requestId, requested_actor_id: auth.principal.userId, requested_action: action, requested_comment: comment });
    } else if (action === "submit" || action === "resubmit") {
      const pendingRequest = await getSupabaseAdmin().from("approval_requests").select("request_type,details,amount_php").eq("id", requestId).maybeSingle();
      if (pendingRequest.error) throw pendingRequest.error;
      if (!pendingRequest.data) throw new ApprovalApiError("Approval request not found.", 404);
      const detailErrors = validateApprovalDetails(pendingRequest.data.request_type, pendingRequest.data.details as Record<string, unknown>);
      if (detailErrors.length) throw new ApprovalApiError(detailErrors[0]);
      if (FINANCIAL_REQUEST_TYPES.has(pendingRequest.data.request_type) && (!pendingRequest.data.amount_php || pendingRequest.data.amount_php <= 0)) throw new ApprovalApiError("An amount greater than zero is required.");
      result = await getSupabaseAdmin().rpc("approval_submit_request", { requested_request_id: requestId, requested_actor_id: auth.principal.userId, requested_comment: comment });
    } else if (action === "withdraw") {
      result = await getSupabaseAdmin().rpc("approval_withdraw_request", { requested_request_id: requestId, requested_actor_id: auth.principal.userId, requested_comment: comment });
    } else if (action === "archive") {
      result = await getSupabaseAdmin().rpc("approval_archive_request", { requested_request_id: requestId, requested_actor_id: auth.principal.userId, requested_comment: comment ?? "" });
    } else if (action === "reassign" || action === "delegate") {
      const targetId = cleanText(body.targetId, "Assignee", 36, true);
      if (!UUID.test(targetId)) throw new ApprovalApiError("Choose a valid assignee.");
      result = await getSupabaseAdmin().rpc("approval_reassign_step", { requested_request_id: requestId, requested_actor_id: auth.principal.userId, requested_target_id: targetId, requested_comment: comment ?? "", requested_delegate: action === "delegate" });
    } else if (["release", "payment", "balance_return", "reimbursement"].includes(action)) {
      const amount = Number(body.amount);
      const occurredAt = cleanText(body.occurredAt, "Date", 40, true);
      if (!Number.isFinite(amount) || amount <= 0) throw new ApprovalApiError("Enter an amount greater than zero.");
      if (Number.isNaN(new Date(occurredAt).getTime())) throw new ApprovalApiError("Enter a valid transaction date.");
      result = await getSupabaseAdmin().rpc("approval_record_financial_event", {
        requested_request_id: requestId,
        requested_actor_id: auth.principal.userId,
        requested_event_type: action,
        requested_amount_php: Math.round(amount * 100),
        requested_payment_method: cleanText(body.paymentMethod, "Payment method", 80, true),
        requested_transaction_reference: cleanText(body.transactionReference, "Transaction reference", 120, true),
        requested_occurred_at: new Date(occurredAt).toISOString(),
        requested_notes: comment,
      });
    } else {
      throw new ApprovalApiError("Unsupported approval action.");
    }
    if (result.error) throw result.error;
    return NextResponse.json({ request: result.data });
  } catch (error) {
    return approvalError(error);
  }
}
