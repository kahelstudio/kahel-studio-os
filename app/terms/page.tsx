import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const metadata: Metadata = {
  title: "Terms of Service | Kahel Studio",
  description: "Terms governing use of the Kahel Studio website.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Kahel Studio",
    description: "Terms governing use of the Kahel Studio website.",
    url: "/terms",
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
    title: "Terms of Service | Kahel Studio",
    description: "Terms governing use of the Kahel Studio website.",
    images: ["/Solo_Liza Burzon Bino_9A.jpg"],
  },
};

export default function TermsPage() {
  return <MarketingSite initialPage="terms" />;
}
