import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { absoluteUrl } from "@/lib/seo";
import { getByCategory, getByState, getPublishedStories } from "@/lib/stories";
import { STATES } from "@/lib/states";

const STATIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/local", changeFrequency: "daily", priority: 0.8 },
  { path: "/stories", changeFrequency: "daily", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/editorial-standards", changeFrequency: "monthly", priority: 0.6 },
  { path: "/corrections", changeFrequency: "weekly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/submit", changeFrequency: "yearly", priority: 0.4 },
  { path: "/subscribe", changeFrequency: "yearly", priority: 0.4 },
  { path: "/help", changeFrequency: "weekly", priority: 0.4 },
  { path: "/membership", changeFrequency: "yearly", priority: 0.3 },
  { path: "/partner", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

function latestDate(dates: string[]): string | undefined {
  return dates.reduce<string | undefined>((latest, date) => (!latest || date > latest ? date : latest), undefined);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const stories = getPublishedStories();
  const siteLatest = latestDate(stories.map((story) => story.date));

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: siteLatest,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...CATEGORIES.map((category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: latestDate(getByCategory(category.slug).map((story) => story.date)) ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...STATES.map((state) => ({
      url: absoluteUrl(`/state/${state.slug}`),
      lastModified: latestDate(getByState(state.code).map((story) => story.date)) ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...stories.map((story) => ({
      url: absoluteUrl(`/story/${story.slug}`),
      lastModified: story.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [absoluteUrl(story.image)],
    })),
  ];
}
