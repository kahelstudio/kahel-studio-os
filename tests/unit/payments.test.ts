import { describe, expect, it, vi } from "vitest";
import {
  balancePaymentResult,
  cashPaymentResult,
  collectionTotals,
  idempotencyKeyAfterResult,
  inventoryQuantityError,
  isRevenueStatus,
  matchesPaymentSearch,
  netRevenueCentavos,
} from "@/lib/payments";

describe("payment calculations", () => {
  it("combines balance and add-on amounts in centavos", () => {
    expect(collectionTotals(125_050, 24_950)).toEqual({ balanceCentavos: 125_050, addOnCentavos: 24_950, totalCentavos: 150_000 });
  });

  it("classifies partial and full balance payments", () => {
    expect(balancePaymentResult(100_000, 25_000)).toEqual({ kind: "partial", remainingCentavos: 75_000 });
    expect(balancePaymentResult(100_000, 100_000)).toEqual({ kind: "full", remainingCentavos: 0 });
    expect(balancePaymentResult(100_000, 0)).toEqual({ kind: "none", remainingCentavos: 100_000 });
  });

  it("calculates cash change and insufficient-cash shortfall", () => {
    expect(cashPaymentResult(12_500, 20_000)).toEqual({ sufficient: true, changeCentavos: 7_500, shortfallCentavos: 0 });
    expect(cashPaymentResult(12_500, 10_000)).toEqual({ sufficient: false, changeCentavos: 0, shortfallCentavos: 2_500 });
  });
});

describe("payment reporting and lookup", () => {
  it.each(["paid", "partially_refunded", "refunded"])("includes %s in revenue records", (status) => {
    expect(isRevenueStatus(status)).toBe(true);
  });

  it.each(["pending", "failed", "cancelled", "expired"])("excludes %s from revenue records", (status) => {
    expect(isRevenueStatus(status)).toBe(false);
  });

  it("reports revenue net of partial and full refunds", () => {
    expect(netRevenueCentavos("paid", 100_000, 0)).toBe(100_000);
    expect(netRevenueCentavos("partially_refunded", 100_000, 30_000)).toBe(70_000);
    expect(netRevenueCentavos("refunded", 100_000, 100_000)).toBe(0);
    expect(netRevenueCentavos("pending", 100_000, 0)).toBe(0);
  });

  it("searches formatted phone numbers and references case-insensitively", () => {
    expect(matchesPaymentSearch("0917 123 4567", "+63 (917) 123-4567", "KS-2026-A1B2")).toBe(true);
    expect(matchesPaymentSearch("ks2026a1", "+63 (917) 123-4567", "KS-2026-A1B2")).toBe(true);
    expect(matchesPaymentSearch("INV-404", "+63 (917) 123-4567", "KS-2026-A1B2")).toBe(false);
  });
});

describe("payment input safeguards", () => {
  it("accepts only positive integer inventory quantities within stock", () => {
    expect(inventoryQuantityError(2, 3)).toBeNull();
    expect(inventoryQuantityError(0, 3)).toBe("Quantity must be a positive integer.");
    expect(inventoryQuantityError(1.5, 3)).toBe("Quantity must be a positive integer.");
    expect(inventoryQuantityError(4, 3)).toBe("Quantity exceeds available stock.");
  });

  it("retains an idempotency key after failure and rotates it after success", () => {
    const createKey = vi.fn(() => "next-key");
    expect(idempotencyKeyAfterResult("request-key", false, createKey)).toBe("request-key");
    expect(createKey).not.toHaveBeenCalled();
    expect(idempotencyKeyAfterResult("request-key", true, createKey)).toBe("next-key");
    expect(createKey).toHaveBeenCalledOnce();
  });
});
