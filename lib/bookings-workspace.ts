export type BookingLifecycleId = "requested" | "booked" | "confirmed" | "rescheduled" | "in_progress" | "completed" | "cancelled" | "no_show";

export type BookingWorkspaceRow = {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientExternalRef: string | null;
  serviceType: string;
  serviceId: string | null;
  serviceDate: string;
  serviceTime: string;
  location: string;
  status: string;
  paymentStatus: string;
  totalAmountPhp: number;
  paidAmountPhp: number;
  refundedAmountPhp: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  kind: string;
  attendance: string;
  projectReference: string | null;
  projectStatus: string | null;
  invoiceReference: string | null;
  invoiceStatus: string | null;
  invoicePaidAmountPhp: number | null;
  invoiceTotalAmountPhp: number | null;
  paymongoPaymentMethod: string | null;
  paymongoPaymentDescription: string | null;
  paymongoPaidAt: string | null;
  paymongoAvailableAt: string | null;
  paymongoCheckoutSessionId: string | null;
  paymongoCheckoutUrl: string | null;
};

export type BookingWorkspaceFilters = {
  q: string;
  status: string;
  bookingType: string;
  service: string;
  location: string;
  payment: string;
  assigned: string;
  attention: string;
  date: string;
};

export type BookingWorkspaceSummary = {
  needsResponse: { count: number; context: string };
  today: { count: number; nextSession: string; nextClient: string; issue: string | null };
  awaitingPayment: { amount: string; count: number; upcoming: boolean };
};

export const PRIMARY_STATUSES = ["all", "requested", "booked", "confirmed", "rescheduled", "cancelled", "no_show"] as const;
export const MORE_STATUSES = ["in_progress", "completed"] as const;

export const STATUS_LABELS: Record<string, string> = {
  all: "All",
  requested: "Requested",
  booked: "Booked",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export const STATUS_TONES: Record<string, "neutral" | "info" | "success" | "warning" | "danger" | "violet"> = {
  requested: "info",
  booked: "violet",
  confirmed: "success",
  rescheduled: "warning",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
  no_show: "danger",
};

export const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Deposit required",
  pending: "Deposit pending",
  paid: "Paid",
  partially_paid: "Partially paid",
  refunded: "Refunded",
  failed: "Payment issue",
};

const BOOKING_TYPE_ORDER = ["studio", "event", "restaurant", "rental"] as const;

function manilaDateParts(date = new Date()) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: true }).formatToParts(date).map((part) => [part.type, part.value])
  ) as Record<string, string>;
}

export function manilaIsoDate(date = new Date()) {
  const parts = manilaDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatManilaDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00+08:00`));
}

export function formatManilaTime(value: string) {
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value);
  if (!match) return value || "Time unavailable";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return value;
  const period = hour < 12 ? "AM" : "PM";
  return `${hour % 12 || 12}:${match[2]} ${period}`;
}

export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount / 100);
}

export function formatCompactAge(createdAt: string, now = new Date()) {
  const diff = Math.max(0, Date.parse(now.toISOString()) - Date.parse(createdAt));
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "under 1 hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function normalizeLifecycle(row: BookingWorkspaceRow): BookingLifecycleId {
  if (row.attendance === "no_show" || row.status === "no_show") return "no_show";
  if (row.status === "rescheduled") return "rescheduled";
  if (row.status === "completed") return "completed";
  if (row.status === "progress" || row.status === "in_progress") return "in_progress";
  if (row.status === "confirmed") return "confirmed";
  if (row.status === "quoted") return "booked";
  return "requested";
}

export function bookingTypeFor(row: BookingWorkspaceRow) {
  const value = `${row.serviceType} ${row.location}`.toLowerCase();
  if (value.includes("rent") || value.includes("pickup")) return "Rental";
  if (value.includes("restaurant")) return "Restaurant";
  if (value.includes("event") || value.includes("wedding") || value.includes("corporate") || value.includes("birthday") || value.includes("christening") || value.includes("debut") || value.includes("anniversary") || value.includes("coverage")) return "Event";
  return "Studio";
}

export function bookingTypeKey(row: BookingWorkspaceRow) {
  return bookingTypeFor(row).toLowerCase();
}

export function statusLabel(row: BookingWorkspaceRow) {
  const lifecycle = normalizeLifecycle(row);
  return STATUS_LABELS[lifecycle] ?? lifecycle;
}

export function statusTone(row: BookingWorkspaceRow) {
  return STATUS_TONES[normalizeLifecycle(row)] ?? "neutral";
}

export function paymentLabel(row: BookingWorkspaceRow) {
  if (row.refundedAmountPhp >= row.paidAmountPhp && row.paidAmountPhp > 0) return PAYMENT_LABELS.refunded;
  return PAYMENT_LABELS[row.paymentStatus] ?? (row.totalAmountPhp > 0 ? PAYMENT_LABELS.unpaid : PAYMENT_LABELS.paid);
}

export function paymentBalance(row: BookingWorkspaceRow) {
  return Math.max(0, row.totalAmountPhp - row.paidAmountPhp - row.refundedAmountPhp);
}

export function isUpcoming(row: BookingWorkspaceRow, todayIso: string) {
  return row.serviceDate >= todayIso;
}

export function isToday(row: BookingWorkspaceRow, todayIso: string) {
  return row.serviceDate === todayIso;
}

export function bookingSearchText(row: BookingWorkspaceRow) {
  return [row.clientName, row.clientPhone ?? "", row.clientEmail ?? "", row.reference, row.serviceType, row.projectReference ?? ""].join(" ").toLowerCase();
}

export function attentionRequired(row: BookingWorkspaceRow) {
  return (
    row.status === "inquiry" ||
    row.status === "quoted" ||
    row.paymentStatus === "pending" ||
    row.paymentStatus === "failed" ||
    paymentBalance(row) > 0 ||
    row.attendance === "no_show"
  );
}

export function isOperationalBooking(row: BookingWorkspaceRow) {
  return row.kind !== "test" && row.kind !== "internal";
}

export function getBookingActionLabel(row: BookingWorkspaceRow) {
  const lifecycle = normalizeLifecycle(row);
  if (lifecycle === "requested") return "Review request";
  if (lifecycle === "booked") return "Confirm booking";
  if (lifecycle === "confirmed") return "Open booking";
  if (lifecycle === "in_progress") return "Open project";
  if (lifecycle === "completed") return "View delivery";
  if (lifecycle === "cancelled") return "Review cancellation";
  if (lifecycle === "no_show") return "Review no-show";
  return "Open booking";
}

export function filteredBookings(rows: BookingWorkspaceRow[], filters: BookingWorkspaceFilters) {
  const todayIso = manilaIsoDate();
  const query = filters.q.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (!isOperationalBooking(row)) return false;
      if (filters.status !== "all" && normalizeLifecycle(row) !== filters.status) {
        if (!(filters.status === "more" && MORE_STATUSES.includes(normalizeLifecycle(row) as (typeof MORE_STATUSES)[number]))) return false;
      }
      if (filters.bookingType && bookingTypeKey(row) !== filters.bookingType) return false;
      if (filters.service && !row.serviceType.toLowerCase().includes(filters.service.toLowerCase())) return false;
      if (filters.location && !row.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.payment && paymentLabel(row).toLowerCase() !== filters.payment.toLowerCase()) return false;
      if (filters.assigned === "unassigned" && row.projectReference) return false;
      if (filters.attention === "true" && !attentionRequired(row)) return false;
      if (filters.date === "upcoming" && !isUpcoming(row, todayIso)) return false;
      if (filters.date === "today" && !isToday(row, todayIso)) return false;
      if (filters.date === "this_week") {
        const current = Date.parse(`${todayIso}T00:00:00+08:00`);
        const limit = current + 6 * 24 * 60 * 60 * 1000;
        const slot = Date.parse(`${row.serviceDate}T00:00:00+08:00`);
        if (slot < current || slot > limit) return false;
      }
      if (filters.date === "this_month") {
        if (row.serviceDate.slice(0, 7) !== todayIso.slice(0, 7)) return false;
      }
      if (query && !bookingSearchText(row).includes(query)) return false;
      return true;
    })
    .sort((a, b) => {
      const aScore = `${a.serviceDate}T${a.serviceTime}`;
      const bScore = `${b.serviceDate}T${b.serviceTime}`;
      return aScore.localeCompare(bScore);
    });
}

export function bookingCounts(rows: BookingWorkspaceRow[]) {
  const primary: Record<string, number> = { all: 0, requested: 0, booked: 0, confirmed: 0, rescheduled: 0, cancelled: 0, no_show: 0, in_progress: 0, completed: 0 };
  for (const row of rows.filter(isOperationalBooking)) {
    primary.all += 1;
    const lifecycle = normalizeLifecycle(row);
    primary[lifecycle] += 1;
  }
  return primary;
}

export function bookingSummary(rows: BookingWorkspaceRow[]): BookingWorkspaceSummary {
  const todayIso = manilaIsoDate();
  const needsResponseRows = rows.filter((row) => isOperationalBooking(row) && (["inquiry", "quoted"].includes(row.status) || row.paymentStatus === "failed" || row.paymentStatus === "pending"));
  const oldestInquiry = needsResponseRows.reduce<BookingWorkspaceRow | null>((oldest, row) => {
    if (!oldest) return row;
    return Date.parse(row.createdAt) < Date.parse(oldest.createdAt) ? row : oldest;
  }, null);
  const todayRows = rows
    .filter(isOperationalBooking)
    .filter((row) => row.serviceDate === todayIso)
    .sort((a, b) => a.serviceTime.localeCompare(b.serviceTime));
  const nextToday = todayRows[0] ?? null;
  const unresolvedIssue = todayRows.find((row) => attentionRequired(row) && normalizeLifecycle(row) !== "cancelled") ?? null;
  const upcomingPaymentRows = rows.filter((row) => isOperationalBooking(row) && isUpcoming(row, todayIso) && paymentBalance(row) > 0 && !["cancelled", "no_show"].includes(normalizeLifecycle(row)));
  const amount = upcomingPaymentRows.reduce((sum, row) => sum + paymentBalance(row), 0);
  return {
    needsResponse: {
      count: needsResponseRows.length,
      context: oldestInquiry ? `Oldest inquiry: ${formatCompactAge(oldestInquiry.createdAt)}` : "No open requests",
    },
    today: {
      count: todayRows.length,
      nextSession: nextToday ? formatManilaTime(nextToday.serviceTime) : "No sessions",
      nextClient: nextToday ? nextToday.clientName : "No upcoming sessions",
      issue: unresolvedIssue ? `${unresolvedIssue.reference} needs attention` : null,
    },
    awaitingPayment: {
      amount: formatPeso(amount),
      count: upcomingPaymentRows.length,
      upcoming: upcomingPaymentRows.length > 0,
    },
  };
}

export function bookingFiltersFromSearchParams(searchParams: URLSearchParams): BookingWorkspaceFilters {
  return {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "all",
    bookingType: searchParams.get("bookingType") ?? "",
    service: searchParams.get("service") ?? "",
    location: searchParams.get("location") ?? "",
    payment: searchParams.get("payment") ?? "",
    assigned: searchParams.get("assigned") ?? "",
    attention: searchParams.get("attention") ?? "",
    date: searchParams.get("date") ?? "",
  };
}

export function bookingTypeOptions() {
  return [...BOOKING_TYPE_ORDER].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
}
