"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useToast } from "@/components/toast/toast-provider";

type Dialog = "password" | "mfa" | "recovery" | null;
type MfaSetup = { factorId: string; qrCode: string; secret: string } | null;

export function SecurityActions({ email }: { email: string }) {
  const { fireToast } = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaSetup>(null);
  const [code, setCode] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [nextRecoveryEmail, setNextRecoveryEmail] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"email" | "verify">("email");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/staff/security/mfa").then(async (response) => response.ok ? await response.json() as { enabled: boolean; factorId: string | null } : null),
      fetch("/api/staff/security/recovery-email").then(async (response) => response.ok ? await response.json() as { recoveryEmail: string | null } : null),
    ]).then(([mfa, recovery]) => {
      if (mfa) { setMfaEnabled(Boolean(mfa.enabled)); setMfaFactorId(mfa.factorId ?? null); }
      if (recovery) setRecoveryEmail(recovery.recoveryEmail ?? null);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !submitting) setDialog(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [dialog, submitting]);

  function openDialog(next: Exclude<Dialog, null>) {
    setPassword("");
    setConfirmation("");
    setCode("");
    setMfaSetup(null);
    setNextRecoveryEmail(recoveryEmail ?? "");
    setRecoveryStep("email");
    setError("");
    setDialog(next);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) return setError("Passwords do not match.");
    await submit(async () => {
      const response = await fetch("/api/staff/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to change your password.");
      setDialog(null);
      fireToast("Password updated.", "success");
    });
  }

  async function manageMfa() {
    if (mfaEnabled && mfaFactorId) {
      if (!window.confirm("Disable two-factor authentication for this account?")) return;
      await submit(async () => {
        const response = await fetch("/api/staff/security/mfa", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ factorId: mfaFactorId }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to disable two-factor authentication.");
        setMfaEnabled(false);
        setMfaFactorId(null);
        setDialog(null);
        fireToast("Two-factor authentication disabled.", "success");
      });
      return;
    }
    await submit(async () => {
      const response = await fetch("/api/staff/security/mfa", { method: "POST" });
      const result = await response.json() as { factorId?: string; qrCode?: string; secret?: string; error?: string };
      if (!response.ok || !result.factorId || !result.qrCode || !result.secret) throw new Error(result.error ?? "Unable to start two-factor setup.");
      setMfaSetup({ factorId: result.factorId, qrCode: result.qrCode, secret: result.secret });
    });
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaSetup) return void manageMfa();
    await submit(async () => {
      const response = await fetch("/api/staff/security/mfa", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ factorId: mfaSetup.factorId, code }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to verify the authenticator.");
      setMfaEnabled(true);
      setMfaFactorId(mfaSetup.factorId);
      setDialog(null);
      fireToast("Two-factor authentication enabled.", "success");
    });
  }

  async function startRecoveryVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      const response = await fetch("/api/staff/security/recovery-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: nextRecoveryEmail }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to send a verification code.");
      setCode("");
      setRecoveryStep("verify");
    });
  }

  async function verifyRecoveryEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      const response = await fetch("/api/staff/security/recovery-email", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const result = await response.json() as { recoveryEmail?: string; error?: string };
      if (!response.ok || !result.recoveryEmail) throw new Error(result.error ?? "Unable to verify the recovery email.");
      setRecoveryEmail(result.recoveryEmail);
      setDialog(null);
      fireToast("Recovery email verified.", "success");
    });
  }

  async function removeRecoveryEmail() {
    if (!window.confirm("Remove your recovery email?")) return;
    await submit(async () => {
      const response = await fetch("/api/staff/security/recovery-email", { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to remove the recovery email.");
      setRecoveryEmail(null);
      setDialog(null);
      fireToast("Recovery email removed.", "success");
    });
  }

  async function submit(action: () => Promise<void>) {
    setSubmitting(true);
    setError("");
    try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update security settings."); } finally { setSubmitting(false); }
  }

  const buttonClass = "ml-auto h-[34px] shrink-0 rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold hover:border-[var(--color-border-strong)]";
  return <>
    <div className="mt-6 overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
      <SecurityRow title="Password" detail="Manage your account password"><button type="button" onClick={() => openDialog("password")} className={buttonClass}>Change</button></SecurityRow>
      <SecurityRow title="Two-factor authentication" detail={mfaEnabled ? "Authenticator app · enabled" : "Add an extra layer of security"}><button type="button" onClick={() => openDialog("mfa")} className={buttonClass}>Manage</button></SecurityRow>
      <SecurityRow title="Recovery email" detail={recoveryEmail ?? `Not set · account email: ${email}`} last><button type="button" onClick={() => openDialog("recovery")} className={buttonClass}>Edit</button></SecurityRow>
    </div>
    {dialog && <DialogShell title={dialog === "password" ? "Change password" : dialog === "mfa" ? "Two-factor authentication" : "Recovery email"} description={dialog === "mfa" ? "Secure your account with an authenticator app." : dialog === "recovery" ? "Verify an alternate address for account recovery." : "Use a strong, unique password."} submitting={submitting} close={() => setDialog(null)}>
      {dialog === "password" && <form onSubmit={changePassword}><Field label="New password"><input autoFocus type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></Field><Field label="Confirm password"><input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} /></Field><ErrorMessage error={error} /><SubmitButton submitting={submitting} label="Update password" /></form>}
      {dialog === "mfa" && <form onSubmit={verifyMfa}>{mfaEnabled ? <div className="rounded-control bg-[var(--color-success-bg)] p-4"><div className="flex items-center gap-2 font-semibold text-[var(--color-success-text)]"><ShieldCheck className="h-5 w-5" />Two-factor authentication is enabled</div><p className="mt-2 text-sm text-[var(--color-text-secondary)]">You will need your authenticator code each time you sign in.</p></div> : mfaSetup ? <><div className="mx-auto h-48 w-48 bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(mfaSetup.qrCode)}")` }} /><p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">Can&apos;t scan? Enter <span className="font-mono font-semibold text-[var(--color-text-primary)]">{mfaSetup.secret}</span></p><Field label="6-digit code"><input autoFocus inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={`${inputClass} text-center font-mono text-xl tracking-[0.25em]`} /></Field></> : <p className="text-sm leading-6 text-[var(--color-text-secondary)]">Use Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app.</p>}<ErrorMessage error={error} />{mfaEnabled ? <button type="button" disabled={submitting} onClick={manageMfa} className="mt-5 min-h-11 w-full rounded-control border border-[var(--color-danger)] text-sm font-semibold text-[var(--color-danger-text)] disabled:opacity-55">{submitting ? "Disabling..." : "Disable two-factor authentication"}</button> : <SubmitButton submitting={submitting} disabled={Boolean(mfaSetup && code.length !== 6)} label={mfaSetup ? "Verify and enable" : "Set up authenticator"} />}</form>}
      {dialog === "recovery" && (recoveryStep === "email" ? <form onSubmit={startRecoveryVerification}><Field label="Recovery email"><input autoFocus type="email" required value={nextRecoveryEmail} onChange={(event) => setNextRecoveryEmail(event.target.value)} placeholder="you@example.com" className={inputClass} /></Field><p className="text-xs leading-5 text-[var(--color-text-muted)]">We&apos;ll send a verification code before this address can be used for password recovery.</p><ErrorMessage error={error} /><SubmitButton submitting={submitting} label="Send verification code" />{recoveryEmail && <button type="button" onClick={removeRecoveryEmail} disabled={submitting} className="mt-3 min-h-11 w-full text-sm font-semibold text-[var(--color-danger-text)]">Remove recovery email</button>}</form> : <form onSubmit={verifyRecoveryEmail}><p className="mb-4 text-sm text-[var(--color-text-secondary)]">Enter the code sent to <strong>{nextRecoveryEmail}</strong>.</p><Field label="6-digit code"><input autoFocus inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={`${inputClass} text-center font-mono text-xl tracking-[0.25em]`} /></Field><ErrorMessage error={error} /><SubmitButton submitting={submitting} disabled={code.length !== 6} label="Verify recovery email" /></form>)}
    </DialogShell>}
  </>;
}

const inputClass = "mt-1.5 min-h-11 w-full rounded-control border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-normal outline-none focus:border-[var(--color-kahel-500)]";
function SecurityRow({ title, detail, children, last = false }: { title: string; detail: string; children: React.ReactNode; last?: boolean }) { return <div className={`flex items-center gap-4 px-5 py-4 ${last ? "" : "border-b border-[var(--color-border)]"}`}><div><div className="text-sm font-semibold">{title}</div><div className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{detail}</div></div>{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mb-4 block text-sm font-semibold">{label}{children}</label>; }
function ErrorMessage({ error }: { error: string }) { return error ? <p className="mt-3 text-sm font-medium text-[var(--color-danger-text)]" role="alert">{error}</p> : null; }
function SubmitButton({ submitting, label, disabled = false }: { submitting: boolean; label: string; disabled?: boolean }) { return <button disabled={submitting || disabled} className="mt-5 min-h-11 w-full rounded-control bg-[var(--color-kahel-500)] text-sm font-semibold text-white disabled:opacity-55">{submitting ? "Please wait..." : label}</button>; }
function DialogShell({ title, description, submitting, close, children }: { title: string; description: string; submitting: boolean; close: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="security-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) close(); }}><section className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-card border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-dialog)] sm:max-w-md sm:rounded-card"><header className="flex items-start gap-4 border-b border-[var(--color-border)] p-5"><div><h2 id="security-dialog-title" className="font-display text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p></div><button type="button" onClick={close} disabled={submitting} className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close dialog"><X className="h-4 w-4" /></button></header><div className="p-5">{children}</div></section></div>; }
