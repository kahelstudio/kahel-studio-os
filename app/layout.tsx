import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { ToastProvider } from "@/components/toast/toast-provider";
import JsonLd from "@/components/seo/json-ld";
import { SwRegister } from "@/components/pwa/sw-register";
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
    title: {
      template: "%s | Kahel Studio",
      default: "Kahel Studio | Creating Visual Experiences",
    },
    description:
      "Professional photography studio in Tabaco City, Albay, Philippines. Portrait sessions, debut, christening, birthday, and event photography across Bicol and Luzon.",
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
        <SwRegister />
      </body>
    </html>
  );
}
