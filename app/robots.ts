import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProduction = String(process.env.APP_ENV) === "production";
  if (!isProduction) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const publicRules = { allow: "/", disallow: ["/os/"] };

  return {
    rules: [
      { userAgent: "*", ...publicRules },
      // AI search crawlers — explicit allow so tightening the wildcard never accidentally blocks them
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
