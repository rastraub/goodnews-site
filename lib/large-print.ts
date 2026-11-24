/**
 * Large-print daily sheet for senior centers, libraries, and caregivers.
 *
 * A date uses the same pick as Today's Top 5 (`getTop5`) on that day's
 * published stories: ranked stories first, then the day's existing order,
 * five at most. Stories that fail the classroom read-aloud check or the
 * news-break heavy-news check stay off the sheet. Those checks are the
 * kid-safe, no-politics, and no-violence filters already used on the site.
 * The words on the sheet are the headline, dek, place, and source already
 * stored on the story.
 */
import { isSuitableAnnouncementStory, type AnnouncementCandidate } from "./morning-announcements";
import { isHeavyNews, type NewsBreakStory } from "./news-break";
import { countryName } from "./countries";
import { placeLabel } from "./present";
import { compareStories, getPublishedStories, type Story } from "./stories";
import { stateName } from "./states";
import { formatLongDate, mountainDay, parseIsoDate } from "./weeks";

export const LARGE_PRINT_PATH = "/large-print";
export const LARGE_PRINT_ABOUT_PATH = "/large-print/about";
export const LARGE_PRINT_COUNT = 5;
/** Fewer stories than this is a thin sheet and stays out of the sitemap. */
export const LARGE_PRINT_INDEX_MIN = 3;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type LargePrintCandidate = AnnouncementCandidate & NewsBreakStory;

export type LargePrintEdition = {
  date: string;
  path: string;
  stories: Story[];
  /** Published stories that day, before the safety filter. */
  publishedCount: number;
  indexable: boolean;
};

export function largePrintPath(date: string): string {
  return `${LARGE_PRINT_PATH}/${date}`;
}

export function largePrintEditionTitle(date: string): string {
  return `Large-Print Good News for Seniors, ${formatLongDate(date)}`;
}

export function largePrintDateLabel(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const weekday = WEEKDAYS[new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()];
  return `${weekday}, ${formatLongDate(iso)}`;
}

/** City and state in the U.S. City and country everywhere else. */
export function largePrintPlace(story: Pick<Story, "city" | "state" | "place" | "country">): string {
  if (story.country === "US" && story.city && story.state) {
    const state = stateName(story.state);
    return state ? `${story.city}, ${state}` : story.city;
  }
  if (story.city && story.country && story.country !== "US") {
    const country = countryName(story.country);
    return country ? `${story.city}, ${country}` : story.city;
  }
  return placeLabel(story);
}

export function largePrintBlocked(story: LargePrintCandidate): boolean {
  if (story.draft) return true;
  if (!isSuitableAnnouncementStory(story)) return true;
  return isHeavyNews(story);
}

/**
 * Same order as `getTop5` for this pool.
 * Pass stories already sorted in edition order. The safety filter is `blocked`.
 */
export function selectLargePrintStories<T extends { slug: string; top5?: number; draft?: boolean }>(
  stories: T[],
  blocked: (story: T) => boolean = () => false,
): T[] {
  const eligible = stories.filter((story) => !story.draft && !blocked(story));
  const ranked = eligible.filter((story) => story.top5).sort((a, b) => (a.top5 ?? 99) - (b.top5 ?? 99));
  if (ranked.length >= LARGE_PRINT_COUNT) return ranked.slice(0, LARGE_PRINT_COUNT);
  const used = new Set(ranked.map((story) => story.slug));
  const rest = eligible.filter((story) => !used.has(story.slug));
  return [...ranked, ...rest].slice(0, LARGE_PRINT_COUNT);
}

function toEdition(date: string, day: Story[]): LargePrintEdition {
  const ordered = day.filter((story) => !story.draft).sort(compareStories);
  const stories = selectLargePrintStories(ordered, largePrintBlocked);
  return {
    date,
    path: largePrintPath(date),
    stories,
    publishedCount: ordered.length,
    indexable: stories.length >= LARGE_PRINT_INDEX_MIN,
  };
}

export function listLargePrintEditions(stories = getPublishedStories()): LargePrintEdition[] {
  const byDate = new Map<string, Story[]>();
  for (const story of stories) {
    if (story.draft || !parseIsoDate(story.date)) continue;
    const group = byDate.get(story.date);
    if (group) group.push(story);
    else byDate.set(story.date, [story]);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, day]) => toEdition(date, day));
}

export function largePrintEdition(date: string, stories = getPublishedStories()): LargePrintEdition | undefined {
  if (!parseIsoDate(date)) return undefined;
  return listLargePrintEditions(stories).find((edition) => edition.date === date);
}

/** Today when that morning has stories. Otherwise the latest earlier sheet. */
export function pickFeaturedLargePrint(editions: LargePrintEdition[], today: string): LargePrintEdition | undefined {
  const exact = editions.find((edition) => edition.date === today);
  if (exact) return exact;
  return editions.find((edition) => edition.date < today) ?? editions[0];
}

export function featuredLargePrintEdition(stories = getPublishedStories(), today = mountainDay()): LargePrintEdition | undefined {
  return pickFeaturedLargePrint(listLargePrintEditions(stories), today);
}

export function indexableLargePrintEditions(editions: LargePrintEdition[]): LargePrintEdition[] {
  return editions.filter((edition) => edition.indexable);
}
