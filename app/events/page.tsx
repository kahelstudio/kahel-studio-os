import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Photography | Kahel Studio",
  description:
    "Professional event photography in Tabaco City and across Luzon — Debut, Christening, Birthday, Family Celebrations, and Corporate Events by Kahel Studio.",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Event Photography | Kahel Studio",
    description:
      "Debut, christening, birthday, and celebration photography across Bicol and Luzon by Kahel Studio, based in Tabaco City, Albay.",
    url: "/events",
    siteName: "Kahel Studio",
    images: [{ url: "/Event_Takashi%20Zhander_176.jpg", alt: "Event photography by Kahel Studio", width: 1200, height: 630 }],
    locale: "en_PH",
    type: "website",
  },
};

export default function EventsPage() {
  return <MarketingSite initialPage="services" initialCategory="events" />;
}
