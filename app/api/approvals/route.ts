import { NextResponse } from "next/server";
import { APPROVAL_PRIORITIES, APPROVAL_TYPE_BY_VALUE, FINANCIAL_REQUEST_TYPES, validateApprovalDetails } from "@/lib/approvals";
import { getApprovalDashboard } from "@/lib/server/approvals-data";
import type { Json } from "@/lib/server/supabase-database";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { ApprovalApiError, approvalError, authorizeApproval, cleanText, optionalUuid, readApprovalJson, UUID } from "./_shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorizeApproval(request);
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await getApprovalDashboard(auth.principal));
  } catch (error) {
    return approvalError(error);
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApproval(request, true);
  if ("response" in auth) return auth.response;
  try {
    if (!auth.principal.userId) throw new ApprovalApiError("A persisted staff profile is required to create requests.", 403);
    const body = await readApprovalJson(request);
    const requestType = cleanText(body.requestType, "Request type", 80, true);
    const definition = APPROVAL_TYPE_BY_VALUE[requestType];
    if (!definition) throw new ApprovalApiError("Choose a valid request type.");
    const priorityLabel = cleanText(body.priority, "Priority", 20, true);
    if (!APPROVAL_PRIORITIES.includes(priorityLabel as (typeof APPROVAL_PRIORITIES)[number])) throw new ApprovalApiError("Choose a valid priority.");
    const details = body.details;
    if (!details || typeof details !== "object" || Array.isArray(details)) throw new ApprovalApiError("Request details are invalid.");
    const detailErrors = validateApprovalDetails(requestType, details as Record<string, unknown>);
    const submit = body.submit === true;
    if (submit && detailErrors.length) throw new ApprovalApiError(detailErrors[0]);
    let amountValue = body.amount === "" || body.amount === null || body.amount === undefined ? null : Number(body.amount);
    if (amountValue !== null && (!Number.isFinite(amountValue) || amountValue < 0 || amountValue > 100_000_000)) throw new ApprovalApiError("Enter a valid amount.");
    if (submit && FINANCIAL_REQUEST_TYPES.has(requestType) && (!amountValue || amountValue <= 0)) throw new ApprovalApiError("An amount greater than zero is required for this financial request.");
    const requiredBy = cleanText(body.requiredBy, "Required-by date", 10);
    if (requiredBy && !/^\d{4}-\d{2}-\d{2}$/.test(requiredBy)) throw new ApprovalApiError("Required-by date is invalid.");
    const idempotencyKey = cleanText(body.idempotencyKey, "Submission key", 36, true);
    if (!UUID.test(idempotencyKey)) throw new ApprovalApiError("Submission key is invalid.");

    const projectId = optionalUuid(body.projectId, "Project");
    let bookingId = optionalUuid(body.bookingId, "Booking");
    let clientId = optionalUuid(body.clientId, "Client");
    const employeeId = optionalUuid(body.employeeId, "Employee");
    let sourceReference = cleanText(body.sourceReference, "Source reference", 100);
    let sourceRecordId = optionalUuid(body.sourceRecordId, "Source record");
    if (requestType === "client_refund") {
      if (projectId || employeeId) throw new ApprovalApiError("Client refunds must be linked only to their payment.");
      const paymentId = cleanText((details as Record<string, unknown>).paymentId, "Payment ID", 36, true);
      if (!UUID.test(paymentId)) throw new ApprovalApiError("Payment ID is invalid.");
      const payment = await getSupabaseAdmin().from("payments").select("id,booking_id,client_id,processor,source,payment_method,status,amount_centavos,refunded_amount_centavos,add_on_amount_centavos").eq("id", paymentId).maybeSingle();
      if (payment.error) throw payment.error;
      if (!payment.data || payment.data.processor !== "none" || payment.data.source === "legacy_import" || payment.data.payment_method !== "cash" || payment.data.add_on_amount_centavos !== 0 || !["paid", "partially_refunded"].includes(payment.data.status)) throw new ApprovalApiError("Choose a paid, nonlegacy cash balance payment without add-ons.", 409);
      const requestedCentavos = amountValue === null ? 0 : amountValue * 100;
      const refundable = payment.data.amount_centavos - payment.data.refunded_amount_centavos;
      if (!Number.isSafeInteger(requestedCentavos) || requestedCentavos <= 0 || requestedCentavos > refundable) throw new ApprovalApiError("Refund amount must be an exact centavo amount within the refundable balance.");
      const booking = await getSupabaseAdmin().from("bookings").select("id,reference,client_id").eq("id", payment.data.booking_id).maybeSingle();
      if (booking.error) throw booking.error;
      if (!booking.data || booking.data.client_id !== payment.data.client_id) throw new ApprovalApiError("The payment booking could not be verified.", 409);
      bookingId = payment.data.booking_id;
      clientId = payment.data.client_id;
      sourceRecordId = payment.data.id;
      sourceReference = booking.data.reference;
      amountValue = requestedCentavos / 100;
    }
    if (projectId) {
      const project = await getSupabaseAdmin().from("projects").select("id,reference,client_id,booking_id").eq("id", projectId).maybeSingle();
      if (project.error) throw project.error;
      if (!project.data) throw new ApprovalApiError("The selected project no longer exists.", 409);
      if (clientId && clientId !== project.data.client_id || bookingId && bookingId !== project.data.booking_id) throw new ApprovalApiError("Project, booking, and client must belong to the same record.");
      clientId = project.data.client_id;
      bookingId = project.data.booking_id;
      sourceReference ||= project.data.reference;
    }
    if (bookingId && !projectId) {
      const booking = await getSupabaseAdmin().from("bookings").select("id,reference,client_id").eq("id", bookingId).maybeSingle();
      if (booking.error) throw booking.error;
      if (!booking.data || clientId && clientId !== booking.data.client_id) throw new ApprovalApiError("The selected booking and client do not match.");
      clientId = booking.data.client_id;
      sourceReference ||= booking.data.reference;
    }
    if (employeeId) {
      const employee = await getSupabaseAdmin().from("payroll_employees").select("id").eq("id", employeeId).eq("status", "active").maybeSingle();
      if (employee.error) throw employee.error;
      if (!employee.data) throw new ApprovalApiError("The selected employee is not active.", 409);
    }
    if (requestType === "cash_advance_liquidation") {
      amountValue = Number((details as Record<string, unknown>).totalSpent);
      const originalReference = typeof (details as Record<string, unknown>).originalAdvanceReference === "string" ? String((details as Record<string, unknown>).originalAdvanceReference).trim() : "";
      const original = await getSupabaseAdmin().from("approval_requests").select("id,reference,requester_id,status,fulfillment_status").eq("reference", originalReference).eq("request_type", "cash_advance").maybeSingle();
      if (original.error) throw original.error;
      if (!original.data || original.data.status !== "approved" || !["released", "awaiting_liquidation", "liquidation_submitted"].includes(original.data.fulfillment_status ?? "") || auth.principal.role === "staff" && original.data.requester_id !== auth.principal.userId) throw new ApprovalApiError("Choose an approved, released cash advance you are authorized to liquidate.");
      sourceRecordId = original.data.id;
      sourceReference = original.data.reference;
    }
    const result = await getSupabaseAdmin().rpc("approval_create_request", {
      requested_requester_id: auth.principal.userId,
      requested_idempotency_key: idempotencyKey,
      requested_request_type: requestType,
      requested_subject: cleanText(body.subject, "Subject", 255, true),
      requested_description: cleanText(body.description, "Description", 4000, true),
      requested_priority: priorityLabel.toLowerCase(),
      requested_source_module: definition.sourceModule,
      requested_details: details as Json,
      requested_submit: submit,
      requested_required_by: requiredBy || null,
      requested_amount_php: amountValue === null ? null : Math.round(amountValue * 100),
      requested_currency: cleanText(body.currency, "Currency", 3) || "PHP",
      requested_project_id: projectId,
      requested_booking_id: bookingId,
      requested_client_id: clientId,
      requested_employee_id: employeeId,
      requested_source_record_id: sourceRecordId,
      requested_source_reference: sourceReference || null,
      requested_notes: cleanText(body.notesToApprover, "Notes to approver", 2000) || null,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ request: result.data }, { status: 201 });
  } catch (error) {
    return approvalError(error);
  }
}
