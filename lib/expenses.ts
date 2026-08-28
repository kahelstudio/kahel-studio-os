export function parsePesoToCentavos(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : String(value ?? "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [pesos, decimals = ""] = normalized.split(".");
  const result = Number(pesos) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

export function formatPeso(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(centavos / 100);
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function expensePrimaryAction(status: string, reimbursementState: string) {
  if (status === "draft") return "Continue expense";
  if (["submitted", "needs_review"].includes(status)) return "Review expense";
  if (status === "changes_requested") return "Correct expense";
  if (status === "approved" && reimbursementState === "approved") return "Schedule payment";
  if (status === "scheduled_for_payment") return "Record payment";
  if (status === "paid") return "View transaction";
  if (status === "rejected") return "Review rejection";
  return "View expense";
}
