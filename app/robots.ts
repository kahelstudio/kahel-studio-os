import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProduction = String(process.env.APP_ENV) === "production";
  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const disallow = [
    "/os/",
    "/os",
    "/login",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/set-password",
    "/auth/",
    "/portal/",
    "/portal",
    "/client-portal/",
    "/api/",
    "/book/confirmation/",
    "/media/",
    "/images/",
  ];

  const publicRules = { allow: "/", disallow };

  return {
    rules: [
      { userAgent: "*", ...publicRules },
      { userAgent: "GPTBot", ...publicRules },
      { userAgent: "ChatGPT-User", ...publicRules },
      { userAgent: "OAI-SearchBot", ...publicRules },
      { userAgent: "ClaudeBot", ...publicRules },
      { userAgent: "anthropic-ai", ...publicRules },
      { userAgent: "PerplexityBot", ...publicRules },
      { userAgent: "Applebot", ...publicRules },
      { userAgent: "Googlebot", ...publicRules },
    ],
    sitemap: "https://kahelstudio.com/sitemap.xml",
  };
}
