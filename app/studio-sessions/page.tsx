import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Sessions | Kahel Studio",
  description:
    "Book a studio portrait session in Tabaco City, Albay. Mini, Solo, Duo, Group, Theme, Rush ID, and Branding sessions available. Starting at ₱999.",
  alternates: { canonical: "/studio-sessions" },
  openGraph: {
    title: "Studio Sessions | Kahel Studio",
    description:
      "Professional studio sessions in Tabaco City, Albay — Mini, Solo, Duo, Group, Theme, Rush ID, and Branding. Book your session today.",
    url: "/studio-sessions",
    siteName: "Kahel Studio",
    images: [{ url: "/Solo_Liza%20Burzon%20Bino_9A.jpg", alt: "Studio session by Kahel Studio", width: 1200, height: 630 }],
    locale: "en_PH",
    type: "website",
  },
};

export default function StudioSessionsPage() {
  return <MarketingSite initialPage="services" initialCategory="sessions" />;
}
