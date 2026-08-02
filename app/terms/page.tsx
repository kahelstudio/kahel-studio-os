import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const metadata: Metadata = {
  title: "Terms of Service | Kahel Studio",
  description: "Terms governing use of the Kahel Studio website.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <MarketingSite initialPage="terms" />;
}
