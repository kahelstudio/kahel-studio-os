import "server-only";

export const BILLEASE_MINIMUM_CENTAVOS = 10_000;
export const BILLEASE_MAXIMUM_CENTAVOS = 15_000_000;

const supportedMethods = new Set(["card", "gcash", "paymaya", "grab_pay", "qrph", "billease"]);
const defaultMethods = ["card", "gcash", "paymaya", "grab_pay", "qrph"];

function configuredMethods() {
  const configured = process.env.PAYMONGO_PAYMENT_METHODS
    ?.split(",")
    .map((method) => method.trim().toLowerCase())
    .filter((method) => supportedMethods.has(method));
  return [...new Set(configured?.length ? configured : defaultMethods)];
}

export function payMongoEnvironment() {
  return process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
}

export function payMongoPhilippinePhone(value: string | null | undefined) {
  const phone = value?.trim();
  if (!phone) return undefined;
  if (/^\+639\d{9}$/.test(phone)) return phone.slice(3);
  if (/^09\d{9}$/.test(phone)) return phone.slice(1);
  return phone;
}

export function getPayMongoPaymentCapability(amountCentavos: number, preferredMethod?: "billease") {
  const configured = configuredMethods();
  const bnplConfigured = process.env.PAYMONGO_BNPL_ENABLED === "true" && configured.includes("billease");
  const belowMinimum = amountCentavos < BILLEASE_MINIMUM_CENTAVOS;
  const aboveMaximum = amountCentavos > BILLEASE_MAXIMUM_CENTAVOS;
  const bnplAvailable = bnplConfigured && !belowMinimum && !aboveMaximum;
  const availableMethods = configured.filter((method) => method !== "billease" || bnplAvailable);
  const methods = preferredMethod === "billease" ? (bnplAvailable ? ["billease"] : []) : availableMethods;

  return {
    methods,
    bnpl: {
      id: "billease",
      category: "bnpl",
      customerLabel: "Buy Now Pay Later",
      configured: bnplConfigured,
      available: bnplAvailable,
      minimumAmount: BILLEASE_MINIMUM_CENTAVOS,
      maximumAmount: BILLEASE_MAXIMUM_CENTAVOS,
      currency: "PHP",
      reason: !bnplConfigured ? "disabled" : belowMinimum ? "below_minimum" : aboveMaximum ? "above_maximum" : null,
    },
  };
}
