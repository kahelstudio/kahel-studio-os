import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Kahel Studio OS | Creating Visual Experiences" },
  description: "Internal operations platform for Kahel Studio.",
  robots: { index: false, follow: false },
};

export default function OsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
