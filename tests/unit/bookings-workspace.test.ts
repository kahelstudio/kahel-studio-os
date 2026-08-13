import { describe, expect, it } from "vitest";
import { bookingCounts, bookingSummary, filteredBookings, formatManilaTime, getBookingActionLabel, normalizeLifecycle, paymentLabel, type BookingWorkspaceRow } from "@/lib/bookings-workspace";

const rows: BookingWorkspaceRow[] = [
  { id: "1", reference: "KS-2026-0001", clientId: "c1", clientName: "Ana Cruz", clientEmail: "ana@example.com", clientPhone: "+639171111111", clientExternalRef: "KAHEL-1", serviceType: "Portrait Session", serviceId: null, serviceDate: "2026-08-12", serviceTime: "09:00", location: "Studio A", status: "inquiry", paymentStatus: "unpaid", totalAmountPhp: 5000, paidAmountPhp: 0, refundedAmountPhp: 0, completedAt: null, createdAt: "2026-08-12T01:00:00Z", updatedAt: "2026-08-12T01:00:00Z", kind: "standard", attendance: "expected", projectReference: null, projectStatus: null, invoiceReference: null, invoiceStatus: null, invoicePaidAmountPhp: null, invoiceTotalAmountPhp: null, paymongoPaymentMethod: null, paymongoPaymentDescription: null, paymongoPaidAt: null, paymongoAvailableAt: null, paymongoCheckoutSessionId: null, paymongoCheckoutUrl: null },
  { id: "2", reference: "KS-2026-0002", clientId: "c2", clientName: "Ben Lim", clientEmail: "ben@example.com", clientPhone: "+639181111111", clientExternalRef: "KAHEL-2", serviceType: "Wedding Coverage", serviceId: null, serviceDate: "2026-08-12", serviceTime: "12:00", location: "Fairmont Makati", status: "quoted", paymentStatus: "pending", totalAmountPhp: 185000, paidAmountPhp: 0, refundedAmountPhp: 0, completedAt: null, createdAt: "2026-08-12T00:30:00Z", updatedAt: "2026-08-12T00:30:00Z", kind: "standard", attendance: "expected", projectReference: null, projectStatus: null, invoiceReference: null, invoiceStatus: null, invoicePaidAmountPhp: null, invoiceTotalAmountPhp: null, paymongoPaymentMethod: null, paymongoPaymentDescription: null, paymongoPaidAt: null, paymongoAvailableAt: null, paymongoCheckoutSessionId: null, paymongoCheckoutUrl: null },
  { id: "3", reference: "KS-2026-0003", clientId: "c3", clientName: "Cara Tan", clientEmail: "cara@example.com", clientPhone: "+639191111111", clientExternalRef: "KAHEL-3", serviceType: "Rental Gear", serviceId: null, serviceDate: "2026-08-14", serviceTime: "15:00", location: "Pickup", status: "confirmed", paymentStatus: "partially_paid", totalAmountPhp: 12000, paidAmountPhp: 6000, refundedAmountPhp: 0, completedAt: null, createdAt: "2026-08-11T00:30:00Z", updatedAt: "2026-08-11T00:30:00Z", kind: "standard", attendance: "expected", projectReference: "KS-PROJ-1", projectStatus: "planned", invoiceReference: "INV-1", invoiceStatus: "issued", invoicePaidAmountPhp: 6000, invoiceTotalAmountPhp: 12000, paymongoPaymentMethod: "gcash", paymongoPaymentDescription: null, paymongoPaidAt: null, paymongoAvailableAt: null, paymongoCheckoutSessionId: null, paymongoCheckoutUrl: null },
  { id: "4", reference: "KS-2026-0004", clientId: "c4", clientName: "Dev Note", clientEmail: "dev@example.com", clientPhone: null, clientExternalRef: null, serviceType: "Internal Review", serviceId: null, serviceDate: "2026-08-12", serviceTime: "17:00", location: "Office", status: "confirmed", paymentStatus: "paid", totalAmountPhp: 0, paidAmountPhp: 0, refundedAmountPhp: 0, completedAt: null, createdAt: "2026-08-12T02:00:00Z", updatedAt: "2026-08-12T02:00:00Z", kind: "internal", attendance: "expected", projectReference: null, projectStatus: null, invoiceReference: null, invoiceStatus: null, invoicePaidAmountPhp: null, invoiceTotalAmountPhp: null, paymongoPaymentMethod: null, paymongoPaymentDescription: null, paymongoPaidAt: null, paymongoAvailableAt: null, paymongoCheckoutSessionId: null, paymongoCheckoutUrl: null },
];

describe("bookings workspace", () => {
  it("maps legacy statuses to the operational lifecycle", () => {
    expect(normalizeLifecycle(rows[0])).toBe("requested");
    expect(normalizeLifecycle(rows[1])).toBe("booked");
    expect(normalizeLifecycle(rows[2])).toBe("confirmed");
  });

  it("returns primary status counts from the full record set", () => {
    expect(bookingCounts(rows)).toMatchObject({ all: 3, requested: 1, booked: 1, confirmed: 1 });
  });

  it("excludes internal and test bookings from workspace results", () => {
    expect(filteredBookings(rows, { q: "", status: "all", bookingType: "", service: "", location: "", payment: "", assigned: "", attention: "", date: "" }).map((row) => row.reference)).toEqual(["KS-2026-0001", "KS-2026-0002", "KS-2026-0003"]);
    expect(bookingCounts(rows)).toMatchObject({ all: 3 });
    expect(bookingSummary(rows).needsResponse.count).toBe(2);
  });

  it("searches by customer, phone, service and booking reference", () => {
    expect(filteredBookings(rows, { q: "ben lim", status: "all", bookingType: "", service: "", location: "", payment: "", assigned: "", attention: "", date: "" })).toHaveLength(1);
    expect(filteredBookings(rows, { q: "+639191111111", status: "all", bookingType: "", service: "", location: "", payment: "", assigned: "", attention: "", date: "" })).toHaveLength(1);
    expect(filteredBookings(rows, { q: "KS-2026-0003", status: "all", bookingType: "", service: "", location: "", payment: "", assigned: "", attention: "", date: "" })).toHaveLength(1);
  });

  it("sorts upcoming rows by session date through the filtered view", () => {
    const filtered = filteredBookings([rows[2], rows[0], rows[1]], { q: "", status: "all", bookingType: "", service: "", location: "", payment: "", assigned: "", attention: "", date: "" });
    expect(filtered.map((row) => row.reference)).toEqual(["KS-2026-0001", "KS-2026-0002", "KS-2026-0003"]);
  });

  it("distinguishes payment state from booking lifecycle", () => {
    expect(paymentLabel(rows[1])).toBe("Deposit pending");
    expect(getBookingActionLabel(rows[2])).toBe("Open booking");
  });

  it("summarizes operational response and payment pressure", () => {
    const summary = bookingSummary(rows);
    expect(summary.needsResponse.count).toBeGreaterThan(0);
    expect(summary.awaitingPayment.count).toBeGreaterThan(0);
    expect(summary.awaitingPayment.upcoming).toBe(true);
  });

  it("keeps filtered summary counts aligned with visible rows", () => {
    const filtered = filteredBookings(rows, { q: "ben", status: "all", bookingType: "", service: "", location: "", payment: "", assigned: "", attention: "", date: "" });
    expect(filtered).toHaveLength(1);
    expect(bookingCounts(filtered)).toMatchObject({ all: 1, booked: 1 });
  });

  it("orders upcoming rows by session time", () => {
    const filtered = filteredBookings([
      { ...rows[1], serviceDate: "2026-08-12", serviceTime: "16:00" },
      { ...rows[0], serviceDate: "2026-08-12", serviceTime: "09:00" },
    ], { q: "", status: "all", bookingType: "", service: "", location: "", payment: "", assigned: "", attention: "", date: "" });
    expect(filtered.map((row) => row.reference)).toEqual(["KS-2026-0001", "KS-2026-0002"]);
  });

  it("formats PostgreSQL time values without creating an invalid date", () => {
    expect(formatManilaTime("09:00")).toBe("9:00 AM");
    expect(formatManilaTime("15:30:00")).toBe("3:30 PM");
    expect(formatManilaTime("23:59:00.123456")).toBe("11:59 PM");
    expect(formatManilaTime("invalid")).toBe("invalid");
  });
});
