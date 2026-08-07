import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const metadata: Metadata = {
  title: "Health & Safety | Kahel Studio",
  description: "Health, hygiene, and guest safety practices at Kahel Studio.",
  alternates: { canonical: "/health-safety" },
  openGraph: {
    title: "Health & Safety | Kahel Studio",
    description: "Health, hygiene, and guest safety practices at Kahel Studio.",
    url: "/health-safety",
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
    title: "Health & Safety | Kahel Studio",
    description: "Health, hygiene, and guest safety practices at Kahel Studio.",
    images: ["/Solo_Liza Burzon Bino_9A.jpg"],
  },
};

export default function HealthSafetyPage() {
  return <MarketingSite initialPage="health-safety" />;
}
