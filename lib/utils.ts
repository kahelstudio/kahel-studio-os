import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPeso(centavos: number, opts?: { decimals?: boolean }) {
  const value = centavos / 100;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })
    .format(value)
    .replace("PHP", "₱")
    .replace("₱ ", "₱");
}

export function formatDate(iso: string, opts?: { withWeekday?: boolean }) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: opts?.withWeekday ? "long" : undefined,
    timeZone: "Asia/Manila",
  }).format(d);
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(d);
}
