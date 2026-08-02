import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/customer-auth/auth-shell";
import { SetPasswordForm } from "@/components/customer-auth/auth-forms";
import styles from "@/components/customer-auth/customer-auth.module.css";
import { getCustomerIdentity } from "@/lib/server/customer-auth";

export const metadata: Metadata = { title: "Set password | Kahel Studio" };

export default async function SetPasswordPage() {
  const customer = await getCustomerIdentity();
  return (
    <AuthShell
      eyebrow="Account security"
      title="Choose a new password"
      description="Use a strong password you don't use for another account."
      footer={<Link className={styles.textLink} href="/forgot-password">Request a new link</Link>}
    >
      <SetPasswordForm enabled={Boolean(customer)} />
    </AuthShell>
  );
}
