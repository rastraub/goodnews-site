/**
 * Weekly roundups. One static page per Monday-start week, once it has enough
 * stories to be worth reading.
 *
 * Story `date` values are the edition dates (the morning job publishes them
 * around 3:00 a.m. Mountain time). Weeks are grouped on that calendar, not by
 * shifting the timestamp through UTC. "This week" is the Mountain Time week
 * that contains build day, so a morning deploy can refresh the open week.
 * A finished week stays as it was. Nothing here renders on request.
 */
import { CATEGORIES, getCategory } from "./categories";
import { countryName } from "./countries";
import { editionYear } from "./format";
import { absoluteUrl, publishedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode } from "./states";
import { siteConfig } from "@/site.config";

/** First publication day. The first roundup is the Monday of this week. */
export const SITE_LAUNCH = "2026-10-07";

/** A thinner week is not a page, so it is not in the sitemap. */
export const MIN_WEEK_STORIES = 10;

/**
 * Every qualifying week is prebuilt through this cap.
 * Past it, validate-stories fails the build instead of rendering the rest
 * on request. One page a week stays under this for decades.
 */
export const MAX_PRERENDERED_WEEKS = 2_000;

/** How many stories lead a week when homepage marks name fewer than that. */
export const STANDOUT_TARGET = 5;

export const MOUNTAIN_TIME_ZONE = "America/Denver";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export type WeekSource = {
  slug: string;
  title: string;
  date: string;
  country: string;
  state?: string;
  alsoStates?: string[];
  category: string;
  featured?: boolean;
  top5?: number;
  worldPick?: boolean;
  cheers?: number;
  kidFriendly?: boolean;
  draft?: boolean;
  image: string;
  imageAlt: string;
};

export type WeekCategoryGroup<T> = {
  slug: string;
  label: string;
  stories: T[];
};

export type WeekStateLink = {
  code: string;
  slug: string;
  name: string;
  count: number;
};

export type WeekRoundup<T extends WeekSource = WeekSource> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  intro: string;
  standoutNote: string;
  stories: T[];
  standouts: T[];
  categories: WeekCategoryGroup<T>[];
  world: T[];
  kids: T[];
  states: WeekStateLink[];
  stateCount: number;
  usPlace: string;
  countryCount: number;
  latest: string;
  image: string;
  imageAlt: string;
};

type DateParts = { y: number; m: number; d: number };

export function parseIsoDate(iso: string): DateParts | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return undefined;
  return { y, m, d };
}

export function addDays(iso: string, days: number): string {
  const parts = parseIsoDate(iso);
  if (!parts) throw new Error(`Bad date ${iso}`);
  const utc = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days));
  return utc.toISOString().slice(0, 10);
}

/** Monday of the calendar week that contains `iso`. Sunday belongs to the Monday before it. */
export function weekStart(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) throw new Error(`Bad date ${iso}`);
  const utc = new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
  const day = utc.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

export function launchWeekStart(): string {
  return weekStart(SITE_LAUNCH);
}

/** Calendar day in Mountain Time, so the open week rolls over with the morning edition. */
export function mountainDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MOUNTAIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatLongDate(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  return `${LONG_MONTHS[parts.m - 1]} ${parts.d}, ${parts.y}`;
}

/** "Oct 19 to 25, 2026", "Oct 26 to Nov 1, 2026", or "Dec 28, 2026 to Jan 3, 2027". */
export function formatWeekRange(start: string, end: string): string {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (!from || !to) return `${start} to ${end}`;
  if (from.y === to.y && from.m === to.m) return `${SHORT_MONTHS[from.m - 1]} ${from.d} to ${to.d}, ${from.y}`;
  if (from.y === to.y) return `${SHORT_MONTHS[from.m - 1]} ${from.d} to ${SHORT_MONTHS[to.m - 1]} ${to.d}, ${from.y}`;
  return `${SHORT_MONTHS[from.m - 1]} ${from.d}, ${from.y} to ${SHORT_MONTHS[to.m - 1]} ${to.d}, ${to.y}`;
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function byEdition<T extends WeekSource>(a: T, b: T): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const aRank = a.top5 ?? 99;
  const bRank = b.top5 ?? 99;
  if (aRank !== bRank) return aRank - bRank;
  return a.title.localeCompare(b.title);
}

function markTier(story: WeekSource): number {
  if (story.featured) return 0;
  if (story.top5) return 1;
  if (story.worldPick) return 2;
  return 3;
}

/**
 * Stories that lead the week.
 * Homepage marks already on the file win: story of the day, then Today's Top 5
 * in rank order, then the world pick. Every marked story is kept, even past
 * five. If the marks name fewer than five, cheered stories fill in, then the newest.
 */
export function selectStandouts<T extends WeekSource>(stories: T[]): T[] {
  const explicit = stories.filter((story) => markTier(story) < 3);
  explicit.sort((a, b) => {
    const tier = markTier(a) - markTier(b);
    if (tier !== 0) return tier;
    if (markTier(a) === 1 && a.top5 !== b.top5) return (a.top5 ?? 99) - (b.top5 ?? 99);
    return byEdition(a, b);
  });
  if (explicit.length >= STANDOUT_TARGET) return explicit;
  const used = new Set(explicit.map((story) => story.slug));
  const rest = stories
    .filter((story) => !used.has(story.slug))
    .sort((a, b) => (b.cheers ?? 0) - (a.cheers ?? 0) || byEdition(a, b));
  return [...explicit, ...rest.slice(0, STANDOUT_TARGET - explicit.length)];
}

export function standoutNote<T extends WeekSource>(standouts: T[]): string {
  const featured = standouts.filter((story) => story.featured);
  const ranked = standouts.filter((story) => !story.featured && story.top5);
  const world = standouts.filter((story) => !story.featured && !story.top5 && story.worldPick);
  const marked = new Set([...featured, ...ranked, ...world].map((story) => story.slug));
  const rest = standouts.filter((story) => !marked.has(story.slug));
  const policy =
    "The story of the day, a Top 5 rank, and the world pick are the homepage marks already stored on a story. When those marks name fewer than five stories in the week, the most-cheered stories fill in, and then the newest.";

  const bits: string[] = [];
  if (featured.length === 1) bits.push("the story of the day");
  else if (featured.length > 1) bits.push(`${countWord(featured.length)} stories marked as the story of the day`);
  if (ranked.length === 1) bits.push("one story from Today's Top 5");
  else if (ranked.length > 1) bits.push(`${countWord(ranked.length)} stories from Today's Top 5`);
  if (world.length === 1) bits.push("the world pick");
  else if (world.length > 1) bits.push(`${countWord(world.length)} world picks`);

  let lead: string;
  if (bits.length) {
    lead = `These lead because this week includes ${listPhrase(bits)}.`;
    if (rest.length) {
      const cheered = rest.filter((story) => (story.cheers ?? 0) > 0).length;
      if (cheered === rest.length) {
        lead +=
          rest.length === 1
            ? " One more story is here because readers cheered it more than the other stories this week."
            : ` ${capitalize(countWord(rest.length))} more stories are here because readers cheered them more than the other stories this week.`;
      } else if (cheered === 0) {
        lead +=
          rest.length === 1
            ? " One of the newest stories still in the week completes the set of five."
            : " The newest stories still in the week complete the set of five.";
      } else {
        lead += " Cheered stories come next, then the newest, to complete the set of five.";
      }
    }
  } else if (rest.some((story) => (story.cheers ?? 0) > 0)) {
    lead = "No homepage mark is still set on a story from this week, so the most-cheered stories lead, and the newest fill the set of five.";
  } else {
    lead = "No homepage mark or cheer count is set on this week, so the newest stories lead.";
  }
  return `${lead} ${policy}`;
}

export function usPlaceSentence(usPlace: string): string {
  if (!usPlace) return "";
  if (usPlace === "Washington, D.C.") return "Washington, D.C. has a story in this roundup.";
  const verb = usPlace === "1 state" ? "has" : "have";
  return `${usPlace.charAt(0).toUpperCase()}${usPlace.slice(1)} ${verb} a story in this roundup.`;
}

/** DC sits in the state list, and the copy should not call it a 51st state. */
export function usPlacePhrase(states: { code: string }[]): string {
  const dc = states.some((state) => state.code === "DC");
  const count = states.length - (dc ? 1 : 0);
  if (count === 50 && dc) return "all 50 states and Washington, D.C.";
  if (count === 50) return "all 50 states";
  const statesLabel = count === 1 ? "1 state" : `${count} states`;
  if (dc && count) return `${statesLabel} and Washington, D.C.`;
  if (dc) return "Washington, D.C.";
  if (count) return statesLabel;
  return "";
}

function wherePhrase(usPlace: string, countryNames: string[]): string {
  const countryCount = countryNames.length;
  const countries = countryCount === 1 ? "1 country" : `${countryCount} countries`;
  const named = countryCount > 0 && countryCount <= 3 ? ` (${listPhrase(countryNames)})` : "";
  if (usPlace && countryCount) {
    const joiner = usPlace.includes(" and ") ? ", and " : " and ";
    return `from ${usPlace}${joiner}${countries}${named}`;
  }
  if (usPlace) return `from ${usPlace}`;
  if (countryCount) return `from ${countries}${named}`;
  return "";
}

function categoryPhrase(top: { label: string; count: number }[]): string {
  const shown = top.slice(0, 3);
  if (!shown.length) return "";
  const [first, second, third] = shown;
  let sentence = `${first.label} led with ${first.count} ${first.count === 1 ? "story" : "stories"}`;
  if (second && third) sentence += `, then ${second.label} with ${second.count} and ${third.label} with ${third.count}`;
  else if (second) sentence += `, then ${second.label} with ${second.count}`;
  return `${sentence}.`;
}

function weekIntro(options: {
  count: number;
  inProgress: boolean;
  usPlace: string;
  countryNames: string[];
  topCategories: { label: string; count: number }[];
}): string {
  const opener = options.inProgress ? "So far this week has" : "This week has";
  const stories = `${options.count} verified ${options.count === 1 ? "story" : "stories"}`;
  const where = wherePhrase(options.usPlace, options.countryNames);
  const categories = categoryPhrase(options.topCategories);
  return `${opener} ${stories}${where ? ` ${where}` : ""}.${categories ? ` ${categories}` : ""}`;
}

function finishWeek<T extends WeekSource>(start: string, group: T[], today: string): WeekRoundup<T> {
  const end = addDays(start, 6);
  const inProgress = start === weekStart(today);
  const stories = group.slice().sort(byEdition);
  const standouts = selectStandouts(stories);
  const rangeLabel = formatWeekRange(start, end);
  const stateCounts = new Map<string, number>();
  const bumpState = (code: string | undefined) => {
    const state = getStateByCode(code);
    if (!state) return;
    stateCounts.set(state.code, (stateCounts.get(state.code) ?? 0) + 1);
  };
  const countryCodes = new Set<string>();
  const categoryCounts = new Map<string, number>();
  for (const story of stories) {
    categoryCounts.set(story.category, (categoryCounts.get(story.category) ?? 0) + 1);
    if (story.country === "US") {
      bumpState(story.state);
      for (const extra of story.alsoStates ?? []) bumpState(extra);
    } else {
      countryCodes.add(story.country);
    }
  }
  const states = [...stateCounts.entries()]
    .flatMap(([code, count]) => {
      const state = getStateByCode(code);
      return state ? [{ code, slug: state.slug, name: state.name, count }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const countryNames = [...countryCodes].map((code) => countryName(code)).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const categoryOrder = new Map<string, number>(CATEGORIES.map((category, index) => [category.slug, index]));
  const topCategories = [...categoryCounts.entries()]
    .flatMap(([slug, count]) => {
      const category = getCategory(slug);
      return category && count ? [{ slug, label: category.label, count }] : [];
    })
    .sort((a, b) => b.count - a.count || (categoryOrder.get(a.slug) ?? 0) - (categoryOrder.get(b.slug) ?? 0));
  const categories = CATEGORIES.flatMap((category) => {
    const inCategory = stories.filter((story) => story.category === category.slug);
    return inCategory.length ? [{ slug: category.slug, label: category.label, stories: inCategory }] : [];
  });
  const photo = standouts[0] ?? stories[0];
  const latest = stories.reduce((max, story) => (story.date > max ? story.date : max), stories[0]?.date ?? start);
  return {
    start,
    end,
    path: `/week/${start}`,
    inProgress,
    rangeLabel,
    title: inProgress ? `This Week in Good News, So Far: ${rangeLabel}` : `This Week in Good News: ${rangeLabel}`,
    heading: inProgress ? `This week in good news, so far: ${rangeLabel}.` : `This week in good news: ${rangeLabel}.`,
    intro: weekIntro({
      count: stories.length,
      inProgress,
      usPlace: usPlacePhrase(states),
      countryNames,
      topCategories,
    }),
    standoutNote: standoutNote(standouts),
    stories,
    standouts,
    categories,
    world: stories.filter((story) => story.country !== "US"),
    kids: stories.filter((story) => story.kidFriendly),
    states,
    stateCount: states.length,
    usPlace: usPlacePhrase(states),
    countryCount: countryNames.length,
    latest,
    image: photo.image,
    imageAlt: photo.imageAlt,
  };
}

/** Published roundups since launch week, oldest first. The open week is included once it has enough stories. */
export function buildWeeks<T extends WeekSource>(stories: T[], today = mountainDay()): WeekRoundup<T>[] {
  const launch = launchWeekStart();
  const current = weekStart(today);
  const buckets = new Map<string, T[]>();
  for (const story of stories) {
    if (story.draft || !parseIsoDate(story.date)) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    const list = buckets.get(start);
    if (list) list.push(story);
    else buckets.set(start, [story]);
  }
  const weeks: WeekRoundup<T>[] = [];
  for (const [start, group] of buckets) {
    if (group.length < MIN_WEEK_STORIES) continue;
    weeks.push(finishWeek(start, group, today));
  }
  weeks.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return weeks;
}

export function storiesInReadingOrder<T extends WeekSource>(week: WeekRoundup<T>): T[] {
  const lead = new Set(week.standouts.map((story) => story.slug));
  return [...week.standouts, ...week.stories.filter((story) => !lead.has(story.slug))];
}

export function completedWeeks<T extends WeekSource>(weeks: WeekRoundup<T>[]): WeekRoundup<T>[] {
  return weeks.filter((week) => !week.inProgress).sort((a, b) => (a.start < b.start ? 1 : -1));
}

let cache: WeekRoundup<Story>[] | null = null;

export function getPublishedWeeks(): WeekRoundup<Story>[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const weeks = buildWeeks(getPublishedStories());
  cache = weeks;
  return weeks;
}

/** Newest weeks win if the archive ever passes the cap. Validation fails before that on a normal build. */
export function weeksToPrerender(weeks = getPublishedWeeks()): WeekRoundup<Story>[] {
  if (weeks.length <= MAX_PRERENDERED_WEEKS) return weeks;
  return weeks.slice().sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, MAX_PRERENDERED_WEEKS).reverse();
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

type WeekFeedItem = Pick<WeekRoundup, "title" | "intro" | "standoutNote" | "path" | "start" | "end" | "image" | "imageAlt" | "inProgress"> & {
  standouts: { slug: string; title: string }[];
};

/** One item per finished week. The open week stays out so a newsletter can follow this feed. */
export function renderWeekRss(weeks: WeekFeedItem[] = getPublishedWeeks()): string {
  const finished = weeks.filter((week) => !week.inProgress).sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0));
  const self = absoluteUrl("/week/rss.xml");
  const channelLink = absoluteUrl("/week");
  const updated = finished[0] ? new Date(publishedIso(addDays(finished[0].end, 1))).toUTCString() : new Date().toUTCString();
  const items = finished
    .map((week) => {
      const link = absoluteUrl(week.path);
      const image = absoluteUrl(week.image);
      const standouts = week.standouts
        .map((story) => `<li><a href="${escapeXml(absoluteUrl(`/story/${story.slug}`))}">${escapeXml(story.title)}</a></li>`)
        .join("");
      const html = `<p>${escapeXml(week.intro)}</p><p>${escapeXml(week.standoutNote)}</p><ul>${standouts}</ul><p><a href="${escapeXml(link)}">Read the full week</a>.</p>`;
      return `<item>
      <title>${escapeXml(week.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(publishedIso(addDays(week.end, 1))).toUTCString()}</pubDate>
      <description>${escapeXml(week.intro)}</description>
      <content:encoded>${cdata(html)}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      <media:content url="${escapeXml(image)}" medium="image" type="image/webp">
        <media:title>${escapeXml(week.title)}</media:title>
        <media:description>${escapeXml(week.imageAlt)}</media:description>
      </media:content>
      <enclosure url="${escapeXml(image)}" type="image/webp" />
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`${siteConfig.name}: This Week in Good News`)}</title>
    <link>${channelLink}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml("One item for each finished week of verified good news. The current week is left out until Sunday is over.")}</description>
    <language>en-us</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <copyright>© ${editionYear()} ${escapeXml(siteConfig.name)}</copyright>
    <managingEditor>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</managingEditor>
    <webMaster>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</webMaster>
    ${items}
  </channel>
</rss>`;
}
