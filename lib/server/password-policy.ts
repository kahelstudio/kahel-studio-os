import "server-only";

import { PASSWORD_BREACHED_MESSAGE, PASSWORD_REQUIREMENTS_MESSAGE, passwordMeetsPolicy } from "@/lib/password-policy";

export { PASSWORD_REQUIREMENTS_MESSAGE, passwordMeetsPolicy } from "@/lib/password-policy";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 2_000;

async function sha1Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Checks a password against HaveIBeenPwned's Pwned Passwords corpus using
 * k-anonymity: only the first five characters of the SHA-1 hash leave this
 * process, so the service cannot tell which password was checked. The endpoint
 * needs no API key. `Add-Padding` makes every response a uniform size so the
 * response length leaks nothing either, at the cost of decoy rows carrying a
 * count of zero — those are discarded below.
 *
 * Returns false whenever the service cannot be reached. This check is defence
 * in depth on top of the composition rules, so an outage must not stop someone
 * from setting a password on their own account.
 */
export async function passwordIsBreached(password: string) {
  try {
    const hash = await sha1Hex(password);
    const response = await fetch(`${HIBP_RANGE_URL}${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
    });
    if (!response.ok) return false;

    const suffix = hash.slice(5);
    for (const line of (await response.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      if (candidate === suffix) return Number(count) > 0;
    }
    return false;
  } catch {
    return false;
  }
}

/** Returns a user-facing message when the password is unacceptable, or null when it passes. */
export async function validatePassword(password: unknown): Promise<string | null> {
  if (typeof password !== "string" || !passwordMeetsPolicy(password)) return PASSWORD_REQUIREMENTS_MESSAGE;
  if (await passwordIsBreached(password)) return PASSWORD_BREACHED_MESSAGE;
  return null;
}
