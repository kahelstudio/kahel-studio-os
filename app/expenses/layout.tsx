import { AppShell } from "@/components/shell/app-shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell appId="expenses">{children}</AppShell>;
}
