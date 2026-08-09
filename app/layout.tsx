import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { ToastProvider } from "@/components/toast/toast-provider";
import JsonLd from "@/components/seo/json-ld";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function generateMetadata(): Metadata {
  const isProduction = String(process.env.APP_ENV) === "production";
  return {
    title: "Kahel Studio | Creating Visual Experiences",
    description: "Photography studio in Tabaco City, Albay.",
    metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? "https://kahelstudio.com"),
    robots: isProduction ? undefined : { index: false, follow: false },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <JsonLd />
      </head>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
