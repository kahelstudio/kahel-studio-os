"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import { Eye, EyeOff } from "lucide-react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type LoginConfig = {
  turnstileRequired: boolean;
  turnstileConfigured: boolean;
  turnstileSiteKey: string;
  googleConfigured: boolean;
};

function safeStaffRedirect(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/os";
  try {
    const destination = new URL(raw, window.location.origin);
    if (destination.origin !== window.location.origin) return "/os";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/os";
  }
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.86a6.01 6.01 0 0 1 0-3.72V7.52H3.04a10 10 0 0 0 0 8.96l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [config, setConfig] = useState<LoginConfig | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const urlError = new URLSearchParams(window.location.search).get("error");
    if (urlError) queueMicrotask(() => setError(decodeURIComponent(urlError).replace(/_/g, " ")));
  }, []);

  useEffect(() => {
    fetch("/api/staff/session")
      .then((response) => response.json())
      .then((data) => setConfig(data as LoginConfig))
      .catch(() => setError("Authentication is temporarily unavailable."));
  }, []);

  useEffect(() => {
    if (!scriptReady || !config?.turnstileRequired || !config.turnstileSiteKey || !turnstileContainer.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(turnstileContainer.current, {
      sitekey: config.turnstileSiteKey,
      action: "turnstile-spin-v2",
      appearance: "always",
      size: "flexible",
      theme: "light",
      callback: (token: string) => {
        setTurnstileToken(token);
        setError("");
      },
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => {
        setTurnstileToken("");
        setError("Security verification could not load. Please try again.");
      },
    });
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [config?.turnstileRequired, config?.turnstileSiteKey, scriptReady]);

  function resetTurnstile() {
    setTurnstileToken("");
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (config?.turnstileRequired && !turnstileToken) {
      setError("Complete the security verification to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/staff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe, "cf-turnstile-response": turnstileToken }),
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setError(data.error ?? "Unable to sign in.");
        setSubmitting(false);
        resetTurnstile();
        return;
      }
      const raw = new URLSearchParams(window.location.search).get("next");
      const next = safeStaffRedirect(raw);
      window.location.href = next;
    } catch {
      setError("Unable to reach the authentication service. Please try again.");
      setSubmitting(false);
      resetTurnstile();
    }
  }

  async function requestPasswordReset() {
    if (!email) {
      setError("Enter your email address to reset your password.");
      return;
    }
    if (config?.turnstileRequired && !turnstileToken) {
      setError("Complete the security verification to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/staff/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, "cf-turnstile-response": turnstileToken }) });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setError(data.error ?? "Unable to request a password reset.");
        resetTurnstile();
      } else {
        setNotice("If this email is eligible, a password reset link has been sent.");
      }
    } catch {
      setError("Unable to request a password reset. Please try again.");
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  function continueWithGoogle() {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/api/staff/oauth/google";
  }

  return (
    <main className="min-h-dvh bg-[#eeece8] p-3 text-[#171513] sm:p-6 lg:p-8">
      {config?.turnstileRequired && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />}
      <section className="mx-auto grid min-h-[calc(100dvh-24px)] w-full max-w-[1440px] overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-[0_24px_80px_rgba(27,22,18,0.13)] sm:min-h-[calc(100dvh-48px)] lg:grid-cols-[minmax(380px,0.82fr)_minmax(560px,1.18fr)]">
        <aside className="relative hidden min-h-[720px] overflow-hidden bg-[#211c19] lg:block">
          <Image src="/Solo_Liza Burzon Bino_9A.jpg" alt="Portrait photographed at Kahel Studio" fill sizes="(min-width: 1024px) 42vw, 0px" className="object-cover object-[52%_40%]" priority />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,13,11,0.28)_0%,transparent_38%,rgba(17,13,11,0.84)_100%)]" />
          <a href="https://kahelstudio.com" className="absolute left-10 top-10 xl:left-12 xl:top-12"><Image src="/kahelstudio-logo_w.svg" alt="Kahel Studio" width={190} height={29} className="h-7 w-auto" priority /></a>
          <div className="absolute inset-x-10 bottom-10 text-white xl:inset-x-12 xl:bottom-12">
            <p className="max-w-[470px] font-display text-[32px] font-semibold leading-[1.16] tracking-[-0.03em] xl:text-[40px]">Every shoot, booking, and delivery in one place.</p>
            <div className="mt-6 h-1 w-12 rounded-full bg-[var(--color-kahel-500)]" />
            <p className="mt-4 text-sm font-medium text-white/78">Kahel Studio Operations</p>
          </div>
        </aside>

        <div className="flex min-h-[680px] items-center justify-center px-6 py-12 sm:px-12 lg:min-h-0 lg:px-16 xl:px-24">
          <div className="w-full max-w-[470px]">
            <a href="https://kahelstudio.com"><Image src="/kahelstudio-logo_b.svg" alt="Kahel Studio" width={180} height={27} className="mb-12 h-7 w-auto lg:hidden" priority /></a>
            <div className="mb-9 text-center">
              <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-kahel-600)]">Studio operations</p>
              <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.035em] sm:text-[40px]">Welcome back</h1>
              <p className="mx-auto mt-3 max-w-[390px] text-[15px] leading-6 text-[#706a65]">Sign in to manage bookings, projects, clients, and studio delivery.</p>
            </div>

            <form onSubmit={signIn}>
              <label className="block text-[13px] font-semibold text-[#393532]">
                Email
                <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 h-13 w-full rounded-[10px] border border-[#d8d4cf] bg-white px-4 text-[15px] font-normal outline-none transition placeholder:text-[#aaa49e] focus:border-[var(--color-kahel-500)] focus:ring-3 focus:ring-[var(--color-kahel-100)]" />
              </label>
              <label className="mt-5 block text-[13px] font-semibold text-[#393532]">
                Password
                <span className="relative mt-2 block">
                  <input type={passwordVisible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-13 w-full rounded-[10px] border border-[#d8d4cf] bg-white px-4 pr-12 text-[15px] font-normal outline-none transition focus:border-[var(--color-kahel-500)] focus:ring-3 focus:ring-[var(--color-kahel-100)]" />
                  <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#706a65] transition hover:text-[#393532] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-kahel-100)]" aria-label={passwordVisible ? "Hide password" : "Show password"}>
                    {passwordVisible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                  </button>
                </span>
              </label>
              <div className="mt-5 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] leading-none text-[#706a65]">
                  <span className="relative flex size-5 items-center justify-center">
                    <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="peer sr-only" />
                    <span className="absolute inset-0 rounded-[5px] border border-[#d8d4cf] bg-white transition peer-checked:border-[var(--color-kahel-500)] peer-checked:bg-[var(--color-kahel-500)] peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--color-kahel-100)]" />
                    <svg className="relative z-10 size-3 text-white opacity-0 transition peer-checked:opacity-100" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3.5 3.5L13 5" /></svg>
                  </span>
                  Keep me signed in
                </label>
                <button type="button" onClick={requestPasswordReset} disabled={submitting} className="text-[13px] font-semibold text-[var(--color-kahel-600)] transition hover:text-[var(--color-kahel-700)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-kahel-100)] disabled:opacity-55">Forgot password?</button>
              </div>

              <div ref={turnstileContainer} className="cf-turnstile mt-5 min-h-[1px] w-full" data-sitekey={config?.turnstileSiteKey ?? ""} data-action="turnstile-spin-v2" />
              {config?.turnstileRequired && !config.turnstileConfigured && <p className="mt-4 rounded-[10px] bg-[#fff3ed] px-4 py-3 text-sm font-medium text-[#9b3508]" role="alert">Security verification is not configured.</p>}
              {error && <p className="mt-4 text-sm font-medium text-[var(--color-danger-text)]" role="alert">{error}</p>}
              {notice && <p className="mt-4 text-sm font-medium text-[var(--color-success-text)]" role="status">{notice}</p>}

              <button disabled={submitting || !config || (config.turnstileRequired && !config.turnstileConfigured)} className="mt-6 h-13 w-full rounded-[10px] bg-[var(--color-kahel-500)] font-display text-sm font-semibold text-white transition hover:bg-[var(--color-kahel-600)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-kahel-200)] disabled:cursor-not-allowed disabled:opacity-55">{submitting ? "Signing in..." : "Sign in"}</button>
            </form>

            {config?.googleConfigured && (
              <><div className="my-7 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#aaa49e] before:h-px before:flex-1 before:bg-[#e5e1dd] after:h-px after:flex-1 after:bg-[#e5e1dd]">or</div>
              <div className="flex flex-col gap-3">
                <button type="button" onClick={continueWithGoogle} className="flex h-13 w-full items-center justify-center gap-3 rounded-[10px] border border-[#d8d4cf] bg-[#faf9f7] font-display text-sm font-semibold transition hover:border-[#aaa49e] hover:bg-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#e5e1dd]"><GoogleMark />Continue with Google</button>
              </div></>
            )}
            <p className="mt-8 text-center text-xs leading-5 text-[#8a847e]">Need staff access? Contact your Kahel Studio administrator.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
