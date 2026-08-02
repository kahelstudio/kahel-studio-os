import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

// Avoid retaining a stale prerender shell across Cloudflare Worker deployments.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kahel Studio | Creating Visual Experiences",
  description: "Timeless portraits, studio sessions, and event photography by Kahel Studio in Tabaco City, Albay.",
  metadataBase: new URL("https://kahel.studio"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kahel Studio | Creating Visual Experiences",
    description: "Creating timeless photographs in Tabaco City, Albay.",
    url: "/",
    siteName: "Kahel Studio",
    images: [{ url: "/Solo_Liza Burzon Bino_9A.jpg", alt: "Portrait by Kahel Studio" }],
    locale: "en_PH",
    type: "website",
  },
};

export default function HomePage() {
  return <MarketingSite />;
}
