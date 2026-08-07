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

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/os/",
    },
    sitemap: "https://kahelstudio.com/sitemap.xml",
  };
}
