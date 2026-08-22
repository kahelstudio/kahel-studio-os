export type BalancePaymentResult = {
  kind: "none" | "partial" | "full";
  remainingCentavos: number;
};

export type CashPaymentResult = {
  sufficient: boolean;
  changeCentavos: number;
  shortfallCentavos: number;
};

export function collectionTotals(balanceCentavos: number, addOnCentavos: number) {
  return { balanceCentavos, addOnCentavos, totalCentavos: balanceCentavos + addOnCentavos };
}

export function balancePaymentResult(outstandingCentavos: number, paymentCentavos: number): BalancePaymentResult {
  const remainingCentavos = Math.max(0, outstandingCentavos - paymentCentavos);
  return {
    kind: paymentCentavos <= 0 ? "none" : remainingCentavos === 0 ? "full" : "partial",
    remainingCentavos,
  };
}

export function cashPaymentResult(totalCentavos: number, cashReceivedCentavos: number): CashPaymentResult {
  return {
    sufficient: cashReceivedCentavos >= totalCentavos,
    changeCentavos: Math.max(0, cashReceivedCentavos - totalCentavos),
    shortfallCentavos: Math.max(0, totalCentavos - cashReceivedCentavos),
  };
}

export function isRevenueStatus(status: string) {
  return ["paid", "partially_refunded", "refunded"].includes(status.toLowerCase());
}

export function netRevenueCentavos(status: string, amountCentavos: number, refundedCentavos: number) {
  return isRevenueStatus(status) ? Math.max(0, amountCentavos - refundedCentavos) : 0;
}

function searchable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesPaymentSearch(query: string, ...values: Array<string | null | undefined>) {
  const needle = searchable(query.trim());
  if (!needle) return true;
  const localPhone = /^0?9\d{9}$/.test(needle) ? needle.slice(-10) : null;
  return values.some((value) => {
    const candidate = searchable(value ?? "");
    return candidate.includes(needle) || (localPhone !== null && candidate.replace(/^63/, "").endsWith(localPhone));
  });
}

export function inventoryQuantityError(quantity: unknown, stock?: number) {
  if (!Number.isSafeInteger(quantity) || Number(quantity) <= 0) return "Quantity must be a positive integer.";
  if (Number(quantity) > 2_147_483_647) return "Quantity is too large.";
  if (stock !== undefined && Number(quantity) > stock) return "Quantity exceeds available stock.";
  return null;
}

export function idempotencyKeyAfterResult(currentKey: string, succeeded: boolean, createKey: () => string) {
  return succeeded ? createKey() : currentKey;
}
