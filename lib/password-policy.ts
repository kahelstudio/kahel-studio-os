// Composition rules for every password this application accepts. Kept free of
// server imports so the browser can give the same feedback the API enforces.
// The breach check lives in lib/server/password-policy.ts — it needs the
// network and must never run in the browser.

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIREMENTS_MESSAGE = `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters with an uppercase letter, a lowercase letter, a digit, and a symbol.`;

export const PASSWORD_BREACHED_MESSAGE = "This password has appeared in a known data breach. Choose a different one.";

export function passwordMeetsPolicy(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH
    && password.length <= PASSWORD_MAX_LENGTH
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}
