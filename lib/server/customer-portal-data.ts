import "server-only";

import { requireCustomerIdentity } from "./customer-auth";
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

export type PortalProject = { id: string; reference: string; title: string; status: string; startsAt: string | null; completedAt: string | null };
export type PortalInvoice = { id: string; reference: string; totalAmount: number; paidAmount: number; status: string; issuedAt: string | null; dueAt: string | null };

export async function getPortalOverview() {
  const identity = await requireCustomerIdentity("/portal");
  const admin = getSupabaseAdmin();
  const [bookings, projects, invoices, galleries] = await Promise.all([
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("client_id", identity.clientId),
    admin.from("projects").select("id", { count: "exact", head: true }).eq("client_id", identity.clientId),
    admin.from("invoices").select("id,total_amount_php,paid_amount_php,status").eq("client_id", identity.clientId),
    admin.from("galleries").select("id", { count: "exact", head: true }).eq("client_id", identity.clientId).eq("published", true),
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
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("bookings")
    .select("id,reference,service_type,service_date,service_time,location,status,payment_status,total_amount_php,paid_amount_php")
    .eq("client_id", identity.clientId).order("service_date", { ascending: false });
  if (error) throw new Error("Unable to load bookings.");
  const ids = (data ?? []).map((row) => row.id);
  const requirements = ids.length ? await admin.from("booking_agreement_requirements").select("booking_id,status,acceptance_id,accepted_at,legal_document_version_id").eq("client_id", identity.clientId).in("booking_id", ids) : { data: [], error: null };
  const acceptanceIds = (requirements.data ?? []).flatMap((row) => row.acceptance_id ? [row.acceptance_id] : []);
  const acceptances = acceptanceIds.length ? await admin.from("agreement_acceptances").select("id,version_number").eq("client_id", identity.clientId).in("id", acceptanceIds) : { data: [], error: null };
  if (requirements.error || acceptances.error) throw new Error("Unable to load booking agreements.");
  const requirementByBooking = new Map((requirements.data ?? []).map((row) => [row.booking_id, row]));
  const acceptanceById = new Map((acceptances.data ?? []).map((row) => [row.id, row]));
  return (data ?? []).map((row) => {
    const requirement = requirementByBooking.get(row.id);
    const acceptance = requirement?.acceptance_id ? acceptanceById.get(requirement.acceptance_id) : null;
    return { id: row.id, reference: row.reference, serviceType: row.service_type, serviceDate: row.service_date, serviceTime: row.service_time, location: row.location, status: row.status, paymentStatus: row.payment_status, totalAmount: row.total_amount_php, paidAmount: row.paid_amount_php, agreementId: requirement?.acceptance_id ?? null, agreementVersion: acceptance?.version_number ?? null, agreementAcceptedAt: requirement?.accepted_at ?? null, agreementStatus: requirement?.status ?? "unavailable", agreementVersionId: requirement?.legal_document_version_id ?? null };
  });
}

export async function getPortalBooking(reference: string) {
  const identity = await requireCustomerIdentity(`/portal/bookings/${reference}`);
  const bookings = await getPortalBookings();
  return { identity, booking: bookings.find((row) => row.reference === reference) ?? null };
}

export async function getPortalProjects(): Promise<PortalProject[]> {
  const identity = await requireCustomerIdentity("/portal/projects");
  const { data, error } = await getSupabaseAdmin().from("projects")
    .select("id,reference,title,status,starts_at,completed_at").eq("client_id", identity.clientId).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load projects.");
  return (data ?? []).map((row) => ({ id: row.id, reference: row.reference, title: row.title, status: row.status, startsAt: row.starts_at, completedAt: row.completed_at }));
}

export async function getPortalInvoices(): Promise<PortalInvoice[]> {
  const identity = await requireCustomerIdentity("/portal/invoices");
  const { data, error } = await getSupabaseAdmin().from("invoices")
    .select("id,reference,total_amount_php,paid_amount_php,status,issued_at,due_at").eq("client_id", identity.clientId).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load invoices.");
  return (data ?? []).map((row) => ({ id: row.id, reference: row.reference, totalAmount: row.total_amount_php, paidAmount: row.paid_amount_php, status: row.status, issuedAt: row.issued_at, dueAt: row.due_at }));
}

export async function getPortalProfile() {
  return requireCustomerIdentity("/portal/profile");
}
