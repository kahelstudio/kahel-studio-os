import "server-only";

import type { SupportedStorage } from "@supabase/auth-js";

const STORAGE_KEY = "kahel-staff-oauth";
const VERIFIER_KEY = `${STORAGE_KEY}-code-verifier`;

export const STAFF_OAUTH_VERIFIER_COOKIE = "kahel_staff_oauth_verifier";

export function createStaffOAuthStorage(verifier?: string) {
  const values = new Map<string, string>();
  if (verifier) values.set(VERIFIER_KEY, verifier);

  const storage: SupportedStorage = {
    isServer: true,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };

  return { storage, storageKey: STORAGE_KEY, verifier: () => values.get(VERIFIER_KEY) };
}

export function oauthVerifierFromRequest(request: Request) {
  const value = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${STAFF_OAUTH_VERIFIER_COOKIE}=([^;]+)`))?.[1];
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
