"use client";

import { useState } from "react";
import styles from "./customer-auth.module.css";

type CustomerSignOutButtonProps = {
  className?: string;
};

export function CustomerSignOutButton({ className = "" }: CustomerSignOutButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/customer/session", { method: "DELETE" });
      if (!response.ok) {
        setError("Unable to sign out right now. Please try again.");
        return;
      }
      window.location.assign("/sign-in");
    } catch {
      setError("Unable to sign out right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.signOutWrap}>
      <button className={`${styles.signOut} ${className}`} type="button" onClick={signOut} disabled={submitting}>
        {submitting ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className={styles.signOutError} role="alert">{error}</p> : null}
    </div>
  );
}
