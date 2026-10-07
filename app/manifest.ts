import type { MetadataRoute } from "next";
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
  };
}
