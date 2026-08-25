import type { Metadata } from "next";
import { MarketingSite } from "@/components/marketing/marketing-site";

export const metadata: Metadata = {
  title: "Book a Photography Session | Kahel Studio",
  description: "Reserve a studio portrait or event photography session with Kahel Studio in Tabaco City, Albay.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return <MarketingSite initialPage="book" />;
}
