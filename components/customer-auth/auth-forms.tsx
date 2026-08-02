"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import styles from "./customer-auth.module.css";

const PASSWORD_POLICY = "Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.";

function safePortalNext() {
  const value = new URLSearchParams(window.location.search).get("next");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/portal";

  try {
    const destination = new URL(value, window.location.origin);
    const isPortalPath = destination.pathname === "/portal" || destination.pathname.startsWith("/portal/");
    if (destination.origin !== window.location.origin || !isPortalPath) return "/portal";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/portal";
  }
}

function passwordMeetsPolicy(password: string) {
  return password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

type TextFieldProps = {
  id: string;
  label: string;
  type?: "text" | "email" | "tel";
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function TextField({ id, label, type = "text", autoComplete, value, onChange, placeholder }: TextFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <span className={styles.inputWrap}>
        <input
          className={styles.input}
          id={id}
          name={id}
          type={type}
          inputMode={type === "email" ? "email" : type === "tel" ? "tel" : "text"}
          autoCapitalize={type === "email" ? "none" : "words"}
          autoComplete={autoComplete}
          spellCheck={type !== "email"}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </span>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
};

function PasswordField({ id, label, autoComplete, value, onChange, describedBy }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <span className={styles.inputWrap}>
        <input
          className={`${styles.input} ${styles.passwordInput}`}
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
        />
        <button
          className={styles.passwordToggle}
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </div>
  );
}

function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className={`${styles.message} ${styles.error}`} role="alert">{error}</p>;
  if (success) return <p className={`${styles.message} ${styles.success}`} role="status">{success}</p>;
  return null;
}

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) {
        setError(response.status === 401 ? "Email or password is incorrect." : "Unable to sign in right now. Please try again.");
        return;
      }
      window.location.assign(safePortalNext());
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={submitting}>
      <TextField id="email" label="Email address" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <PasswordField id="password" label="Password" autoComplete="current-password" value={password} onChange={setPassword} />
      <div className={styles.formMeta}><Link className={styles.textLink} href="/forgot-password">Forgot password?</Link></div>
      <FormMessage error={error} />
      <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}

export function SignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), mobile: mobile.trim() }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "Please wait before requesting another account email." : "Unable to create your account right now. Please try again.");
        return;
      }
      setSuccess("Check your email to verify your account and create your password.");
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={submitting}>
      <TextField id="first-name" label="First name" autoComplete="given-name" value={firstName} onChange={setFirstName} />
      <TextField id="last-name" label="Last name" autoComplete="family-name" value={lastName} onChange={setLastName} />
      <TextField id="email" label="Email address" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <TextField id="mobile" label="Mobile number" type="tel" autoComplete="tel" value={mobile} onChange={setMobile} placeholder="0917 000 0000" />
      <FormMessage error={error} success={success} />
      {!success && <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? "Sending secure link..." : "Create account"}</button>}
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        setError("Unable to request a reset right now. Please try again.");
        return;
      }
      setSuccess("If an account matches that email, we'll send password reset instructions.");
    } catch {
      setError("Unable to request a reset right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={submitting}>
      <TextField id="email" label="Email address" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <FormMessage error={error} success={success} />
      <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? "Sending instructions..." : "Send reset instructions"}</button>
    </form>
  );
}

export function SetPasswordForm({ enabled }: { enabled: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!passwordMeetsPolicy(password)) return setError(PASSWORD_POLICY);
    if (password !== confirmation) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(response.status === 400 || response.status === 410 ? "This password link is invalid or has expired. Request a new one." : "Unable to update your password right now. Please try again.");
        return;
      }
      setComplete(true);
      setPassword("");
      setConfirmation("");
    } catch {
      setError("Unable to update your password right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!enabled) {
    return <div><FormMessage error="This password link is invalid, expired, or has already been used." /><Link className={styles.submit} href="/forgot-password" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Request a new link</Link></div>;
  }

  if (complete) {
    return (
      <div>
        <FormMessage success="Your password has been updated." />
        <Link className={styles.submit} href="/portal" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Continue to Client Portal</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={submitting}>
      <PasswordField id="password" label="New password" autoComplete="new-password" value={password} onChange={setPassword} describedBy="set-password-policy" />
      <p className={styles.policy} id="set-password-policy">{PASSWORD_POLICY}</p>
      <PasswordField id="password-confirmation" label="Confirm new password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
      <FormMessage error={error} />
      <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? "Updating password..." : "Update password"}</button>
    </form>
  );
}
