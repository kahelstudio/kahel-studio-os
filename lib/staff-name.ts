export function nameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.split("+")[0] ?? "";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function resolvedStaffName(storedName: string | null | undefined, email: string, fallback?: string | null) {
  if (storedName && !storedName.includes("@")) return storedName;
  return fallback || nameFromEmail(email) || "Staff member";
}
