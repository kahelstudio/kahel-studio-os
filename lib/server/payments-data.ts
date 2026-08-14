import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase-admin";
import { isRevenueStatus, netRevenueCentavos } from "@/lib/payments";

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type PaymentsDatabase = {
  public: {
    Tables: Record<
      "bookings" | "clients" | "client_profiles" | "invoices" | "invoice_items" |
      "payments" | "payment_line_items" | "payment_allocations" | "products" |
      "cash_transactions" | "receipts" | "receipt_line_items" | "payment_settlements" |
      "cash_registers" | "cash_register_sessions" | "cash_register_events" | "locations" | "staff_profiles" | "approval_requests",
      LooseTable
    >;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

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

export type PaymentLineSnapshot = {
  id: string;
  paymentId: string;
  lineType: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPriceCentavos: number;
  totalCentavos: number;
};

export type PaymentTransaction = {
  id: string;
  clientId: string;
  bookingId: string;
  invoiceId: string | null;
  bookingReference: string;
  invoiceReference: string | null;
  receiptId: string | null;
  receiptNumber: string | null;
  customerName: string;
  customerPhone: string | null;
  processor: string;
  source: string;
  paymentMethod: string;
  paymentMethodDetail: string | null;
  registerSessionLabel: string | null;
  purpose: string;
  status: string;
  settlementStatus: string;
  amountCentavos: number;
  balanceComponentCentavos: number;
  addOnAmountCentavos: number;
  refundedAmountCentavos: number;
  approvedRefunds: ApprovedCashRefund[];
  providerCheckoutSessionId: string | null;
  providerPaymentId: string | null;
  providerPaymentIntentId: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  lines: PaymentLineSnapshot[];
  lineItems: PaymentLineSnapshot[];
  searchText: string;
};

export type ApprovedCashRefund = { id: string; reference: string; amountCentavos: number; reason: string };

export type OutstandingBooking = {
  id: string;
  reference: string;
  clientId: string;
  clientProfileId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceType: string;
  serviceDate: string;
  serviceTime: string;
  status: string;
  paymentStatus: string;
  totalCentavos: number;
  paidCentavos: number;
  outstandingCentavos: number;
  pendingReservedCentavos: number;
  availableToCollectCentavos: number;
  invoice: null | {
    id: string;
    reference: string;
    status: string;
    totalCentavos: number;
    paidCentavos: number;
    items: Array<{ id: string; productId: string | null; kind: string; description: string; quantity: number; unitPriceCentavos: number; totalCentavos: number }>;
  };
  invoiceReference: string | null;
  invoiceItems: Array<{ id: string; productId: string | null; kind: string; description: string; quantity: number; unitPriceCentavos: number; totalCentavos: number }>;
  pendingReservations: Array<{ paymentId: string; amountCentavos: number; balanceCentavos: number; addOnCentavos: number; checkoutSessionId: string | null; createdAt: string }>;
  searchText: string;
};

export type PaymentProduct = { id: string; sku: string; name: string; category: string; unitPriceCentavos: number; stock: number; active: boolean; searchText: string };
export type PaymentSettlement = { id: string; paymentId: string; provider: string; providerSettlementId: string | null; status: string; grossCentavos: number; feeCentavos: number | null; netCentavos: number | null; grossAmountCentavos: number; feeAmountCentavos: number | null; netAmountCentavos: number | null; availableAt: string | null; settledAt: string | null; updatedAt: string };
export type CashRegisterOption = { registerId: string; registerCode: string; registerName: string; locationId: string; locationName: string; minimumCashCentavos: number; sessionId: string; sessionStatus: "open"; openedBy: string; openedAt: string; openingAmountCentavos: number; expectedCurrentAmountCentavos: number };
export type ReceivedToday = { totalCentavos: number; count: number; cashCentavos: number; paymongoCentavos: number; otherCentavos: number };
export type PaymentWorkspace = { receivedToday: ReceivedToday; collectibleBookings: OutstandingBooking[]; outstandingBookings: OutstandingBooking[]; outstanding: OutstandingBooking[]; transactions: PaymentTransaction[]; products: PaymentProduct[]; settlements: PaymentSettlement[]; cashRegisters: CashRegisterOption[]; summary: { receivedTodayCentavos: number; cashTodayCentavos: number; digitalTodayCentavos: number; outstandingCentavos: number; addOnMonthCentavos: number; paymongoPendingCentavos: number } };

type PaymentRecord = {
  id: string; client_id: string; booking_id: string; processor: string; source: string;
  payment_method: string; payment_method_detail: string | null; payment_purpose: string;
  status: string; settlement_status: string; amount_centavos: number;
  balance_component_centavos: number; add_on_amount_centavos: number; refunded_amount_centavos: number;
  provider_checkout_session_id: string | null; provider_payment_id: string | null;
  provider_payment_intent_id: string | null; note: string | null; paid_at: string | null; created_at: string;
};
type BookingRecord = { id: string; reference: string; client_id: string; client_profile_id: string; service_type: string; service_date: string; service_time: string; status: string; payment_status: string; total_amount_php: number; paid_amount_php: number };
type ClientRecord = { id: string; name: string };
type ProfileRecord = { id: string; client_id: string; email: string; mobile: string | null; status: string };
type InvoiceRecord = { id: string; booking_id: string | null; reference: string; status: string; total_amount_php: number; paid_amount_php: number };
type InvoiceItemRecord = { id: string; invoice_id: string; product_id: string | null; kind: string; description: string; quantity: number; unit_price_centavos: number; total_centavos: number };
type AllocationRecord = { payment_id: string; invoice_id: string | null };
type ReceiptRecord = { id: string; payment_id: string; receipt_number: string };
type SettlementRecord = { id: string; payment_id: string; provider: string; provider_settlement_id: string | null; status: string; gross_amount_centavos: number; fee_amount_centavos: number | null; net_amount_centavos: number | null; available_at: string | null; settled_at: string | null; updated_at: string };
type ProductRecord = { id: string; sku: string; name: string; category: string; price: number; stock: number; active: boolean };
type LineRecord = { id: string; payment_id: string; line_type: string; product_id: string | null; description: string; quantity: number; unit_price_centavos: number; total_centavos: number };
type CashTransactionRecord = { payment_id: string; register_session_id: string | null };
type CashSessionRecord = { id: string; register_id: string; status: string; opened_by: string; opened_at: string; opening_amount_centavos: number };
type CashRegisterRecord = { id: string; location_id: string; code: string; name: string };
type LocationRecord = { id: string; name: string; minimum_cash_centavos: number };
type CashEventRecord = { register_session_id: string; direction: string; amount_centavos: number };
type StaffRecord = { user_id: string; display_name: string };
type RefundApprovalRecord = { id: string; reference: string; source_record_id: string | null; amount_php: number | null; details: Record<string, unknown> };

export class PaymentsDataError extends Error {
  constructor(public readonly dataset: string, cause?: unknown) {
    super(`Unable to load payment ${dataset}.`, { cause });
    this.name = "PaymentsDataError";
  }
}

function db() {
  return getSupabaseAdmin() as unknown as SupabaseClient<PaymentsDatabase>;
}

function requireResult<T>(dataset: string, result: { data: T | null; error: unknown }): T {
  if (result.error) throw new PaymentsDataError(dataset, result.error);
  if (result.data === null) throw new PaymentsDataError(dataset);
  return result.data;
}

function number(value: number) {
  if (!Number.isSafeInteger(value)) throw new PaymentsDataError("amounts");
  return value;
}

function manilaDayBounds(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return { start: new Date(`${day}T00:00:00+08:00`), end: new Date(`${day}T00:00:00+08:00`).getTime() + 86_400_000 };
}

const compact = (...values: Array<string | null | undefined>) => values.filter(Boolean).join(" ").toLowerCase();

export async function getPaymentWorkspace(): Promise<PaymentWorkspace> {
  const admin = db();
  const [paymentsResult, linesResult, bookingsResult, clientsResult, profilesResult, invoicesResult, invoiceItemsResult, allocationsResult, receiptsResult, productsResult, settlementsResult, cashTransactionsResult, sessionsResult, registersResult, locationsResult, staffResult, refundApprovalsResult] = await Promise.all([
    admin.from("payments").select("id,client_id,booking_id,processor,source,payment_method,payment_method_detail,payment_purpose,status,settlement_status,amount_centavos,balance_component_centavos,add_on_amount_centavos,refunded_amount_centavos,provider_checkout_session_id,provider_payment_id,provider_payment_intent_id,note,paid_at,created_at").order("created_at", { ascending: false }).limit(1000).returns<PaymentRecord[]>(),
    admin.from("payment_line_items").select("id,payment_id,line_type,product_id,description,quantity,unit_price_centavos,total_centavos").order("created_at").limit(5000).returns<LineRecord[]>(),
    admin.from("bookings").select("id,reference,client_id,client_profile_id,service_type,service_date,service_time,status,payment_status,total_amount_php,paid_amount_php").neq("status", "cancelled").order("service_date", { ascending: true }).limit(1000).returns<BookingRecord[]>(),
    admin.from("clients").select("id,name").limit(2000).returns<ClientRecord[]>(),
    admin.from("client_profiles").select("id,client_id,email,mobile,status").eq("status", "active").order("created_at").limit(2000).returns<ProfileRecord[]>(),
    admin.from("invoices").select("id,booking_id,reference,status,total_amount_php,paid_amount_php").not("booking_id", "is", null).limit(1000).returns<InvoiceRecord[]>(),
    admin.from("invoice_items").select("id,invoice_id,product_id,kind,description,quantity,unit_price_centavos,total_centavos").order("created_at").limit(5000).returns<InvoiceItemRecord[]>(),
    admin.from("payment_allocations").select("payment_id,invoice_id").limit(2000).returns<AllocationRecord[]>(),
    admin.from("receipts").select("id,payment_id,receipt_number").limit(2000).returns<ReceiptRecord[]>(),
    admin.from("products").select("id,sku,name,category,price,stock,active").eq("active", true).order("name").limit(1000).returns<ProductRecord[]>(),
    admin.from("payment_settlements").select("id,payment_id,provider,provider_settlement_id,status,gross_amount_centavos,fee_amount_centavos,net_amount_centavos,available_at,settled_at,updated_at").order("updated_at", { ascending: false }).limit(1000).returns<SettlementRecord[]>(),
    admin.from("cash_transactions").select("payment_id,register_session_id").not("register_session_id", "is", null).limit(1000).returns<CashTransactionRecord[]>(),
    admin.from("cash_register_sessions").select("id,register_id,status,opened_by,opened_at,opening_amount_centavos").eq("status", "open").order("opened_at").returns<CashSessionRecord[]>(),
    admin.from("cash_registers").select("id,location_id,code,name").returns<CashRegisterRecord[]>(),
    admin.from("locations").select("id,name,minimum_cash_centavos").returns<LocationRecord[]>(),
    admin.from("staff_profiles").select("user_id,display_name").returns<StaffRecord[]>(),
    admin.from("approval_requests").select("id,reference,source_record_id,amount_php,details").eq("request_type", "client_refund").eq("status", "approved").neq("fulfillment_status", "paid").limit(1000).returns<RefundApprovalRecord[]>(),
  ]);

  const payments = requireResult("transactions", paymentsResult);
  const lines = requireResult("line snapshots", linesResult);
  const bookings = requireResult("bookings", bookingsResult);
  const clients = requireResult("clients", clientsResult);
  const profiles = requireResult("customer profiles", profilesResult);
  const invoices = requireResult("invoices", invoicesResult);
  const invoiceItems = requireResult("invoice items", invoiceItemsResult);
  const allocations = requireResult("allocations", allocationsResult);
  const receipts = requireResult("receipts", receiptsResult);
  const productsData = requireResult("products", productsResult);
  const settlementsData = requireResult("settlements", settlementsResult);
  const cashTransactions = requireResult("cash transactions", cashTransactionsResult);
  const sessions = requireResult("open cash register sessions", sessionsResult);
  const registers = requireResult("cash registers", registersResult);
  const locations = requireResult("cash register locations", locationsResult);
  const staff = requireResult("cash register staff", staffResult);
  const refundApprovals = requireResult("refund approvals", refundApprovalsResult);
  const cashEvents = sessions.length
    ? requireResult("cash register events", await admin.from("cash_register_events").select("register_session_id,direction,amount_centavos").in("register_session_id", sessions.map((session) => session.id)).returns<CashEventRecord[]>())
    : [];
  const transactionSessionIds = [...new Set(cashTransactions.map((row) => row.register_session_id).filter((id): id is string => Boolean(id)))];
  const transactionSessions = transactionSessionIds.length
    ? requireResult("cash transaction register sessions", await admin.from("cash_register_sessions").select("id,register_id,status,opened_by,opened_at,opening_amount_centavos").in("id", transactionSessionIds).returns<CashSessionRecord[]>())
    : [];

  const bookingById = new Map(bookings.map((row) => [row.id, row]));
  const clientById = new Map(clients.map((row) => [row.id, row]));
  const profileByClient = new Map<string, ProfileRecord>();
  for (const profile of profiles) if (!profileByClient.has(profile.client_id)) profileByClient.set(profile.client_id, profile);
  const invoiceByBooking = new Map(invoices.filter((row) => row.status !== "void").map((row) => [row.booking_id ?? "", row]));
  const voidInvoiceBookingIds = new Set(invoices.filter((row) => row.status === "void").map((row) => row.booking_id));
  const allocationByPayment = new Map(allocations.map((row) => [row.payment_id, row]));
  const receiptByPayment = new Map(receipts.map((row) => [row.payment_id, row]));
  const cashTransactionByPayment = new Map(cashTransactions.map((row) => [row.payment_id, row]));
  const registerById = new Map(registers.map((row) => [row.id, row]));
  const locationById = new Map(locations.map((row) => [row.id, row]));
  const staffById = new Map(staff.map((row) => [row.user_id, row.display_name]));
  const cashEventTotalBySession = new Map<string, number>();
  for (const event of cashEvents) cashEventTotalBySession.set(event.register_session_id, (cashEventTotalBySession.get(event.register_session_id) ?? 0) + (event.direction === "in" ? number(event.amount_centavos) : -number(event.amount_centavos)));
  const cashRegisters = sessions.map<CashRegisterOption>((session) => {
    const register = registerById.get(session.register_id);
    const location = register ? locationById.get(register.location_id) : undefined;
    if (!register || !location) throw new PaymentsDataError("cash register labels");
    const openingAmountCentavos = number(session.opening_amount_centavos);
    return { registerId: register.id, registerCode: register.code, registerName: register.name, locationId: location.id, locationName: location.name, minimumCashCentavos: number(location.minimum_cash_centavos), sessionId: session.id, sessionStatus: "open", openedBy: staffById.get(session.opened_by) ?? session.opened_by, openedAt: session.opened_at, openingAmountCentavos, expectedCurrentAmountCentavos: number(openingAmountCentavos + (cashEventTotalBySession.get(session.id) ?? 0)) };
  });
  const registerLabelBySession = new Map(transactionSessions.flatMap((session) => {
    const register = registerById.get(session.register_id);
    const location = register ? locationById.get(register.location_id) : undefined;
    return register && location ? [[session.id, `${location.name} · ${register.name}`] as const] : [];
  }));
  const linesByPayment = new Map<string, PaymentLineSnapshot[]>();
  for (const row of lines) {
    const line = { id: row.id, paymentId: row.payment_id, lineType: row.line_type, productId: row.product_id, description: row.description, quantity: row.quantity, unitPriceCentavos: number(row.unit_price_centavos), totalCentavos: number(row.total_centavos) };
    linesByPayment.set(row.payment_id, [...(linesByPayment.get(row.payment_id) ?? []), line]);
  }
  const refundApprovalsByPayment = new Map<string, ApprovedCashRefund[]>();
  for (const approval of refundApprovals) {
    if (!approval.source_record_id || !Number.isSafeInteger(approval.amount_php) || Number(approval.amount_php) <= 0) continue;
    const reason = typeof approval.details.reason === "string" ? approval.details.reason : "";
    refundApprovalsByPayment.set(approval.source_record_id, [...(refundApprovalsByPayment.get(approval.source_record_id) ?? []), { id: approval.id, reference: approval.reference, amountCentavos: Number(approval.amount_php), reason }]);
  }

  const transactions = payments.map<PaymentTransaction>((payment) => {
    const booking = bookingById.get(payment.booking_id);
    const client = clientById.get(payment.client_id);
    const profile = profileByClient.get(payment.client_id);
    const invoice = invoiceByBooking.get(payment.booking_id);
    const allocation = allocationByPayment.get(payment.id);
    const receipt = receiptByPayment.get(payment.id);
    const registerSessionId = cashTransactionByPayment.get(payment.id)?.register_session_id;
    const customerName = client?.name ?? "Unknown client";
    const bookingReference = booking?.reference ?? payment.booking_id;
    const invoiceReference = invoice?.reference ?? null;
    const paymentLines = linesByPayment.get(payment.id) ?? [];
    return {
      id: payment.id, clientId: payment.client_id, bookingId: payment.booking_id,
      invoiceId: allocation?.invoice_id ?? invoice?.id ?? null, bookingReference, invoiceReference,
      receiptId: receipt?.id ?? null, receiptNumber: receipt?.receipt_number ?? null,
      customerName, customerPhone: profile?.mobile ?? null, processor: payment.processor,
      source: payment.source, paymentMethod: payment.payment_method,
      paymentMethodDetail: payment.payment_method_detail, registerSessionLabel: registerSessionId ? registerLabelBySession.get(registerSessionId) ?? registerSessionId : null, purpose: payment.payment_purpose,
      status: payment.status, settlementStatus: payment.settlement_status,
      amountCentavos: number(payment.amount_centavos), balanceComponentCentavos: number(payment.balance_component_centavos),
      addOnAmountCentavos: number(payment.add_on_amount_centavos), refundedAmountCentavos: number(payment.refunded_amount_centavos),
      approvedRefunds: refundApprovalsByPayment.get(payment.id) ?? [],
      providerCheckoutSessionId: payment.provider_checkout_session_id, providerPaymentId: payment.provider_payment_id,
      providerPaymentIntentId: payment.provider_payment_intent_id, note: payment.note,
      paidAt: payment.paid_at, createdAt: payment.created_at, lines: paymentLines, lineItems: paymentLines,
      searchText: compact(customerName, profile?.mobile, bookingReference, payment.id, invoiceReference, receipt?.receipt_number, payment.provider_checkout_session_id, payment.provider_payment_id, payment.provider_payment_intent_id),
    };
  });

  const pendingByBooking = new Map<string, PaymentRecord[]>();
  for (const payment of payments) if (["pending", "failed", "expired"].includes(payment.status)) pendingByBooking.set(payment.booking_id, [...(pendingByBooking.get(payment.booking_id) ?? []), payment]);
  const itemsByInvoice = new Map<string, InvoiceItemRecord[]>();
  for (const item of invoiceItems) itemsByInvoice.set(item.invoice_id, [...(itemsByInvoice.get(item.invoice_id) ?? []), item]);

  const collectibleBookings = bookings.filter((booking) => !voidInvoiceBookingIds.has(booking.id)).map<OutstandingBooking>((booking) => {
    const client = clientById.get(booking.client_id);
    const profile = profileByClient.get(booking.client_id);
    const invoice = invoiceByBooking.get(booking.id);
    const pending = pendingByBooking.get(booking.id) ?? [];
    const pendingReservedCentavos = pending.reduce((sum, payment) => sum + number(payment.balance_component_centavos), 0);
    const outstandingCentavos = number(booking.total_amount_php - booking.paid_amount_php);
    const customerName = client?.name ?? "Unknown client";
    const mappedInvoiceItems = invoice ? (itemsByInvoice.get(invoice.id) ?? []).map((item) => ({ id: item.id, productId: item.product_id, kind: item.kind, description: item.description, quantity: item.quantity, unitPriceCentavos: number(item.unit_price_centavos), totalCentavos: number(item.total_centavos) })) : [];
    return {
      id: booking.id, reference: booking.reference, clientId: booking.client_id, clientProfileId: booking.client_profile_id,
      customerName, customerPhone: profile?.mobile ?? null, customerEmail: profile?.email ?? null,
      serviceType: booking.service_type, serviceDate: booking.service_date, serviceTime: booking.service_time,
      status: booking.status, paymentStatus: booking.payment_status, totalCentavos: number(booking.total_amount_php),
      paidCentavos: number(booking.paid_amount_php), outstandingCentavos, pendingReservedCentavos,
      availableToCollectCentavos: Math.max(0, outstandingCentavos - pendingReservedCentavos),
      invoice: invoice ? { id: invoice.id, reference: invoice.reference, status: invoice.status, totalCentavos: number(invoice.total_amount_php), paidCentavos: number(invoice.paid_amount_php), items: mappedInvoiceItems } : null,
      invoiceReference: invoice?.reference ?? null, invoiceItems: mappedInvoiceItems,
      pendingReservations: pending.map((payment) => ({ paymentId: payment.id, amountCentavos: number(payment.amount_centavos), balanceCentavos: number(payment.balance_component_centavos), addOnCentavos: number(payment.add_on_amount_centavos), checkoutSessionId: payment.provider_checkout_session_id, createdAt: payment.created_at })),
      searchText: compact(customerName, profile?.mobile, booking.reference, booking.id, invoice?.reference, invoice?.id, ...pending.flatMap((payment) => [payment.id, payment.provider_checkout_session_id, payment.provider_payment_id, payment.provider_payment_intent_id])),
    };
  });
  const outstandingBookings = collectibleBookings.filter((row) => row.outstandingCentavos > 0);

  const products = productsData.map<PaymentProduct>((product) => ({ id: product.id, sku: product.sku, name: product.name, category: product.category, unitPriceCentavos: number(Math.round(product.price * 100)), stock: product.stock, active: product.active, searchText: compact(product.name, product.sku, product.id) }));
  const settlements = settlementsData.map<PaymentSettlement>((row) => {
    const gross = number(row.gross_amount_centavos);
    const fee = row.fee_amount_centavos === null ? null : number(row.fee_amount_centavos);
    const net = row.net_amount_centavos === null ? null : number(row.net_amount_centavos);
    return { id: row.id, paymentId: row.payment_id, provider: row.provider, providerSettlementId: row.provider_settlement_id, status: row.status, grossCentavos: gross, feeCentavos: fee, netCentavos: net, grossAmountCentavos: gross, feeAmountCentavos: fee, netAmountCentavos: net, availableAt: row.available_at, settledAt: row.settled_at, updatedAt: row.updated_at };
  });
  const bounds = manilaDayBounds();
  const paidToday = transactions.filter((row) => isRevenueStatus(row.status) && row.paidAt && Date.parse(row.paidAt) >= bounds.start.getTime() && Date.parse(row.paidAt) < bounds.end);
  const receivedToday = paidToday.reduce<ReceivedToday>((summary, row) => {
    const net = netRevenueCentavos(row.status, row.amountCentavos, row.refundedAmountCentavos);
    summary.totalCentavos += net; summary.count += 1;
    if (row.paymentMethod === "cash") summary.cashCentavos += net;
    else if (row.processor === "paymongo") summary.paymongoCentavos += net;
    else summary.otherCentavos += net;
    return summary;
  }, { totalCentavos: 0, count: 0, cashCentavos: 0, paymongoCentavos: 0, otherCentavos: 0 });
  const manilaMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).format(new Date());
  const summary = {
    receivedTodayCentavos: receivedToday.totalCentavos,
    cashTodayCentavos: receivedToday.cashCentavos,
    digitalTodayCentavos: receivedToday.paymongoCentavos + receivedToday.otherCentavos,
    outstandingCentavos: outstandingBookings.reduce((sum, row) => sum + row.availableToCollectCentavos, 0),
    addOnMonthCentavos: transactions.filter((row) => isRevenueStatus(row.status) && row.paidAt && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).format(new Date(row.paidAt)) === manilaMonth).reduce((sum, row) => sum + Math.max(0, row.addOnAmountCentavos - row.refundedAmountCentavos), 0),
    paymongoPendingCentavos: settlements.filter((row) => row.status === "pending" || row.status === "available").reduce((sum, row) => sum + (row.netCentavos ?? row.grossCentavos), 0),
  };
  return { receivedToday, collectibleBookings, outstandingBookings, outstanding: outstandingBookings, transactions, products, settlements, cashRegisters, summary };
}

export async function getPaymentReceipt(paymentId: string) {
  const admin = db();
  const [paymentResult, receiptResult, paymentLinesResult] = await Promise.all([
    admin.from("payments").select("id,booking_id,client_id,status,payment_method,payment_method_detail,amount_centavos,paid_at,provider_payment_id,provider_payment_intent_id").eq("id", paymentId).maybeSingle<Record<string, unknown>>(),
    admin.from("receipts").select("id,payment_id,booking_id,invoice_id,receipt_number,client_name,booking_reference,invoice_reference,payment_method,amount_centavos,cash_received_centavos,change_centavos,note,issued_at").eq("payment_id", paymentId).maybeSingle<Record<string, unknown>>(),
    admin.from("payment_line_items").select("id,payment_id,line_type,product_id,description,quantity,unit_price_centavos,total_centavos").eq("payment_id", paymentId).order("created_at").returns<LineRecord[]>(),
  ]);
  if (paymentResult.error) throw new PaymentsDataError("payment", paymentResult.error);
  if (!paymentResult.data) return null;
  if (receiptResult.error) throw new PaymentsDataError("receipt", receiptResult.error);
  const paymentLines = requireResult("line snapshots", paymentLinesResult).map((line) => ({ id: line.id, paymentId: line.payment_id, lineType: line.line_type, productId: line.product_id, description: line.description, quantity: line.quantity, unitPriceCentavos: number(line.unit_price_centavos), totalCentavos: number(line.total_centavos) }));
  return { payment: paymentResult.data, receipt: receiptResult.data, lines: paymentLines };
}
