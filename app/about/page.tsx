import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About | Kahel Studio",
  description:
    "Kahel Studio is a photography studio in Cobo, Tabaco City, Albay — creating visual experiences for portraits, events, and commercial work across Bicol and Luzon.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About | Kahel Studio",
    description: "Learn about Kahel Studio — our approach to photography, our team, and our studio in Cobo, Tabaco City, Albay.",
    url: "/about",
    siteName: "Kahel Studio",
    images: [{ url: "/Solo_Liza%20Burzon%20Bino_9A.jpg", alt: "Kahel Studio", width: 1200, height: 630 }],
    locale: "en_PH",
    type: "website",
  },
};

export default function AboutPage() {
  return <MarketingSite initialPage="about" />;
}
