import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/customer-auth/auth-shell";
import { SignInForm } from "@/components/customer-auth/auth-forms";
import styles from "@/components/customer-auth/customer-auth.module.css";
import { getCustomerIdentity } from "@/lib/server/customer-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in | Kahel Studio" };

export default async function SignInPage() {
  if (await getCustomerIdentity()) redirect("/portal");
  return (
    <AuthShell
      eyebrow="Customer portal"
      title="Welcome back"
      description="Sign in to view your sessions, projects, and studio deliveries."
      footer={<>New to Kahel Studio? <Link className={styles.textLink} href="/sign-up">Create an account</Link></>}
    >
      <SignInForm />
    </AuthShell>
  );
}
