/**
 * Monthly Good News Index. One static page per calendar month that has
 * published stories, starting with October 2026.
 *
 * Story `date` values are edition dates. Months are grouped on that calendar.
 * The open month is the Mountain Time month that contains build day, so a
 * morning deploy can refresh the month-to-date edition. A finished month stays
 * as it was. Nothing here renders on request.
 *
 * The index counts stories this site published. It is not a measure of how
 * good, kind, or safe a state or country is.
 */
import { CATEGORIES } from "./categories";
import { getCountry } from "./countries";
import { absoluteUrl, publishedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode, STATES } from "./states";
import { getTag } from "./tags";
import { selectStandouts, formatLongDate, mountainDay, parseIsoDate, usPlacePhrase, type WeekSource } from "./weeks";
import { POPULATION_CITATION, POPULATION_TABLE, POPULATION_URL, populationOf } from "./population";
import { siteConfig } from "@/site.config";

/** First featured edition. Earlier story dates stay in the archive and are not an edition. */
export const FIRST_INDEX_MONTH = "2026-10";

/**
 * Every qualifying month is prebuilt through this cap.
 * Past it, validate-stories fails the build instead of rendering the rest
 * on request. One page a month stays under this for decades.
 */
export const MAX_PRERENDERED_INDEXES = 600;

/** Donate, volunteer, and thank links. Learn-more links are a different count. */
export const HELP_SUPPORT_KINDS = ["donate", "volunteer", "thank"] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type IndexHelpLink = { label: string; url: string; kind: string };

export type IndexStory = WeekSource & {
  tags: string[];
  howToHelp: IndexHelpLink[];
  alsoStates: string[];
};

export type IndexStateRow = {
  code: string;
  slug: string;
  name: string;
  stories: number;
  rank?: number;
  tied: boolean;
  rankLabel: string;
  population: number;
  perMillion: number;
  perMillionLabel: string;
  perMillionRank?: number;
  perMillionTied: boolean;
  perMillionRankLabel: string;
  kidStories: number;
  helpLinks: number;
  helpRank?: number;
  helpTied: boolean;
  helpRankLabel: string;
};

export type IndexCountRow = {
  slug: string;
  label: string;
  count: number;
  rank?: number;
  tied: boolean;
  rankLabel: string;
};

export type IndexCountryRow = IndexCountRow & {
  code: string;
  kidStories: number;
};

export type GoodNewsIndex<T extends IndexStory = IndexStory> = {
  month: string;
  start: string;
  end: string;
  latest: string;
  asOf: string;
  inProgress: boolean;
  label: string;
  title: string;
  heading: string;
  description: string;
  updatedLabel: string;
  path: string;
  csvPath: string;
  citation: string;
  storyCount: number;
  usCount: number;
  worldCount: number;
  kidCount: number;
  kidUsCount: number;
  kidWorldCount: number;
  statesWithStories: number;
  usPlace: string;
  countryCount: number;
  helpLinkCount: number;
  states: IndexStateRow[];
  categories: IndexCountRow[];
  topics: IndexCountRow[];
  countries: IndexCountryRow[];
  standouts: T[];
  standoutNote: string;
  stories: T[];
  image: string;
  imageAlt: string;
};

type Scored = { key: string; score: number };

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatMonthLabel(month: string): string {
  const parts = parseIsoDate(`${month}-01`);
  if (!parts) return month;
  return `${MONTHS[parts.m - 1]} ${parts.y}`;
}

export function monthEnd(month: string): string {
  const parts = parseIsoDate(`${month}-01`);
  if (!parts) throw new Error(`Bad month ${month}`);
  const utc = new Date(Date.UTC(parts.y, parts.m, 0));
  return utc.toISOString().slice(0, 10);
}

export function isSupportKind(kind: string): boolean {
  return (HELP_SUPPORT_KINDS as readonly string[]).includes(kind);
}

/** Host plus path. A leading www and the query string do not make a second organization. */
export function helpUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function storiesPerMillion(count: number, population: number): number {
  if (count <= 0 || population <= 0) return 0;
  return (count / population) * 1_000_000;
}

export function formatPerMillion(value: number, count: number): string {
  if (count <= 0) return "0.00";
  const rounded = value.toFixed(2);
  if (rounded === "0.00") return "< 0.01";
  return rounded;
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function placeLabel(rank: number | undefined, tied: boolean): string {
  if (!rank) return "—";
  const word = ordinal(rank);
  return tied ? `tied for ${word}` : word;
}

function competitionRank(items: Scored[]): Map<string, number> {
  const positive = items.filter((item) => item.score > 0);
  positive.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const ranks = new Map<string, number>();
  let last = Number.NaN;
  let rank = 0;
  positive.forEach((item, index) => {
    if (item.score !== last) {
      rank = index + 1;
      last = item.score;
    }
    ranks.set(item.key, rank);
  });
  return ranks;
}

function tiedKeys(ranks: Map<string, number>): Set<string> {
  const counts = new Map<number, number>();
  for (const rank of ranks.values()) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const tied = new Set<string>();
  for (const [key, rank] of ranks) {
    if ((counts.get(rank) ?? 0) > 1) tied.add(key);
  }
  return tied;
}

function stateCodes(story: IndexStory): string[] {
  if (story.country !== "US") return [];
  const codes = new Set<string>();
  if (story.state) codes.add(story.state);
  for (const extra of story.alsoStates) codes.add(extra);
  return [...codes];
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function describeStandouts(standouts: IndexStory[]): string {
  const featured = standouts.filter((story) => story.featured).length;
  const ranked = standouts.filter((story) => !story.featured && story.top5).length;
  const world = standouts.filter((story) => !story.featured && !story.top5 && story.worldPick).length;
  const rest = standouts.length - featured - ranked - world;
  const parts: string[] = [];
  if (featured === 1) parts.push("the story of the day");
  else if (featured > 1) parts.push(`${featured} stories marked as the story of the day`);
  if (ranked === 1) parts.push("one Top 5 story");
  else if (ranked > 1) parts.push(`${ranked} Top 5 stories`);
  if (world === 1) parts.push("the world pick");
  else if (world > 1) parts.push(`${world} world picks`);

  let lead = parts.length
    ? `These lead because this edition still has ${listPhrase(parts)} on the story file.`
    : "No homepage mark is still set on a story from this edition, so the most-cheered stories lead, and the newest fill the list.";
  if (parts.length && rest === 1) {
    lead += " One more story fills the list from the most-cheered stories in the edition, then the newest.";
  } else if (parts.length && rest > 1) {
    lead += ` ${rest} more stories fill the list from the most-cheered stories in the edition, then the newest.`;
  }
  lead += " Homepage marks move when a newer story replaces them. A closed month can be led by cheered stories for that reason.";
  return lead;
}

function coverageSentence(options: {
  usCount: number;
  usPlace: string;
  worldCount: number;
  countryCount: number;
}): string {
  const us =
    options.usCount === 0
      ? "None are from the United States."
      : options.usCount === 1
        ? `1 is from the United States${options.usPlace ? `, in ${options.usPlace}` : ""}.`
        : `${options.usCount} are from the United States${options.usPlace ? `, in ${options.usPlace}` : ""}.`;
  const world =
    options.worldCount === 0
      ? "None are from outside the United States."
      : options.worldCount === 1
        ? `1 is from outside the United States${options.countryCount === 1 ? ", in 1 country" : ""}.`
        : `${options.worldCount} are from outside the United States, in ${options.countryCount} ${options.countryCount === 1 ? "country" : "countries"}.`;
  return `${us} ${world}`;
}

function updatedLabel(inProgress: boolean, latest: string, asOf: string): string {
  const through = formatLongDate(latest);
  const prefix = inProgress ? "Month to date. " : "Closed edition. ";
  const compiled = asOf === latest ? "" : ` Compiled ${formatLongDate(asOf)}.`;
  return `${prefix}Updated through ${through}, the newest story date in this edition.${compiled}`;
}

export function indexCitation(edition: Pick<GoodNewsIndex, "label" | "inProgress" | "latest" | "path">): string {
  const status = edition.inProgress ? ", month to date" : "";
  return `${siteConfig.editor.name}. "Good News Index: ${edition.label}${status}." ${siteConfig.name}, updated ${formatLongDate(edition.latest)}. ${absoluteUrl(edition.path)}.`;
}

function countRows(entries: { slug: string; label: string; count: number }[]): IndexCountRow[] {
  const ranks = competitionRank(entries.map((entry) => ({ key: entry.slug, score: entry.count })));
  const tied = tiedKeys(ranks);
  return entries
    .map((entry) => {
      const rank = ranks.get(entry.slug);
      return {
        ...entry,
        rank,
        tied: tied.has(entry.slug),
        rankLabel: placeLabel(rank, tied.has(entry.slug)),
      };
    })
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
}

function finishMonth<T extends IndexStory>(month: string, group: T[], today: string): GoodNewsIndex<T> {
  const start = `${month}-01`;
  const end = monthEnd(month);
  const inProgress = month === monthKey(today);
  const stories = group.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
  const latest = stories.reduce((max, story) => (story.date > max ? story.date : max), stories[0]?.date ?? start);
  const label = formatMonthLabel(month);
  const usStories = stories.filter((story) => story.country === "US");
  const worldStories = stories.filter((story) => story.country !== "US");
  const kids = stories.filter((story) => story.kidFriendly);

  const storyCounts = new Map<string, number>();
  const kidCounts = new Map<string, number>();
  const helpSets = new Map<string, Set<string>>();
  const nationalHelp = new Set<string>();
  for (const code of STATES.map((state) => state.code)) {
    storyCounts.set(code, 0);
    kidCounts.set(code, 0);
    helpSets.set(code, new Set());
  }

  for (const story of stories) {
    for (const link of story.howToHelp) {
      if (isSupportKind(link.kind)) nationalHelp.add(helpUrlKey(link.url));
    }
    for (const code of stateCodes(story)) {
      if (!storyCounts.has(code)) continue;
      storyCounts.set(code, (storyCounts.get(code) ?? 0) + 1);
      if (story.kidFriendly) kidCounts.set(code, (kidCounts.get(code) ?? 0) + 1);
      const bucket = helpSets.get(code);
      if (!bucket) continue;
      for (const link of story.howToHelp) {
        if (isSupportKind(link.kind)) bucket.add(helpUrlKey(link.url));
      }
    }
  }

  const base = STATES.map((state) => {
    const population = populationOf(state.code);
    if (!population) throw new Error(`No Census population for ${state.code}. Add it to lib/population.ts before publishing an index.`);
    const count = storyCounts.get(state.code) ?? 0;
    return {
      code: state.code,
      slug: state.slug,
      name: state.name,
      stories: count,
      population,
      perMillion: storiesPerMillion(count, population),
      kidStories: kidCounts.get(state.code) ?? 0,
      helpLinks: helpSets.get(state.code)?.size ?? 0,
    };
  });

  const storyRanks = competitionRank(base.map((state) => ({ key: state.code, score: state.stories })));
  const rateRanks = competitionRank(base.map((state) => ({ key: state.code, score: state.perMillion })));
  const helpRanks = competitionRank(base.map((state) => ({ key: state.code, score: state.helpLinks })));
  const storyTies = tiedKeys(storyRanks);
  const rateTies = tiedKeys(rateRanks);
  const helpTies = tiedKeys(helpRanks);

  const states: IndexStateRow[] = base
    .map((state) => {
      const rank = storyRanks.get(state.code);
      const perMillionRank = rateRanks.get(state.code);
      const helpRank = helpRanks.get(state.code);
      return {
        ...state,
        rank,
        tied: storyTies.has(state.code),
        rankLabel: placeLabel(rank, storyTies.has(state.code)),
        perMillionLabel: formatPerMillion(state.perMillion, state.stories),
        perMillionRank,
        perMillionTied: rateTies.has(state.code),
        perMillionRankLabel: placeLabel(perMillionRank, rateTies.has(state.code)),
        helpRank,
        helpTied: helpTies.has(state.code),
        helpRankLabel: placeLabel(helpRank, helpTies.has(state.code)),
      };
    })
    .sort((a, b) => b.stories - a.stories || b.perMillion - a.perMillion || a.name.localeCompare(b.name));

  const withStories = states.filter((state) => state.stories > 0);
  const categoryCounts = new Map<string, number>(CATEGORIES.map((category) => [category.slug, 0]));
  const topicCounts = new Map<string, number>();
  for (const story of stories) {
    categoryCounts.set(story.category, (categoryCounts.get(story.category) ?? 0) + 1);
    for (const tag of story.tags) {
      if (!getTag(tag)) continue;
      topicCounts.set(tag, (topicCounts.get(tag) ?? 0) + 1);
    }
  }
  const categories = countRows(
    CATEGORIES.map((category) => ({
      slug: category.slug,
      label: category.label,
      count: categoryCounts.get(category.slug) ?? 0,
    })),
  );
  const topics = countRows(
    [...topicCounts.entries()].flatMap(([slug, count]) => {
      const tag = getTag(slug);
      return tag && count ? [{ slug, label: tag.label, count }] : [];
    }),
  );
  const countryCounts = new Map<string, { count: number; kids: number }>();
  for (const story of worldStories) {
    const current = countryCounts.get(story.country) ?? { count: 0, kids: 0 };
    current.count += 1;
    if (story.kidFriendly) current.kids += 1;
    countryCounts.set(story.country, current);
  }
  const countryBase = [...countryCounts.entries()].flatMap(([code, value]) => {
    const country = getCountry(code);
    return country ? [{ code, slug: country.slug, label: country.name, count: value.count, kidStories: value.kids }] : [];
  });
  const countryRanks = competitionRank(countryBase.map((country) => ({ key: country.code, score: country.count })));
  const countryTies = tiedKeys(countryRanks);
  const countries: IndexCountryRow[] = countryBase
    .map((country) => {
      const rank = countryRanks.get(country.code);
      return {
        ...country,
        rank,
        tied: countryTies.has(country.code),
        rankLabel: placeLabel(rank, countryTies.has(country.code)),
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const standouts = selectStandouts(stories);
  const photo = standouts[0] ?? stories[0];
  const usPlace = usPlacePhrase(withStories);
  const path = `/good-news-index/${month}`;
  const title = inProgress ? `Good News Index: ${label}, month to date` : `Good News Index: ${label}`;
  const storyWord = stories.length === 1 ? "story" : "stories";
  const opener = inProgress
    ? `${label}, month to date through ${formatLongDate(latest)}, has`
    : `${label} has`;
  const description = `${opener} ${stories.length} verified ${storyWord}. ${coverageSentence({
    usCount: usStories.length,
    usPlace,
    worldCount: worldStories.length,
    countryCount: countries.length,
  })} This index counts stories ${siteConfig.name} published. It is not a measure of how good a state is.`;

  return {
    month,
    start,
    end,
    latest,
    asOf: today,
    inProgress,
    label,
    title,
    heading: `${title}.`,
    description,
    updatedLabel: updatedLabel(inProgress, latest, today),
    path,
    csvPath: `${path}/index.csv`,
    citation: "",
    storyCount: stories.length,
    usCount: usStories.length,
    worldCount: worldStories.length,
    kidCount: kids.length,
    kidUsCount: kids.filter((story) => story.country === "US").length,
    kidWorldCount: kids.filter((story) => story.country !== "US").length,
    statesWithStories: withStories.length,
    usPlace,
    countryCount: countries.length,
    helpLinkCount: nationalHelp.size,
    states,
    categories,
    topics,
    countries,
    standouts,
    standoutNote: describeStandouts(standouts),
    stories,
    image: photo?.image ?? "",
    imageAlt: photo?.imageAlt ?? "",
  };
}

function withCitation<T extends IndexStory>(edition: GoodNewsIndex<T>): GoodNewsIndex<T> {
  return { ...edition, citation: indexCitation(edition) };
}

/** Published editions since October 2026, oldest first. The open month is included once it has a story. */
export function buildIndexes<T extends IndexStory>(stories: T[], today = mountainDay()): GoodNewsIndex<T>[] {
  const current = monthKey(today);
  const buckets = new Map<string, T[]>();
  for (const story of stories) {
    if (story.draft || !parseIsoDate(story.date)) continue;
    if (story.date > today) continue;
    const month = monthKey(story.date);
    if (month < FIRST_INDEX_MONTH || month > current) continue;
    const list = buckets.get(month);
    if (list) list.push(story);
    else buckets.set(month, [story]);
  }
  const indexes = [...buckets.entries()]
    .filter(([, group]) => group.length > 0)
    .map(([month, group]) => withCitation(finishMonth(month, group, today)));
  indexes.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  return indexes;
}

let cache: GoodNewsIndex<Story>[] | null = null;

export function getPublishedIndexes(): GoodNewsIndex<Story>[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const indexes = buildIndexes(getPublishedStories());
  cache = indexes;
  return indexes;
}

/** Newest months win if the archive ever passes the cap. Validation fails before that on a normal build. */
export function indexesToPrerender(indexes = getPublishedIndexes()): GoodNewsIndex<Story>[] {
  if (indexes.length <= MAX_PRERENDERED_INDEXES) return indexes;
  return indexes
    .slice()
    .sort((a, b) => (a.month < b.month ? 1 : -1))
    .slice(0, MAX_PRERENDERED_INDEXES)
    .reverse();
}

export function latestIndex(indexes = getPublishedIndexes()): GoodNewsIndex<Story> | undefined {
  return indexes[indexes.length - 1];
}

/** Link from a state page back to the newest edition. Copy says "this month" only while that edition is open. */
export function stateIndexLink(
  state: { name: string; slug: string },
  today = mountainDay(),
): { href: string; label: string } | undefined {
  const edition = latestIndex();
  if (!edition) return undefined;
  const href = `${edition.path}#${state.slug}`;
  const label =
    edition.month === monthKey(today)
      ? `See how ${state.name} ranks this month`
      : `See how ${state.name} ranked in ${edition.label}`;
  return { href, label };
}

export function indexJsonLd(edition: GoodNewsIndex) {
  const crumbs = [
    { name: "Today", path: "/" },
    { name: "Good News Index", path: "/good-news-index" },
    { name: edition.label, path: edition.path },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: edition.title,
        description: edition.description,
        url: absoluteUrl(edition.path),
        creator: { "@id": `${siteConfig.url}/#editorial-team` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        dateModified: publishedIso(edition.latest),
        temporalCoverage: `${edition.start}/${edition.latest}`,
        spatialCoverage: "United States and countries with a story in this edition",
        isAccessibleForFree: true,
        measurementTechnique: `Counts of stories in the ${siteConfig.name} published archive for one calendar month. Not a measure of how good a place is.`,
        distribution: {
          "@type": "DataDownload",
          encodingFormat: "text/csv",
          contentUrl: absoluteUrl(edition.csvPath),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.path),
        })),
      },
    ],
  };
}

function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function csvRow(cells: (string | number | undefined)[]): string {
  return cells.map((cell) => csvCell(cell)).join(",");
}

function csvRate(count: number, population: number): string {
  if (count <= 0 || population <= 0) return "0";
  return storiesPerMillion(count, population).toFixed(4);
}

const CSV_HEADER = [
  "record_type",
  "key",
  "label",
  "count",
  "rank",
  "population_july_1_2024",
  "stories_per_million",
  "kid_friendly_stories",
  "help_support_links",
  "help_support_rank",
  "extra",
];

/** One CSV of the edition's numbers. The note rows are the methodology a spreadsheet still carries. */
export function renderIndexCsv(edition: GoodNewsIndex): string {
  const status = edition.inProgress ? "month_to_date" : "closed";
  const lines = [
    csvRow(CSV_HEADER),
    csvRow([
      "note",
      "methodology",
      `Counts stories ${siteConfig.name} published with an edition date in this month, on or before the Mountain Time build day. This is not a measure of how good a state is.`,
    ]),
    csvRow([
      "note",
      "states",
      "A United States story counts once in us_stories. It also counts in its state and in each alsoStates code. Adding the state rows can exceed us_stories. The District of Columbia is listed and is not called a state. A place with no story is listed and is not ranked.",
    ]),
    csvRow([
      "note",
      "population",
      `${POPULATION_CITATION} ${POPULATION_URL} stories_per_million = stories / July 1, 2024 resident population * 1000000. Rates are not annualized. Ranks use the unrounded rate. The page rounds the display to two decimals.`,
    ]),
    csvRow([
      "note",
      "help_support",
      "help_support_links on a state row is the number of distinct donate, volunteer, and thank URLs on that state's stories. A leading www and the query string are ignored. Learn-more links are excluded. The same URL on two stories in one state counts once. The archive does not record nonprofit status, so this is not a nonprofit census. The summary help_support_links count is distinct URLs across every story in the month, each story once.",
    ]),
    csvRow([
      "note",
      "topics",
      "A story with several topics is counted once for each topic. Topic counts can add up to more than the number of stories.",
    ]),
    csvRow(["note", "status", status]),
    csvRow(["note", "updated_through", edition.latest]),
    csvRow(["note", "compiled", edition.asOf]),
    csvRow(["note", "population_table", POPULATION_TABLE]),
    csvRow(["summary", "stories", "Stories published", edition.storyCount, "", "", "", "", "", "", status]),
    csvRow(["summary", "us_stories", "Stories in the United States", edition.usCount]),
    csvRow(["summary", "world_stories", "Stories outside the United States", edition.worldCount]),
    csvRow(["summary", "states_with_a_story", "States and the District of Columbia with a story", edition.statesWithStories]),
    csvRow(["summary", "countries", "Countries outside the United States", edition.countryCount]),
    csvRow(["summary", "kid_friendly", "Classroom stories", edition.kidCount]),
    csvRow(["summary", "kid_friendly_us", "Classroom stories in the United States", edition.kidUsCount]),
    csvRow(["summary", "kid_friendly_world", "Classroom stories outside the United States", edition.kidWorldCount]),
    csvRow(["summary", "help_support_links", "Distinct donate, volunteer, and thank links", edition.helpLinkCount]),
    ...edition.states.map((state) =>
      csvRow([
        "state",
        state.code,
        state.name,
        state.stories,
        state.rank ?? "",
        state.population,
        csvRate(state.stories, state.population),
        state.kidStories,
        state.helpLinks,
        state.helpRank ?? "",
        state.tied ? "tied" : "",
      ]),
    ),
    ...edition.categories.map((category) =>
      csvRow(["category", category.slug, category.label, category.count, category.rank ?? "", "", "", "", "", "", category.tied ? "tied" : ""]),
    ),
    ...edition.topics.map((topic) =>
      csvRow(["topic", topic.slug, topic.label, topic.count, topic.rank ?? "", "", "", "", "", "", topic.tied ? "tied" : ""]),
    ),
    ...edition.countries.map((country) =>
      csvRow([
        "country",
        country.code,
        country.label,
        country.count,
        country.rank ?? "",
        "",
        "",
        country.kidStories,
        "",
        "",
        country.tied ? "tied" : "",
      ]),
    ),
    ...edition.standouts.map((story, index) =>
      csvRow(["standout", story.slug, story.title, "", index + 1, "", "", "", "", "", `/story/${story.slug}`]),
    ),
  ];
  return `\uFEFF${lines.join("\n")}\n`;
}
