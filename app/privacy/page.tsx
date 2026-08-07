import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const metadata: Metadata = {
  title: "Privacy Policy | Kahel Studio",
  description: "How Kahel Studio collects, uses, and protects personal data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Kahel Studio",
    description: "How Kahel Studio collects, uses, and protects personal data.",
    url: "/privacy",
    siteName: "Kahel Studio",
    images: [
      {
        url: "/Solo_Liza Burzon Bino_9A.jpg",
        alt: "Portrait by Kahel Studio",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Kahel Studio",
    description: "How Kahel Studio collects, uses, and protects personal data.",
    images: ["/Solo_Liza Burzon Bino_9A.jpg"],
  },
};

export default function PrivacyPage() {
  return <MarketingSite initialPage="privacy" />;
}
