import { getSupabaseAdmin } from "./supabase-admin";

export type PaymentRow = {
  ref: string;
  party: string;
  dirLabel: string;
  dirBg: string;
  dirColor: string;
  method: string;
  stLabel: string;
  stBg: string;
  stColor: string;
  dirSign: string;
  amt: string;
};

export type PaymentKpi = {
  label: string;
  value: string;
  change: string;
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  paid: { label: "Paid", bg: "var(--color-teal-100)", color: "var(--color-teal-800)" },
  pending: { label: "Pending", bg: "var(--color-amber-100)", color: "var(--color-amber-800)" },
  unpaid: { label: "Unpaid", bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)" },
  failed: { label: "Failed", bg: "var(--color-red-100)", color: "var(--color-red-800)" },
  refunded: { label: "Refunded", bg: "var(--color-indigo-100)", color: "var(--color-indigo-800)" },
};

const RECEIVED = { label: "Received", bg: "var(--color-teal-50)", color: "var(--color-teal-700)" };

function formatCurrency(centavos: number) {
  return `\u20B1${(centavos / 100).toLocaleString("en-PH")}`;
}

export async function getPayments(): Promise<{ rows: PaymentRow[]; kpis: PaymentKpi[] }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("bookings").select(`
    reference,
    service_type,
    payment_status,
    payment_type,
    total_amount_php,
    paid_amount_php,
    client_id,
    clients:client_id ( name )
  `).eq("payment_status", "paid").order("created_at", { ascending: false }).limit(200);

  if (error) throw error;
  const bookings = data as unknown as Array<{
    reference: string;
    service_type: string;
    payment_status: string;
    payment_type: string;
    total_amount_php: number;
    paid_amount_php: number;
    client_id: string;
    clients: { name: string } | null;
  }>;

  const rows: PaymentRow[] = bookings.map((b) => {
    const badge = STATUS_BADGE[b.payment_status] ?? STATUS_BADGE.unpaid;
    return {
      ref: b.reference,
      party: b.clients?.name ?? "Unknown",
      dirLabel: RECEIVED.label,
      dirBg: RECEIVED.bg,
      dirColor: RECEIVED.color,
      method: "PayMongo",
      stLabel: badge.label,
      stBg: badge.bg,
      stColor: badge.color,
      dirSign: "+",
      amt: formatCurrency(b.total_amount_php),
    };
  });

  const totalReceived = bookings.reduce((s, b) => s + b.paid_amount_php, 0);
  const totalBilled = bookings.reduce((s, b) => s + b.total_amount_php, 0);

  const kpis: PaymentKpi[] = [
    { label: "Total received", value: formatCurrency(totalReceived), change: `${bookings.length} payments` },
    { label: "Bookings billed", value: `\u20B1${(totalBilled / 100).toLocaleString()}`, change: `${bookings.length} bookings` },
    { label: "Pending collections", value: formatCurrency(totalBilled - totalReceived), change: "Awaiting payment" },
  ];

  return { rows, kpis };
}

export async function getPaymentCounts(): Promise<{ paid: number; pending: number; total: number }> {
  const admin = getSupabaseAdmin();
  const { count: paid } = await admin.from("bookings").select("*", { count: "exact", head: true }).eq("payment_status", "paid");
  const { count: pending } = await admin.from("bookings").select("*", { count: "exact", head: true }).eq("payment_status", "pending");
  const { count: total } = await admin.from("bookings").select("*", { count: "exact", head: true });
  return {
    paid: paid ?? 0,
    pending: pending ?? 0,
    total: total ?? 0,
  };
}
