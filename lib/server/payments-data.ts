import { getSupabaseAdmin } from "./supabase-admin";

export type PaymentRow = {
  ref: string;
  method: string;
  paymentId: string | null;
  paymentIntentId: string | null;
  description: string;
  paidAt: string;
  settlementStatus: string;
  stLabel: string;
  stBg: string;
  stColor: string;
  amt: string;
};

export type PaymentKpi = {
  label: string;
  value: string;
  change: string;
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  paid: { label: "Paid", bg: "var(--color-success-bg)", color: "var(--color-success-text)" },
  partially_paid: { label: "Deposit", bg: "var(--color-indigo-100)", color: "var(--color-indigo-800)" },
  pending: { label: "Pending", bg: "var(--color-amber-100)", color: "var(--color-amber-800)" },
  unpaid: { label: "Unpaid", bg: "var(--color-surface-muted)", color: "var(--color-text-secondary)" },
  failed: { label: "Failed", bg: "var(--color-red-100)", color: "var(--color-red-800)" },
  refunded: { label: "Refunded", bg: "var(--color-indigo-100)", color: "var(--color-indigo-800)" },
};

function formatCurrency(centavos: number) {
  return `\u20B1${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPaymentMethod(method: string | null) {
  const labels: Record<string, string> = { card: "Card", gcash: "GCash", grab_pay: "GrabPay", paymaya: "Maya", qrph: "QR Ph", shopee_pay: "ShopeePay" };
  return method ? labels[method] ?? method.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "PayMongo";
}

function formatPaidAt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Manila" });
}

function settlementStatus(availableAt: string | null, creditedAt: string | null) {
  if (creditedAt && Date.parse(creditedAt) <= Date.now()) return "Settled";
  if (availableAt || creditedAt) return "Scheduled";
  return "Pending";
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
    paymongo_payment_id,
    paymongo_payment_intent_id,
    paymongo_payment_method,
    paymongo_payment_description,
    paymongo_paid_at,
    paymongo_available_at,
    paymongo_credited_at
  `).gt("paid_amount_php", 0).order("created_at", { ascending: false }).limit(200);

  if (error) throw error;
  const bookings = data as unknown as Array<{
    reference: string;
    service_type: string;
    payment_status: string;
    payment_type: string;
    total_amount_php: number;
    paid_amount_php: number;
    paymongo_payment_id: string | null;
    paymongo_payment_intent_id: string | null;
    paymongo_payment_method: string | null;
    paymongo_payment_description: string | null;
    paymongo_paid_at: string | null;
    paymongo_available_at: string | null;
    paymongo_credited_at: string | null;
  }>;

  const rows: PaymentRow[] = bookings.map((b) => {
    const badge = STATUS_BADGE[b.payment_status] ?? STATUS_BADGE.unpaid;
    return {
      ref: b.reference,
      method: formatPaymentMethod(b.paymongo_payment_method),
      paymentId: b.paymongo_payment_id,
      paymentIntentId: b.paymongo_payment_intent_id,
      description: b.service_type,
      paidAt: formatPaidAt(b.paymongo_paid_at),
      settlementStatus: settlementStatus(b.paymongo_available_at, b.paymongo_credited_at),
      stLabel: badge.label,
      stBg: badge.bg,
      stColor: badge.color,
      amt: formatCurrency(b.paid_amount_php),
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
