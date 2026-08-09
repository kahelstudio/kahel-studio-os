"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState("");
  const [tokenHash, setTokenHash] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("access_token");
    const recoveryTokenHash = new URLSearchParams(window.location.search).get("token_hash");
    const linkError = new URLSearchParams(window.location.search).get("error_description") ?? fragment.get("error_description");
    const frame = window.requestAnimationFrame(() => {
      if (linkError) setError(linkError);
      else if (!token && !recoveryTokenHash) setError("This password reset link is invalid or has expired.");
      else {
        if (token) setAccessToken(token);
        if (recoveryTokenHash) setTokenHash(recoveryTokenHash);
        window.history.replaceState(null, "", "/reset-password");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12) return setError("Use a password with at least 12 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");
    const response = await fetch("/api/staff/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: accessToken || undefined, tokenHash: tokenHash || undefined, password }) });
    if (!response.ok) {
      const data = await response.json() as { error?: string };
      return setError(data.error ?? "Unable to reset your password.");
    }
    setComplete(true);
  }

  return <main className="grid min-h-dvh place-items-center bg-[#eeece8] p-6 text-[#171513]"><section className="w-full max-w-md rounded-[20px] border border-black/8 bg-white p-8 shadow-[0_24px_80px_rgba(27,22,18,0.13)]"><p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-kahel-600)]">Kahel Studio</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em]">Reset password</h1>{complete ? <p className="mt-4 text-sm leading-6 text-[#706a65]">Your password has been updated. <Link href="/login" className="font-semibold text-[var(--color-kahel-600)]">Sign in</Link></p> : <form className="mt-6" onSubmit={resetPassword}><label className="block text-sm font-semibold">New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d4cf] px-4 font-normal outline-none focus:border-[var(--color-kahel-500)] focus:ring-3 focus:ring-[var(--color-kahel-100)]" /></label><label className="mt-4 block text-sm font-semibold">Confirm password<input type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-12 w-full rounded-[10px] border border-[#d8d4cf] px-4 font-normal outline-none focus:border-[var(--color-kahel-500)] focus:ring-3 focus:ring-[var(--color-kahel-100)]" /></label>{error && <p className="mt-4 text-sm font-medium text-[var(--color-danger-text)]" role="alert">{error}</p>}<button disabled={!accessToken && !tokenHash} className="mt-6 h-12 w-full rounded-[10px] bg-[var(--color-kahel-500)] font-display text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55">Update password</button></form>}</section></main>;
}
