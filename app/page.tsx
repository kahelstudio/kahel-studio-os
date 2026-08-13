import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

// Avoid retaining a stale prerender shell across Cloudflare Worker deployments.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kahel Studio | Photography Studio in Tabaco City, Albay",
  description:
    "Book studio portrait sessions, debut, christening, birthday, and event photography with Kahel Studio in Tabaco City, Albay. Serving Bicol and all of Luzon.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kahel Studio | Photography Studio in Tabaco City, Albay",
    description:
      "Professional photography studio in Tabaco City, Albay — portraits, debut, christening, and event coverage across Bicol and Luzon.",
    url: "/",
    siteName: "Kahel Studio",
    images: [
      {
        url: "/Solo_Liza%20Burzon%20Bino_9A.jpg",
        alt: "Portrait photography by Kahel Studio, Tabaco City, Albay",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kahel Studio | Photography Studio in Tabaco City, Albay",
    description:
      "Professional photography studio in Tabaco City, Albay — portraits, debut, christening, and event coverage across Bicol and Luzon.",
    images: ["/Solo_Liza%20Burzon%20Bino_9A.jpg"],
  },
};

export default function HomePage() {
  return <MarketingSite />;
}
