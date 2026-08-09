export function normalizePhilippinePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
}
