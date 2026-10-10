import "server-only";

import { requireCustomerIdentity, getSupabaseCustomerClient } from "./customer-auth";
import { getSupabaseAdmin } from "./supabase-admin";

export type PortalBooking = {
  id: string;
  reference: string;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  location: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  agreementId: string | null;
  agreementVersion: number | null;
  agreementAcceptedAt: string | null;
  agreementStatus: string;
  agreementVersionId: string | null;
};

export type PortalProject = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  status: string;
  startsAt: string | null;
  completedAt: string | null;
  bookingId: string | null;
};

export type PortalProjectDetail = PortalProject & {
  bookingReference: string | null;
  bookingServiceType: string | null;
  bookingServiceDate: string | null;
  galleryCount: number;
};

export type PortalInvoice = {
  id: string;
  reference: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
};

export type PortalPayment = {
  id: string;
  paymentMethod: string;
  paymentPurpose: string;
  status: string;
  amountCentavos: number;
  paidAt: string | null;
  createdAt: string;
};

export type PortalMessage = {
  id: string;
  sender: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

function buildAgreementMap(
  requirements: Array<{ booking_id: string; status: string; acceptance_id: string | null; accepted_at: string | null; legal_document_version_id: string | null }>,
  acceptances: Array<{ id: string; version_number: number }>,
) {
  const requirementByBooking = new Map(requirements.map((row) => [row.booking_id, row]));
  const acceptanceById = new Map(acceptances.map((row) => [row.id, row]));
  return { requirementByBooking, acceptanceById };
}

function shapeBooking(
  row: { id: string; reference: string; service_type: string; service_date: string; service_time: string; location: string; status: string; payment_status: string; total_amount_php: number; paid_amount_php: number },
  requirementByBooking: Map<string, { booking_id: string; status: string; acceptance_id: string | null; accepted_at: string | null; legal_document_version_id: string | null }>,
  acceptanceById: Map<string, { id: string; version_number: number }>,
): PortalBooking {
  const requirement = requirementByBooking.get(row.id);
  const acceptance = requirement?.acceptance_id ? acceptanceById.get(requirement.acceptance_id) : null;
  return {
    id: row.id,
    reference: row.reference,
    serviceType: row.service_type,
    serviceDate: row.service_date,
    serviceTime: row.service_time,
    location: row.location,
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: row.total_amount_php,
    paidAmount: row.paid_amount_php,
    agreementId: requirement?.acceptance_id ?? null,
    agreementVersion: acceptance?.version_number ?? null,
    agreementAcceptedAt: requirement?.accepted_at ?? null,
    agreementStatus: requirement?.status ?? "unavailable",
    agreementVersionId: requirement?.legal_document_version_id ?? null,
  };
}

export async function getPortalOverview() {
  const identity = await requireCustomerIdentity("/portal");
  const client = getSupabaseCustomerClient(identity.accessToken);
  const [bookings, projects, invoices, galleries] = await Promise.all([
    client.from("bookings").select("id", { count: "exact", head: true }),
    client.from("projects").select("id", { count: "exact", head: true }),
    client.from("invoices").select("id,total_amount_php,paid_amount_php,status"),
    client.from("galleries").select("id", { count: "exact", head: true }),
  ]);
  const errors = [bookings.error, projects.error, invoices.error, galleries.error].filter(Boolean);
  if (errors.length) throw new Error("Unable to load customer portal.");
  const invoiceRows = invoices.data ?? [];
  return {
    identity,
    bookingCount: bookings.count ?? 0,
    projectCount: projects.count ?? 0,
    galleryCount: galleries.count ?? 0,
    outstandingAmount: invoiceRows.reduce((sum, invoice) => sum + Math.max(0, invoice.total_amount_php - invoice.paid_amount_php), 0),
  };
}

export async function getPortalBookings(): Promise<PortalBooking[]> {
  const identity = await requireCustomerIdentity("/portal/bookings");
  const client = getSupabaseCustomerClient(identity.accessToken);
  const { data, error } = await client.from("bookings")
    .select("id,reference,service_type,service_date,service_time,location,status,payment_status,total_amount_php,paid_amount_php")
    .order("service_date", { ascending: false });
  if (error) throw new Error("Unable to load bookings.");
  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const requirements = ids.length
    ? await client.from("booking_agreement_requirements").select("booking_id,status,acceptance_id,accepted_at,legal_document_version_id").in("booking_id", ids)
    : { data: [], error: null };
  const acceptanceIds = (requirements.data ?? []).flatMap((row) => row.acceptance_id ? [row.acceptance_id] : []);
  const acceptances = acceptanceIds.length
    ? await client.from("agreement_acceptances").select("id,version_number").in("id", acceptanceIds)
    : { data: [], error: null };
  if (requirements.error || acceptances.error) throw new Error("Unable to load booking agreements.");
  const { requirementByBooking, acceptanceById } = buildAgreementMap(requirements.data ?? [], acceptances.data ?? []);
  return rows.map((row) => shapeBooking(row, requirementByBooking, acceptanceById));
}

export async function getPortalBooking(reference: string) {
  const identity = await requireCustomerIdentity(`/portal/bookings/${reference}`);
  const client = getSupabaseCustomerClient(identity.accessToken);
  const { data, error } = await client.from("bookings")
    .select("id,reference,service_type,service_date,service_time,location,status,payment_status,total_amount_php,paid_amount_php")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error("Unable to load booking.");
  if (!data) return { identity, booking: null };
  const [requirementsResult, paymentsResult] = await Promise.all([
    client.from("booking_agreement_requirements").select("booking_id,status,acceptance_id,accepted_at,legal_document_version_id").eq("booking_id", data.id),
    client.from("payments").select("id,payment_method,payment_purpose,status,amount_centavos,paid_at,created_at").eq("booking_id", data.id).order("created_at", { ascending: false }),
  ]);
  if (requirementsResult.error) throw new Error("Unable to load booking agreement.");
  const requirements = requirementsResult.data ?? [];
  const acceptanceIds = requirements.flatMap((row) => row.acceptance_id ? [row.acceptance_id] : []);
  const acceptances = acceptanceIds.length
    ? await client.from("agreement_acceptances").select("id,version_number").in("id", acceptanceIds)
    : { data: [], error: null };
  if (acceptances.error) throw new Error("Unable to load booking agreement.");
  const { requirementByBooking, acceptanceById } = buildAgreementMap(requirements, acceptances.data ?? []);
  const booking = shapeBooking(data, requirementByBooking, acceptanceById);
  const payments: PortalPayment[] = (paymentsResult.data ?? [])
    .filter((p) => p.status === "paid" || p.status === "partially_refunded" || p.status === "refunded")
    .map((p) => ({
      id: p.id,
      paymentMethod: p.payment_method,
      paymentPurpose: p.payment_purpose,
      status: p.status,
      amountCentavos: p.amount_centavos as number,
      paidAt: p.paid_at,
      createdAt: p.created_at,
    }));
  return { identity, booking, payments };
}

export async function getPortalProjects(): Promise<PortalProject[]> {
  const identity = await requireCustomerIdentity("/portal/projects");
  const client = getSupabaseCustomerClient(identity.accessToken);
  const { data, error } = await client.from("projects")
    .select("id,reference,title,description,status,starts_at,completed_at,booking_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load projects.");
  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.title,
    description: row.description,
    status: row.status,
    startsAt: row.starts_at,
    completedAt: row.completed_at,
    bookingId: row.booking_id,
  }));
}

export async function getPortalProjectDetail(reference: string): Promise<PortalProjectDetail | null> {
  const identity = await requireCustomerIdentity(`/portal/projects/${reference}`);
  const client = getSupabaseCustomerClient(identity.accessToken);
  const { data, error } = await client.from("projects")
    .select("id,reference,title,description,status,starts_at,completed_at,booking_id")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error("Unable to load project.");
  if (!data) return null;
  const [bookingResult, galleryCountResult] = await Promise.all([
    data.booking_id
      ? client.from("bookings").select("id,reference,service_type,service_date").eq("id", data.booking_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client.from("galleries").select("id", { count: "exact", head: true }).eq("project_id", data.id),
  ]);
  const booking = bookingResult.data as { id: string; reference: string; service_type: string; service_date: string } | null;
  return {
    id: data.id,
    reference: data.reference,
    title: data.title,
    description: data.description,
    status: data.status,
    startsAt: data.starts_at,
    completedAt: data.completed_at,
    bookingId: data.booking_id,
    bookingReference: booking?.reference ?? null,
    bookingServiceType: booking?.service_type ?? null,
    bookingServiceDate: booking?.service_date ?? null,
    galleryCount: galleryCountResult.count ?? 0,
  };
}

export async function getPortalInvoices(): Promise<PortalInvoice[]> {
  const identity = await requireCustomerIdentity("/portal/invoices");
  const client = getSupabaseCustomerClient(identity.accessToken);
  const { data, error } = await client.from("invoices")
    .select("id,reference,total_amount_php,paid_amount_php,status,issued_at,due_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load invoices.");
  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    totalAmount: row.total_amount_php,
    paidAmount: row.paid_amount_php,
    status: row.status,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
  }));
}

export async function getPortalInvoicePayments(clientId: string): Promise<PortalPayment[]> {
  const identity = await requireCustomerIdentity("/portal/invoices");
  if (identity.clientId !== clientId) throw new Error("Unauthorized.");
  const client = getSupabaseCustomerClient(identity.accessToken);
  const { data, error } = await client.from("payments")
    .select("id,payment_method,payment_purpose,status,amount_centavos,paid_at,created_at")
    .in("status", ["paid", "partially_refunded", "refunded"])
    .order("paid_at", { ascending: false });
  if (error) throw new Error("Unable to load payment history.");
  return (data ?? []).map((p) => ({
    id: p.id,
    paymentMethod: p.payment_method,
    paymentPurpose: p.payment_purpose,
    status: p.status,
    amountCentavos: p.amount_centavos as number,
    paidAt: p.paid_at,
    createdAt: p.created_at,
  }));
}

export async function getPortalMessages(): Promise<PortalMessage[]> {
  const identity = await requireCustomerIdentity("/portal/messages");
  const client = getSupabaseCustomerClient(identity.accessToken);
  const { data, error } = await client.from("customer_messages")
    .select("id,sender,body,read_at,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load messages.");
  return (data ?? []).map((row) => ({
    id: row.id,
    sender: row.sender,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function getPortalProfile() {
  return requireCustomerIdentity("/portal/profile");
}

// Service-role is required here because the invoices page calls this with the
// authenticated identity's clientId, and the payment query must work even when
// individual invoice<>payment join paths are not yet on the customer-scoped client.
export async function getInvoicePaymentsByClient(clientId: string) {
  const identity = await requireCustomerIdentity("/portal/invoices");
  if (identity.clientId !== clientId) throw new Error("Unauthorized.");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("payments")
    .select("id,payment_method,payment_purpose,status,amount_centavos,paid_at,booking_id,created_at")
    .eq("client_id", clientId)
    .in("status", ["paid", "partially_refunded", "refunded"])
    .order("paid_at", { ascending: false });
  if (error) throw new Error("Unable to load payment history.");
  return (data ?? []).map((p) => ({
    id: p.id,
    paymentMethod: p.payment_method,
    paymentPurpose: p.payment_purpose,
    status: p.status,
    amountCentavos: p.amount_centavos as number,
    paidAt: p.paid_at,
    bookingId: p.booking_id as string,
    createdAt: p.created_at,
  }));
}
