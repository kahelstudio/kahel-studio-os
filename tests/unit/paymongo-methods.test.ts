import { afterEach, describe, expect, it } from "vitest";
import { BILLEASE_MAXIMUM_CENTAVOS, BILLEASE_MINIMUM_CENTAVOS, getPayMongoPaymentCapability, payMongoPhilippinePhone } from "@/lib/server/paymongo-methods";

const originalMethods = process.env.PAYMONGO_PAYMENT_METHODS;
const originalBnpl = process.env.PAYMONGO_BNPL_ENABLED;

afterEach(() => {
  if (originalMethods === undefined) delete process.env.PAYMONGO_PAYMENT_METHODS;
  else process.env.PAYMONGO_PAYMENT_METHODS = originalMethods;
  if (originalBnpl === undefined) delete process.env.PAYMONGO_BNPL_ENABLED;
  else process.env.PAYMONGO_BNPL_ENABLED = originalBnpl;
});

describe("PayMongo payment capabilities", () => {
  it("removes the country prefix that PayMongo renders separately", () => {
    expect(payMongoPhilippinePhone("+639175656456")).toBe("9175656456");
    expect(payMongoPhilippinePhone("09175656456")).toBe("9175656456");
    expect(payMongoPhilippinePhone(null)).toBeUndefined();
  });

  it("keeps BillEase disabled by default while preserving existing methods", () => {
    delete process.env.PAYMONGO_PAYMENT_METHODS;
    delete process.env.PAYMONGO_BNPL_ENABLED;
    const capability = getPayMongoPaymentCapability(100_000);
    expect(capability.methods).toEqual(["card", "gcash", "paymaya", "grab_pay", "qrph"]);
    expect(capability.bnpl.available).toBe(false);
  });

  it("requires both merchant configuration and the environment feature flag", () => {
    process.env.PAYMONGO_PAYMENT_METHODS = "card,gcash,paymaya,qrph,billease";
    process.env.PAYMONGO_BNPL_ENABLED = "false";
    expect(getPayMongoPaymentCapability(100_000).methods).not.toContain("billease");
    process.env.PAYMONGO_BNPL_ENABLED = "true";
    expect(getPayMongoPaymentCapability(100_000).methods).toContain("billease");
  });

  it("enforces the official BillEase centavo limits without removing other methods", () => {
    process.env.PAYMONGO_PAYMENT_METHODS = "card,gcash,qrph,billease";
    process.env.PAYMONGO_BNPL_ENABLED = "true";
    expect(getPayMongoPaymentCapability(BILLEASE_MINIMUM_CENTAVOS - 1).bnpl.reason).toBe("below_minimum");
    expect(getPayMongoPaymentCapability(BILLEASE_MAXIMUM_CENTAVOS + 1).bnpl.reason).toBe("above_maximum");
    expect(getPayMongoPaymentCapability(BILLEASE_MINIMUM_CENTAVOS).bnpl.available).toBe(true);
    expect(getPayMongoPaymentCapability(BILLEASE_MAXIMUM_CENTAVOS).bnpl.available).toBe(true);
    expect(getPayMongoPaymentCapability(BILLEASE_MAXIMUM_CENTAVOS + 1).methods).toEqual(["card", "gcash", "qrph"]);
  });

  it("makes BillEase the only checkout method when the customer selects BNPL", () => {
    process.env.PAYMONGO_PAYMENT_METHODS = "card,gcash,qrph,billease";
    process.env.PAYMONGO_BNPL_ENABLED = "true";
    expect(getPayMongoPaymentCapability(100_000, "billease").methods).toEqual(["billease"]);
    expect(getPayMongoPaymentCapability(BILLEASE_MINIMUM_CENTAVOS - 1, "billease").methods).toEqual([]);
  });
});
