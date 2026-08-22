import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Work | Kahel Studio",
  description:
    "Explore portraits, events, debut, christening, family, and commercial photography by Kahel Studio in Tabaco City, Albay.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work | Kahel Studio",
    description: "Photography portfolio — portraits, events, debut, christening, family, and commercial work across Bicol and Luzon.",
    url: "/work",
    siteName: "Kahel Studio",
    images: [{ url: "/Solo_Liza%20Burzon%20Bino_9A.jpg", alt: "Kahel Studio portfolio", width: 1200, height: 630 }],
    locale: "en_PH",
    type: "website",
  },
};

export default function WorkPage() {
  return <MarketingSite initialPage="portfolio" />;
}
