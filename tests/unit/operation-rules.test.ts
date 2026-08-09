import { describe, expect, it } from "vitest";
import { normalizePhilippinePhone } from "@/lib/operation-rules";

describe("create operation rules", () => {
  it("normalizes equivalent Philippine mobile formats to one client identifier", () => {
    expect(normalizePhilippinePhone("0917 123 4567")).toBe("+639171234567");
    expect(normalizePhilippinePhone("+63 (917) 123-4567")).toBe("+639171234567");
    expect(normalizePhilippinePhone("9171234567")).toBe("+639171234567");
  });

  it("rejects unusable phone identifiers", () => {
    expect(normalizePhilippinePhone("123")).toBe("");
  });
});
