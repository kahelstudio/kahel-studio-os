import "server-only";

import { getSupabaseAdmin } from "./supabase-admin";
import type { BookingWorkspaceRow } from "@/lib/bookings-workspace";

type BookingRow = {
  id: string;
  reference: string;
  client_id: string;
  client_profile_id: string;
  service_type: string;
  service_id: string | null;
  service_date: string;
  service_time: string;
  location: string;
  status: string;
  payment_status: string;
  subtotal_amount_php: number;
  total_amount_php: number;
  paid_amount_php: number;
  refunded_amount_php: number;
  completed_at: string | null;
  attendance: string;
  kind: string;
  created_at: string;
  updated_at: string;
  paymongo_payment_method: string | null;
  paymongo_payment_description: string | null;
  paymongo_paid_at: string | null;
  paymongo_available_at: string | null;
  paymongo_checkout_session_id: string | null;
  paymongo_checkout_url: string | null;
};

type ClientRow = { id: string; name: string; external_ref: string | null; phone: string | null; email: string | null };
type ProfileRow = { client_id: string; email: string; mobile: string | null };
type ProjectRow = { booking_id: string | null; reference: string; status: string };
type InvoiceRow = { booking_id: string | null; reference: string; status: string; total_amount_php: number; paid_amount_php: number };

function asRows(rows: BookingRow[], clients: Map<string, ClientRow>, profileByClient: Map<string, ProfileRow>, projectByBooking: Map<string, ProjectRow>, invoiceByBooking: Map<string, InvoiceRow>): BookingWorkspaceRow[] {
  return rows.map((row) => {
    const client = clients.get(row.client_id);
    const profile = profileByClient.get(row.client_id);
    const project = projectByBooking.get(row.id);
    const invoice = invoiceByBooking.get(row.id);
    return {
      id: row.id,
      reference: row.reference,
      clientId: row.client_id,
      clientName: client?.name ?? "Unknown client",
      clientEmail: profile?.email ?? client?.email ?? null,
      clientPhone: profile?.mobile ?? client?.phone ?? null,
      clientExternalRef: client?.external_ref ?? null,
      serviceType: row.service_type,
      serviceId: row.service_id,
      serviceDate: row.service_date,
      serviceTime: row.service_time,
      location: row.location,
      status: row.status,
      paymentStatus: row.payment_status,
      totalAmountPhp: row.total_amount_php,
      paidAmountPhp: row.paid_amount_php,
      refundedAmountPhp: row.refunded_amount_php,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      kind: row.kind,
      attendance: row.attendance,
      projectReference: project?.reference ?? null,
      projectStatus: project?.status ?? null,
      invoiceReference: invoice?.reference ?? null,
      invoiceStatus: invoice?.status ?? null,
      invoicePaidAmountPhp: invoice?.paid_amount_php ?? null,
      invoiceTotalAmountPhp: invoice?.total_amount_php ?? null,
      paymongoPaymentMethod: row.paymongo_payment_method,
      paymongoPaymentDescription: row.paymongo_payment_description,
      paymongoPaidAt: row.paymongo_paid_at,
      paymongoAvailableAt: row.paymongo_available_at,
      paymongoCheckoutSessionId: row.paymongo_checkout_session_id,
      paymongoCheckoutUrl: row.paymongo_checkout_url,
    };
  });
}

export async function getBookingsWorkspaceRows() {
  const admin = getSupabaseAdmin();
  const [bookingsResult, clientsResult, profilesResult, projectsResult, invoicesResult] = await Promise.all([
    admin.from("bookings").select("id,reference,client_id,client_profile_id,service_type,service_id,service_date,service_time,location,status,payment_status,subtotal_amount_php,total_amount_php,paid_amount_php,refunded_amount_php,completed_at,attendance,kind,created_at,updated_at,paymongo_payment_method,paymongo_payment_description,paymongo_paid_at,paymongo_available_at,paymongo_checkout_session_id,paymongo_checkout_url").not("kind", "in", '("test","internal")').order("service_date", { ascending: true }).order("service_time", { ascending: true }).limit(500),
    admin.from("clients").select("id,name,external_ref,status").order("created_at", { ascending: false }).limit(500),
    admin.from("client_profiles").select("client_id,email,mobile").limit(500),
    admin.from("projects").select("booking_id,reference,status").not("booking_id", "is", null).limit(500),
    admin.from("invoices").select("id,booking_id,reference,status,total_amount_php,paid_amount_php" as string).not("booking_id", "is", null).limit(500),
  ]);

  if (bookingsResult.error) throw bookingsResult.error;
  const bookingRows = (bookingsResult.data ?? []) as BookingRow[];
  const clients = new Map<string, ClientRow>((clientsResult.data ?? []).map((item: { id: string; name: string; external_ref: string | null }) => [item.id, { id: item.id, name: item.name, external_ref: item.external_ref ?? null, phone: null, email: null }]));
  for (const profile of (profilesResult.data ?? []) as ProfileRow[]) {
    const entry = clients.get(profile.client_id);
    if (entry) {
      entry.phone = entry.phone ?? profile.mobile ?? null;
      entry.email = entry.email ?? profile.email ?? null;
    }
  }
  const profileByClient = new Map<string, ProfileRow>((profilesResult.data ?? []).map((profile: ProfileRow) => [profile.client_id, profile]));
  const projectsData = (projectsResult.data ?? []) as unknown as ProjectRow[];
  const invoicesData = (invoicesResult.data ?? []) as unknown as InvoiceRow[];
  const projects = new Map<string, ProjectRow>(projectsData.map((project) => [project.booking_id ?? "", project]));
  const invoices = new Map<string, InvoiceRow>(invoicesData.map((invoice) => [invoice.booking_id ?? "", invoice]));

  return asRows(bookingRows, clients, profileByClient, projects, invoices);
}
