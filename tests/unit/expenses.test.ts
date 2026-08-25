import { describe, expect, it } from "vitest";
import { expensePrimaryAction, formatPeso, parsePesoToCentavos, statusLabel } from "@/lib/expenses";

describe("expense money helpers", () => {
  it("parses exact peso values into integer centavos", () => {
    expect(parsePesoToCentavos("3000")).toBe(300000);
    expect(parsePesoToCentavos("3000.5")).toBe(300050);
    expect(parsePesoToCentavos("3000.05")).toBe(300005);
    expect(Number.isInteger(parsePesoToCentavos("0.01"))).toBe(true);
  });

  it("rejects zero, negative, malformed and over-precise amounts", () => {
    expect(parsePesoToCentavos("0")).toBeNull();
    expect(parsePesoToCentavos("-1")).toBeNull();
    expect(parsePesoToCentavos("1.001")).toBeNull();
    expect(parsePesoToCentavos("1e4")).toBeNull();
    expect(parsePesoToCentavos("NaN")).toBeNull();
  });

  it("formats Philippine peso amounts with two decimal places", () => {
    expect(formatPeso(300005)).toContain("3,000.05");
  });
});

describe("expense lifecycle presentation", () => {
  it("uses status-specific primary actions", () => {
    expect(expensePrimaryAction("draft", "not_applicable")).toBe("Continue expense");
    expect(expensePrimaryAction("needs_review", "pending")).toBe("Review expense");
    expect(expensePrimaryAction("approved", "approved")).toBe("Schedule payment");
    expect(expensePrimaryAction("paid", "paid")).toBe("View transaction");
    expect(statusLabel("changes_requested")).toBe("Changes Requested");
  });
});
