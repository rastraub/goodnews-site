import type { MetadataRoute } from "next";
import { faviconPath } from "@/lib/brand";
import { siteConfig } from "@/site.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.logoText,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF4",
    theme_color: "#FFFBF4",
    icons: [
      { src: faviconPath(192), sizes: "192x192", type: "image/png" },
      { src: faviconPath(512), sizes: "512x512", type: "image/png" },
    ],
  };
}
