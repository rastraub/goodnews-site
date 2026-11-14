import type { MetadataRoute } from "next";
import { SQUARE_LOGO, faviconPath } from "@/lib/brand";
import { siteConfig } from "@/site.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.logoText,
    description: siteConfig.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: siteConfig.theme.background,
    theme_color: siteConfig.theme.color,
    icons: [
      { src: faviconPath(192), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: faviconPath(512), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: SQUARE_LOGO.path, sizes: `${SQUARE_LOGO.width}x${SQUARE_LOGO.height}`, type: "image/png", purpose: "any" },
    ],
  };
}
