import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/customer-auth/auth-shell";
import { ForgotPasswordForm } from "@/components/customer-auth/auth-forms";
import styles from "@/components/customer-auth/customer-auth.module.css";

export const metadata: Metadata = { title: "Forgot password | Kahel Studio" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your email and we'll send instructions if it matches an account."
      footer={<Link className={styles.textLink} href="/sign-in">Back to sign in</Link>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
