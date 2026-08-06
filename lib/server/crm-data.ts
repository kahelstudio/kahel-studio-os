/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseAdmin } from "./supabase-admin";

export type CrmQueueItem = {
  id: string;
  name: string;
  status: string;
  category: string;
  ref: string;
  nextActionDate: string | null;
  nextActionLabel: string;
};

export type AccountRow = {
  id: string;
  name: string;
  status: string;
  externalRef: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string | null;
  outstandingBalance: number;
};

export type AccountDetail = {
  id: string;
  name: string;
  status: string;
  externalRef: string;
  createdAt: string;
  bookings: Array<{
    ref: string;
    type: string;
    date: string;
    status: string;
    total: number;
    paid: number;
    balance: number;
  }>;
  payments: Array<{
    ref: string;
    amount: number;
    date: string | null;
    status: string;
  }>;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string | null;
    status: string;
  }>;
};

export async function getCrmQueue(): Promise<{ noNextAction: CrmQueueItem[]; dueToday: CrmQueueItem[]; overdue: CrmQueueItem[] }> {
  try {
    const admin = getSupabaseAdmin();
    const today = new Date().toISOString().split("T")[0];

    const { data: noAction, error: noError } = await admin
      .from("clients")
      .select("id, name, status")
      .is("primary_contact_profile_id", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (noError) {
      const { data: existingClients, error: clientErr } = await admin
        .from("bookings")
        .select("client_id")
        .not("status", "in", '("cancelled","completed")')
        .limit(2000);

      if (!clientErr) {
        const activeClientIds = new Set((existingClients ?? []).map((b: any) => b.client_id));

        const { data: dueToday, error: dueError } = await admin
          .from("bookings")
          .select(`
            reference,
            service_date,
            status,
            client_id,
            clients:client_id ( id, name, status )
          `)
          .eq("service_date", today)
          .not("status", "in", '("cancelled","completed")')
          .order("created_at", { ascending: false });

        if (dueError) throw dueError;

        const { data: overdue, error: overError } = await admin
          .from("bookings")
          .select(`
            reference,
            service_date,
            status,
            client_id,
            clients:client_id ( id, name, status )
          `)
          .lt("service_date", today)
          .not("status", "in", '("cancelled","completed","inquiry")')
          .order("service_date", { ascending: true })
          .limit(50);

        if (overError) throw overError;

        return {
          noNextAction: (noAction ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            category: "No contact profile",
            ref: "",
            nextActionDate: null,
            nextActionLabel: "Add primary contact",
          })),
          dueToday: (dueToday ?? []).map((b: any) => ({
            id: b.clients?.id ?? "",
            name: b.clients?.name ?? "Unknown",
            status: b.clients?.status ?? "",
            category: b.status,
            ref: b.reference,
            nextActionDate: b.service_date,
            nextActionLabel: "Follow up",
          })),
          overdue: (overdue ?? []).map((b: any) => ({
            id: b.clients?.id ?? "",
            name: b.clients?.name ?? "Unknown",
            status: b.clients?.status ?? "",
            category: b.status,
            ref: b.reference,
            nextActionDate: b.service_date,
            nextActionLabel: "Overdue follow-up",
          })),
        };
      }
    }

    return { noNextAction: [], dueToday: [], overdue: [] };
  } catch (error) {
    console.error("getCrmQueue: table not available", (error as Error).message);
    return { noNextAction: [], dueToday: [], overdue: [] };
  }
}

export async function getAccounts(): Promise<AccountRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data: clients, error } = await admin
      .from("clients")
      .select("id, name, status, external_ref, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const clientIds = (clients ?? []).map((c: any) => c.id);

    const { data: bookings, error: bError } = await admin
      .from("bookings")
      .select("client_id, total_amount_php, paid_amount_php, status, service_date")
      .in("client_id", clientIds)
      .order("service_date", { ascending: false });

    if (bError) throw bError;

    const bookingMap = new Map<string, { count: number; total: number; lastDate: string | null; outstanding: number }>();
    for (const b of bookings ?? []) {
      const entry = bookingMap.get(b.client_id) ?? { count: 0, total: 0, lastDate: null, outstanding: 0 };
      entry.count++;
      entry.total += b.total_amount_php ?? 0;
      entry.outstanding += (b.total_amount_php ?? 0) - (b.paid_amount_php ?? 0);
      if (b.service_date && (!entry.lastDate || b.service_date > entry.lastDate)) {
        entry.lastDate = b.service_date;
      }
      bookingMap.set(b.client_id, entry);
    }

    return (clients ?? []).map((c: any) => {
      const bm = bookingMap.get(c.id);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        externalRef: c.external_ref,
        totalBookings: bm?.count ?? 0,
        totalSpent: bm?.total ?? 0,
        lastBooking: bm?.lastDate ?? null,
        outstandingBalance: bm?.outstanding ?? 0,
      };
    });
  } catch (error) {
    console.error("getAccounts: table not available", (error as Error).message);
    return [];
  }
}

export async function getAccountById(id: string): Promise<AccountDetail | null> {
  try {
    const admin = getSupabaseAdmin();

    const { data: client, error } = await admin
      .from("clients")
      .select("id, name, status, external_ref, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !client) return null;

    const { data: bookings, error: bError } = await admin
      .from("bookings")
      .select("reference, service_type, service_date, status, total_amount_php, paid_amount_php, payment_status")
      .eq("client_id", id)
      .order("service_date", { ascending: false })
      .limit(50);

    if (bError) throw bError;

    const { data: invoices, error: iError } = await admin
      .from("invoices")
      .select("reference, total_amount_php, status, paid_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (iError) throw iError;

    const { data: profiles, error: pError } = await admin
      .from("client_profiles")
      .select("id, first_name, last_name, email, mobile, status")
      .eq("client_id", id);

    if (pError) throw pError;

    return {
      id: (client as any).id,
      name: (client as any).name,
      status: (client as any).status,
      externalRef: (client as any).external_ref,
      createdAt: (client as any).created_at,
      bookings: (bookings ?? []).map((b: any) => ({
        ref: b.reference,
        type: b.service_type,
        date: b.service_date,
        status: b.status,
        total: b.total_amount_php ?? 0,
        paid: b.paid_amount_php ?? 0,
        balance: (b.total_amount_php ?? 0) - (b.paid_amount_php ?? 0),
      })),
      payments: (invoices ?? []).map((i: any) => ({
        ref: i.reference,
        amount: i.total_amount_php ?? 0,
        date: i.paid_at,
        status: i.status,
      })),
      contacts: (profiles ?? []).map((p: any) => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        mobile: p.mobile,
        status: p.status,
      })),
    };
  } catch (error) {
    console.error("getAccountById: table not available", (error as Error).message);
    return null;
  }
}
