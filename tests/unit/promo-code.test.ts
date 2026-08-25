import { describe, expect, it } from "vitest";
import { applyPromoDiscount, promoDiscountPercentage } from "@/lib/promo-code";

describe("promo codes", () => {
  it("extracts a case-insensitive percentage from the kahel format", () => {
    expect(promoDiscountPercentage("kahel35")).toBe(35);
    expect(promoDiscountPercentage(" KAHEL25 ")).toBe(25);
  });

  it("rejects malformed or out-of-range percentages", () => {
    expect(promoDiscountPercentage("kahel40")).toBe(0);
    expect(promoDiscountPercentage("promo40")).toBe(0);
    expect(promoDiscountPercentage("kahel0")).toBe(0);
    expect(promoDiscountPercentage("kahel101")).toBe(0);
  });

  it("applies the percentage and rounds to the nearest amount unit", () => {
    expect(applyPromoDiscount(300_000, "kahel35")).toBe(195_000);
    expect(applyPromoDiscount(999, "kahel25")).toBe(749);
    expect(applyPromoDiscount(1_500, "invalid")).toBe(1_500);
  });
});
