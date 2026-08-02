import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const metadata: Metadata = {
  title: "Health & Safety | Kahel Studio",
  description: "Health, hygiene, and guest safety practices at Kahel Studio.",
  alternates: { canonical: "/health-safety" },
};

export default function HealthSafetyPage() {
  return <MarketingSite initialPage="health-safety" />;
}
