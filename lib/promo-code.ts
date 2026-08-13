export function promoDiscountPercentage(code: unknown) {
  if (typeof code !== "string") return 0;
  const match = /^kahel(\d{1,3})$/i.exec(code.trim());
  if (!match) return 0;
  const percentage = Number(match[1]);
  return percentage >= 1 && percentage <= 100 ? percentage : 0;
}

export function applyPromoDiscount(amount: number, code: unknown) {
  return Math.round(amount * (100 - promoDiscountPercentage(code)) / 100);
}
