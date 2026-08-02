import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const metadata: Metadata = {
  title: "Privacy Policy | Kahel Studio",
  description: "How Kahel Studio collects, uses, and protects personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <MarketingSite initialPage="privacy" />;
}
