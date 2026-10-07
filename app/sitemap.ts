import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { getPublishedStories } from "@/lib/stories";
import { STATES } from "@/lib/states";
import { siteConfig } from "@/site.config";

export default function sitemap(): MetadataRoute.Sitemap {
  const stories = getPublishedStories();
  const latest = stories[0]?.date;
  const staticPaths = ["", "/local", "/stories", "/about", "/submit", "/subscribe", "/search", "/help", "/membership", "/corrections", "/privacy", "/terms", "/contact", "/partner"];
  return [
    ...staticPaths.map((path) => ({
      url: `${siteConfig.url}${path || "/"}`,
      lastModified: latest,
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.6,
    })),
    ...CATEGORIES.map((category) => ({
      url: `${siteConfig.url}/category/${category.slug}`,
      lastModified: latest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...STATES.map((state) => ({
      url: `${siteConfig.url}/state/${state.slug}`,
      lastModified: latest,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...stories.map((story) => ({
      url: `${siteConfig.url}/story/${story.slug}`,
      lastModified: story.date,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
