import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { kidPlaces } from "@/lib/kids";
import { getHubIndex } from "@/lib/hubs";
import { absoluteUrl } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { STATES } from "@/lib/states";
import { getVeteransDayHub, VETERANS_DAY_PATH } from "@/lib/veterans-day";
import { weeksToPrerender } from "@/lib/weeks";

const STATIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/local", changeFrequency: "daily", priority: 0.8 },
  { path: "/kids", changeFrequency: "daily", priority: 0.6 },
  { path: "/kids/print", changeFrequency: "daily", priority: 0.5 },
  { path: "/topics", changeFrequency: "daily", priority: 0.6 },
  { path: "/stories", changeFrequency: "daily", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/editorial-standards", changeFrequency: "monthly", priority: 0.6 },
  { path: "/corrections", changeFrequency: "weekly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/submit", changeFrequency: "yearly", priority: 0.4 },
  { path: "/subscribe", changeFrequency: "yearly", priority: 0.4 },
  { path: "/help", changeFrequency: "weekly", priority: 0.4 },
  { path: "/feeds", changeFrequency: "monthly", priority: 0.4 },
  { path: "/membership", changeFrequency: "yearly", priority: 0.3 },
  { path: "/partner", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

function bump(map: Map<string, string>, key: string | undefined, date: string) {
  if (!key) return;
  const current = map.get(key);
  if (!current || date > current) map.set(key, date);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const stories = getPublishedStories();
  const hubs = getHubIndex();
  const latestState = new Map<string, string>();
  const latestCategory = new Map<string, string>();
  let siteLatest: string | undefined;
  let worldLatest: string | undefined;

  for (const story of stories) {
    if (!siteLatest || story.date > siteLatest) siteLatest = story.date;
    bump(latestCategory, story.category, story.date);
    if (story.country !== "US") {
      if (!worldLatest || story.date > worldLatest) worldLatest = story.date;
    }
    if (story.country === "US" && story.state) {
      bump(latestState, story.state, story.date);
      for (const extra of story.alsoStates) bump(latestState, extra, story.date);
    }
  }

  const weeks = weeksToPrerender();
  const newestWeek = weeks[weeks.length - 1];
  const veterans = getVeteransDayHub();

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: siteLatest,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    {
      url: absoluteUrl(VETERANS_DAY_PATH),
      lastModified: veterans.latest ?? siteLatest,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: absoluteUrl("/world"),
      ...(worldLatest ? { lastModified: worldLatest } : {}),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: absoluteUrl("/week"),
      lastModified: newestWeek?.latest ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...weeks
      .slice()
      .reverse()
      .map((week) => ({
        url: absoluteUrl(week.path),
        lastModified: week.latest,
        changeFrequency: (week.inProgress ? "daily" : "weekly") as "daily" | "weekly",
        priority: week.inProgress ? 0.7 : 0.6,
      })),
    ...CATEGORIES.map((category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: latestCategory.get(category.slug) ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...STATES.map((state) => ({
      url: absoluteUrl(`/state/${state.slug}`),
      lastModified: latestState.get(state.code) ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...hubs.countries.filter((country) => country.indexable).map((country) => ({
      url: absoluteUrl(`/country/${country.slug}`),
      lastModified: country.latest,
      changeFrequency: "daily" as const,
      priority: country.code === "US" ? 0.7 : 0.6,
    })),
    ...kidPlaces().map((place) => ({
      url: absoluteUrl(place.path),
      lastModified: place.latest,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...[...hubs.stateCategories, ...hubs.cities, ...hubs.topics].map((hub) => ({
      url: absoluteUrl(hub.path),
      lastModified: hub.latest,
      changeFrequency: "daily" as const,
      priority: 0.6,
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
