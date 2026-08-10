import { describe, expect, it } from "vitest";
import {
  APPROVAL_TYPES,
  BULK_ELIGIBLE_REQUEST_TYPES,
  FINANCIAL_REQUEST_TYPES,
  calculateLiquidation,
  sourceHref,
  validateApprovalDetails,
} from "@/lib/approvals";

describe("approval definitions", () => {
  it("keeps request keys unique and covers all core domains", () => {
    const keys = APPROVAL_TYPES.map((item) => item.value);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(expect.arrayContaining(["scope_change", "attendance_correction", "purchase_equipment", "cash_advance", "cash_advance_liquidation", "expense_reimbursement", "payroll_adjustment"]));
  });

  it("never permits sensitive financial requests in bulk", () => {
    for (const requestType of BULK_ELIGIBLE_REQUEST_TYPES) {
      expect(["cash_advance", "client_refund", "payroll_adjustment", "project_budget"]).not.toContain(requestType);
    }
    expect(FINANCIAL_REQUEST_TYPES.has("purchase_equipment")).toBe(true);
  });

  it("validates type-specific required fields", () => {
    expect(validateApprovalDetails("cash_advance", {})).toContain("Purpose is required.");
    expect(validateApprovalDetails("cash_advance", {
      purpose: "Production travel",
      expectedLiquidationDate: "2026-08-20",
      expenseCategory: "Transport",
      paymentMethod: "Bank transfer",
      recipient: "Employee",
      estimateBreakdown: "Fare",
      liquidationAcknowledged: true,
    })).toEqual([]);
  });

  it("calculates liquidation balances without negative return values", () => {
    expect(calculateLiquidation(10_000, 8_500, 500)).toEqual({ totalLiquidated: 8_500, remainingToReturn: 1_000, excessEligibleForReimbursement: 0, difference: -1_500 });
    expect(calculateLiquidation(10_000, 11_250)).toEqual({ totalLiquidated: 11_250, remainingToReturn: 0, excessEligibleForReimbursement: 1_250, difference: 1_250 });
  });

  it("only generates source URLs supported by existing routes", () => {
    expect(sourceHref("projects", "KS-PROJ-1")).toBe("/projects/KS-PROJ-1");
    expect(sourceHref("inventory", "ignored")).toBe("/inventory/equipment");
  });
});
