import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/customer-auth/auth-shell";
import { SignUpForm } from "@/components/customer-auth/auth-forms";
import styles from "@/components/customer-auth/customer-auth.module.css";
import { getCustomerIdentity } from "@/lib/server/customer-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Create account | Kahel Studio" };

export default async function SignUpPage() {
  if (await getCustomerIdentity()) redirect("/portal");
  return (
    <AuthShell
      eyebrow="Customer portal"
      title="Create your account"
      description="Enter your details and we'll email a secure, one-time link so you can verify your address and choose your own password."
      footer={<>Already have an account? <Link className={styles.textLink} href="/sign-in">Sign in</Link></>}
    >
      <SignUpForm />
    </AuthShell>
  );
}
