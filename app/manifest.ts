import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kahel Studio",
    short_name: "Kahel Studio",
    description: "Photography studio in Tabaco City, Albay, Philippines.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FF5300",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/kahelstudio-logo_b.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
