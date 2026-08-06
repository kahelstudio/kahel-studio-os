import { getSupabaseAdmin } from "./supabase-admin";

export type FinanceKpis = {
  recordedMtd: number;
  bookletRemaining: number;
  unreconciled: number;
};

export type InvoiceRow = {
  id: string;
  reference: string;
  client: string;
  clientId: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
};

export type SaleRow = {
  id: string;
  reference: string;
  client: string | null;
  method: string;
  subtotal: number;
  total: number;
  recordedAt: string;
  items: number;
};

export type ExpenseRow = {
  id: string;
  ref: string;
  category: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
};

export type FinancePaymentRow = {
  id: string;
  ref: string;
  party: string;
  amount: number;
  method: string;
  status: string;
  date: string | null;
};

export async function getFinanceKpis(): Promise<FinanceKpis> {
  try {
    const admin = getSupabaseAdmin();
    const mtdStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    const { data: mtdInvoices, error: invError } = await admin
      .from("invoices")
      .select("total_amount_php")
      .gte("issued_at", mtdStart);

    if (invError) throw invError;

    const recordedMtd = (mtdInvoices ?? []).reduce((s: number, i: any) => s + (i.total_amount_php ?? 0), 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: openInvoices, error: openError } = await admin
      .from("invoices")
      .select("total_amount_php, paid_amount_php")
      .gte("issued_at", thirtyDaysAgo)
      .not("status", "eq", "paid");

    if (openError) throw openError;

    const bookletRemaining = (openInvoices ?? []).reduce(
      (s: number, i: any) => s + ((i.total_amount_php ?? 0) - (i.paid_amount_php ?? 0)),
      0,
    );

    let posTotal = 0;
    try {
      const { data: posSales, error: posError } = await admin
        .from("pos_sales")
        .select("total")
        .gte("recorded_at", mtdStart);

      if (!posError) {
        posTotal = (posSales ?? []).reduce((s: number, p: any) => s + (Number(p.total) ?? 0), 0);
      }
    } catch {}

    return {
      recordedMtd: recordedMtd + posTotal * 100,
      bookletRemaining,
      unreconciled: bookletRemaining,
    };
  } catch (error) {
    console.error("getFinanceKpis: table not available", (error as Error).message);
    return { recordedMtd: 0, bookletRemaining: 0, unreconciled: 0 };
  }
}

export async function getInvoices(): Promise<InvoiceRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("invoices")
      .select(`
        id,
        reference,
        client_id,
        currency,
        subtotal_amount_php,
        tax_amount_php,
        total_amount_php,
        paid_amount_php,
        status,
        issued_at,
        due_at,
        clients:client_id ( name )
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data ?? []).map((i: any) => ({
      id: i.id,
      reference: i.reference,
      client: i.clients?.name ?? "Unknown",
      clientId: i.client_id,
      currency: i.currency,
      subtotal: i.subtotal_amount_php ?? 0,
      tax: i.tax_amount_php ?? 0,
      total: i.total_amount_php ?? 0,
      paid: i.paid_amount_php ?? 0,
      status: i.status,
      issuedAt: i.issued_at,
      dueAt: i.due_at,
    }));
  } catch (error) {
    console.error("getInvoices: table not available", (error as Error).message);
    return [];
  }
}

export async function getSales(): Promise<SaleRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("pos_sales")
      .select(`
        id,
        reference,
        client_id,
        method,
        subtotal,
        total,
        recorded_at,
        clients:client_id ( name )
      `)
      .order("recorded_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const saleIds = (data ?? []).map((s: any) => s.id);

    let countMap = new Map<string, number>();
    try {
      if (saleIds.length > 0) {
        const { data: itemCounts, error: itemError } = await admin
          .from("pos_sale_items")
          .select("sale_id")
          .in("sale_id", saleIds);

        if (!itemError) {
          for (const item of itemCounts ?? []) {
            countMap.set(item.sale_id, (countMap.get(item.sale_id) ?? 0) + 1);
          }
        }
      }
    } catch {}

    return (data ?? []).map((s: any) => ({
      id: s.id,
      reference: s.reference,
      client: s.clients?.name ?? null,
      method: s.method,
      subtotal: Number(s.subtotal) ?? 0,
      total: Number(s.total) ?? 0,
      recordedAt: s.recorded_at,
      items: countMap.get(s.id) ?? 0,
    }));
  } catch (error) {
    console.error("getSales: table not available", (error as Error).message);
    return [];
  }
}

export async function getExpenses(): Promise<ExpenseRow[]> {
  try {
    const admin = getSupabaseAdmin();

    let maintenanceExpenses: ExpenseRow[] = [];
    try {
      const { data: maintenance, error: mError } = await admin
        .from("maintenance_records")
        .select("id, task, asset_label, maintenance_type, estimated_cost, status, created_at")
        .not("estimated_cost", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!mError) {
        maintenanceExpenses = (maintenance ?? []).map((m: any) => ({
          id: m.id,
          ref: m.asset_label,
          category: "Maintenance",
          type: m.maintenance_type,
          description: m.task,
          amount: Number(m.estimated_cost) ?? 0,
          date: m.created_at?.split("T")[0] ?? "",
          status: m.status,
        }));
      }
    } catch {}

    let payrollExpenses: ExpenseRow[] = [];
    try {
      const { data: payroll, error: pError } = await admin
        .from("payroll_runs")
        .select("id, reference, period_label, gross_total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!pError) {
        payrollExpenses = (payroll ?? []).map((p: any) => ({
          id: p.id,
          ref: p.reference,
          category: "Payroll",
          type: "Salary",
          description: p.period_label,
          amount: Number(p.gross_total) ?? 0,
          date: p.created_at?.split("T")[0] ?? "",
          status: p.status,
        }));
      }
    } catch {}

    return [...maintenanceExpenses, ...payrollExpenses]
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error("getExpenses: table not available", (error as Error).message);
    return [];
  }
}

export async function getPayments(): Promise<FinancePaymentRow[]> {
  try {
    const admin = getSupabaseAdmin();

    const { data: bookingPayments, error: bError } = await admin
      .from("bookings")
      .select(`
        id,
        reference,
        paid_amount_php,
        payment_status,
        created_at,
        clients:client_id ( name )
      `)
      .gt("paid_amount_php", 0)
      .order("created_at", { ascending: false })
      .limit(100);

    if (bError) throw bError;

    const { data: invoicePayments, error: iError } = await admin
      .from("invoices")
      .select(`
        id,
        reference,
        paid_amount_php,
        status,
        paid_at,
        clients:client_id ( name )
      `)
      .gt("paid_amount_php", 0)
      .order("paid_at", { ascending: false })
      .limit(100);

    if (iError) throw iError;

    const allPayments: FinancePaymentRow[] = [
      ...(bookingPayments ?? []).map((p: any) => ({
        id: p.id,
        ref: p.reference,
        party: p.clients?.name ?? "Unknown",
        amount: p.paid_amount_php ?? 0,
        method: "Online",
        status: p.payment_status,
        date: p.created_at,
      })),
      ...(invoicePayments ?? []).map((p: any) => ({
        id: p.id,
        ref: p.reference,
        party: p.clients?.name ?? "Unknown",
        amount: p.paid_amount_php ?? 0,
        method: "Invoice",
        status: p.status,
        date: p.paid_at,
      })),
    ];

    return allPayments.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 200);
  } catch (error) {
    console.error("getPayments: table not available", (error as Error).message);
    return [];
  }
}
