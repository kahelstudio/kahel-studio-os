import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

// Avoid retaining a stale prerender shell across Cloudflare Worker deployments.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kahel Studio | Creating Visual Experiences",
  description: "Timeless portraits, studio sessions, and event photography by Kahel Studio in Tabaco City, Albay.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kahel Studio | Creating Visual Experiences",
    description: "Creating timeless photographs in Tabaco City, Albay.",
    url: "/",
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
    title: "Kahel Studio | Creating Visual Experiences",
    description: "Creating timeless photographs in Tabaco City, Albay.",
    images: ["/Solo_Liza Burzon Bino_9A.jpg"],
  },
};

export default function HomePage() {
  return <MarketingSite />;
}
