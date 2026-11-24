/**
 * Good News Year in Review.
 *
 * `/year-in-review` lists editions. `/year-in-review/2026` is the roundup.
 * Stories are chosen from the archive. Nothing on the page is invented.
 * A month or a topic with no qualifying story is left off, except state
 * slots, which stay visible so a gap links to that state's hub.
 *
 * Scoring, high to low, for an automatic pick:
 * - Story of the Day (`featured`) is the strongest mark.
 * - Today's Top 5 is next. Rank 1 scores higher than rank 5.
 * - The world pick is a smaller bonus.
 * - A credited image adds a small bonus. Published stories already require one.
 * - Recency within the month adds at most a few points, so a late plain story
 *   does not pass a story of the day from earlier in that month.
 * - Cheers add at most a few points.
 * Topic sections add points for a matching tag after that base score.
 * The exact weights are `YEAR_IN_REVIEW_SCORE`.
 *
 * Editor pins in `data/year-in-review-2026.json` replace an automatic pick.
 * A pin cannot put back a story the content filter rejected.
 *
 * The content filter is the news-break heavy-news list (politics, shootings,
 * use of force) plus violence wording that list does not already name.
 * The classroom section also uses the morning-announcement kid-safe check.
 *
 * Publishing:
 * - Before `publishOn` (December 15, 2026, America/Denver) the page renders
 *   for preview, sends noindex, stays out of the sitemap, and is not linked
 *   from the nav, footer, or homepage.
 * - On and after that date it is indexable. The sitemap, nav, footer, and
 *   homepage banner follow the next build. The page robots tag follows the
 *   clock on each request.
 * - The homepage banner and the nav and footer links show through January 10,
 *   including when another seasonal banner is also eligible. They do not
 *   replace that other banner.
 * - `YEAR_IN_REVIEW_PREVIEW` forces the published state for a preview build.
 *   Leave it false. `?preview=1` opens the same page and does not change robots.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { isFirstResponderCandidate } from "./first-responders-day";
import { isSuitableAnnouncementStory } from "./morning-announcements";
import { heavyNewsReason } from "./news-break";
import { absoluteUrl, publishedIso } from "./seo";
import { pickStateStories, type StateHubSlot } from "./state-story-hub";
import { getStateByCode, STATES } from "./states";
import { getPublishedStories, type Story } from "./stories";
import { MOUNTAIN_TIME_ZONE, mountainDay } from "./weeks";
import { siteConfig } from "@/site.config";

export const YEAR_IN_REVIEW_INDEX_PATH = "/year-in-review";

export const YEAR_IN_REVIEW_TIME_ZONE = MOUNTAIN_TIME_ZONE;

/**
 * Leave false in the repo. Set true only on a preview build that should
 * index the page and show the nav, footer, and homepage links early.
 */
export const YEAR_IN_REVIEW_PREVIEW = false;

export const YEAR_IN_REVIEW_EDITIONS = [
  {
    year: 2026,
    publishOn: "2026-12-15",
    promoThrough: "2027-01-10",
  },
] as const;

export type YearInReviewEdition = (typeof YEAR_IN_REVIEW_EDITIONS)[number];

export const YEAR_IN_REVIEW_SCORE = {
  storyOfTheDay: 56,
  top5First: 24,
  top5Step: 4,
  worldPick: 10,
  image: 8,
  recencyMax: 6,
  cheersMax: 5,
} as const;

export const YEAR_IN_REVIEW_LIMITS = {
  kids: 8,
  firstResponders: 6,
  animals: 8,
} as const;

export const YEAR_IN_REVIEW_MONTHS = [
  { key: "01", name: "January" },
  { key: "02", name: "February" },
  { key: "03", name: "March" },
  { key: "04", name: "April" },
  { key: "05", name: "May" },
  { key: "06", name: "June" },
  { key: "07", name: "July" },
  { key: "08", name: "August" },
  { key: "09", name: "September" },
  { key: "10", name: "October" },
  { key: "11", name: "November" },
  { key: "12", name: "December" },
] as const;

const KID_TAG_POINTS: Record<string, number> = {
  kids: 12,
  students: 10,
  schools: 8,
  playgrounds: 8,
  teachers: 6,
  literacy: 6,
  toys: 6,
};

const RESPONDER_TAG_POINTS: Record<string, number> = {
  "first-responders": 16,
  firefighters: 14,
  ems: 14,
  "search-and-rescue": 14,
  dispatch: 12,
  police: 12,
};

const NATURE_TAG_POINTS: Record<string, number> = {
  "animal-rescue": 12,
  "wildlife-conservation": 12,
  "pet-adoption": 10,
  "sea-turtles": 10,
  "therapy-animals": 8,
  "service-dogs": 8,
  dogs: 8,
  cats: 8,
  birds: 8,
  horses: 8,
  zoos: 6,
  parks: 8,
  trees: 8,
  rivers: 8,
  cleanups: 6,
  "community-garden": 8,
  pollinators: 6,
  trails: 6,
  recycling: 4,
};

const NATURE_TAGS = new Set(Object.keys(NATURE_TAG_POINTS));

/**
 * Violence, force, and shooting phrases the heavy-news list does not already
 * cover in full. "bomb" is omitted so a seed bomb can stay. "shot" alone is
 * omitted so a photo credit can stay.
 */
const EXTRA_BLOCKS: { id: string; pattern: RegExp }[] = [
  {
    id: "violence",
    pattern:
      /\b(?:violence|violent|assault(?:ed|s)?|stabb(?:ed|ing|s)?|murders?|murdered|homicides?|weapons?|firearms?|handguns?|rifles?|pistols?|guns?)\b/i,
  },
  {
    id: "use-of-force",
    pattern:
      /\b(?:use of force|use-of-force|used force|excessive force|brutality|tasers?|tasered|pepper[- ]spray|officer-involved|lethal force)\b/i,
  },
  {
    id: "shooting",
    pattern: /\b(?:shootings?|gunfire|gunshots?|gunmen|gunman|shots fired|opened fire|shot and killed)\b/i,
  },
  {
    id: "politics",
    pattern: /\b(?:politics|political|partisan|politicians?|elections?|on the ballot|campaign rally)\b/i,
  },
];

const SAFE_PHRASES = [
  /democratic republic/gi,
  /democrat-gazette/gi,
  /times[-\s]+republican/gi,
  /cynthiana democrat/gi,
  /library of congress/gi,
];

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");
const monthKeySchema = z.string().regex(/^(?:0[1-9]|1[0-2])$/, "Use a month key from 01 to 12");

const editorSchema = z
  .object({
    exclude: z.array(slugSchema),
    months: z.record(monthKeySchema, slugSchema),
    states: z.record(z.string().regex(/^[A-Z]{2}$/, "Use a USPS code"), slugSchema),
    world: z.array(slugSchema),
    kids: z.array(slugSchema),
    firstResponders: z.array(slugSchema),
    animals: z.array(slugSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const field of ["exclude", "world", "kids", "firstResponders", "animals"] as const) {
      const seen = new Set<string>();
      for (const slug of data[field]) {
        if (seen.has(slug)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `Duplicate slug ${slug}`,
          });
        }
        seen.add(slug);
      }
    }
    const monthSlugs = new Set<string>();
    for (const [month, slug] of Object.entries(data.months)) {
      if (monthSlugs.has(slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["months", month],
          message: `${slug} is already pinned to another month`,
        });
      }
      monthSlugs.add(slug);
    }
    for (const code of Object.keys(data.states)) {
      if (!getStateByCode(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["states", code],
          message: `${code} is not a USPS state code`,
        });
      }
    }
  });

export type YearInReviewEditorConfig = z.infer<typeof editorSchema>;

export type YearReviewStory = {
  slug: string;
  title: string;
  shortTitle?: string;
  emphasis?: string;
  dek: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  alsoStates: string[];
  place?: string;
  category: string;
  tags: string[];
  sourceName: string;
  sourceUrl: string;
  image: string;
  imageAlt: string;
  imageCaption?: string;
  imageTreatment?: "none" | "warm";
  body?: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  kidQuestions?: string[];
  featured?: boolean;
  top5?: number;
  worldPick?: boolean;
  cheers?: number;
  draft?: boolean;
  correction?: string;
};

export type YearPick<T extends YearReviewStory = YearReviewStory> = {
  story: T;
  pinned: boolean;
  score: number;
};

export type YearMonth<T extends YearReviewStory = YearReviewStory> = {
  key: string;
  name: string;
  story: T;
  pinned: boolean;
  score: number;
};

export type YearInReviewNumbers = {
  stories: number;
  places: number;
  countries: number;
  months: number;
  classroom: number;
  world: number;
  firstResponders: number;
  animals: number;
};

export type YearInReview<T extends YearReviewStory = YearReviewStory> = {
  year: number;
  months: YearMonth<T>[];
  emptyMonths: { key: string; name: string }[];
  slots: StateHubSlot<T>[];
  covered: StateHubSlot<T>[];
  gaps: StateHubSlot<T>[];
  world: YearPick<T>[];
  kids: YearPick<T>[];
  firstResponders: YearPick<T>[];
  animals: YearPick<T>[];
  numbers: YearInReviewNumbers;
  stories: T[];
  imageStory?: T;
  latest?: string;
  pinErrors: string[];
};

export type YearInReviewGate = {
  now?: Date;
  preview?: boolean;
};

export function yearInReviewPath(year: number): string {
  return `${YEAR_IN_REVIEW_INDEX_PATH}/${year}`;
}

export function yearInReviewEdition(year: number): YearInReviewEdition | undefined {
  return YEAR_IN_REVIEW_EDITIONS.find((edition) => edition.year === year);
}

export function isYearInReviewEdition(year: number): year is YearInReviewEdition["year"] {
  return Boolean(yearInReviewEdition(year));
}

function gatePreview(gate: YearInReviewGate): boolean {
  return gate.preview ?? YEAR_IN_REVIEW_PREVIEW;
}

/** True when this edition should be indexed and listed in the sitemap. */
export function yearInReviewIndexable(year: number, gate: YearInReviewGate = {}): boolean {
  const edition = yearInReviewEdition(year);
  if (!edition) return false;
  if (gatePreview(gate)) return true;
  return mountainDay(gate.now) >= edition.publishOn;
}

/** True when the index should be indexed. That starts with the first public edition. */
export function yearInReviewIndexPublic(gate: YearInReviewGate = {}): boolean {
  return YEAR_IN_REVIEW_EDITIONS.some((edition) => yearInReviewIndexable(edition.year, gate));
}

/**
 * Homepage, footer, and nav promotion. Independent of the single-banner picker
 * so a year-end banner can sit with whatever other seasonal banner is up.
 */
export function yearInReviewPromo(gate: YearInReviewGate = {}): { year: number; href: string; label: string } | null {
  const day = mountainDay(gate.now);
  const preview = gatePreview(gate);
  const edition = [...YEAR_IN_REVIEW_EDITIONS].reverse().find((item) => {
    if (preview) return true;
    return day >= item.publishOn && day <= item.promoThrough;
  });
  if (!edition) return null;
  return {
    year: edition.year,
    href: yearInReviewPath(edition.year),
    label: `Good News Year in Review ${edition.year}`,
  };
}

export function yearInReviewRobots(year: number, gate: YearInReviewGate = {}) {
  if (yearInReviewIndexable(year, gate)) {
    return {
      index: true as const,
      follow: true as const,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
      "max-video-preview": -1,
    };
  }
  return { index: false as const, follow: true as const };
}

export function yearInReviewTitle(year: number): string {
  return `Good News Year in Review ${year}`;
}

export function yearInReviewDescription(review: { year: number; numbers: YearInReviewNumbers }): string {
  const { year, numbers } = review;
  const storyLabel = numbers.stories === 1 ? "1 verified story" : `${numbers.stories} verified stories`;
  const placeLabel = numbers.places === 1 ? "1 state or D.C." : `${numbers.places} states or D.C.`;
  const countryLabel = numbers.countries === 1 ? "1 country" : `${numbers.countries} countries`;
  return `Good news ${year}: the best good news stories of ${year}, chosen from ${storyLabel}. Positive news this year from ${placeLabel} and ${countryLabel}, plus classrooms, first responders, and animals.`;
}

export function yearInReviewShare(year: number): string {
  return `Good news ${year}: the best verified stories of the year, for readers and classrooms.`;
}

export function emptyYearInReviewConfig(): YearInReviewEditorConfig {
  return {
    exclude: [],
    months: {},
    states: {},
    world: [],
    kids: [],
    firstResponders: [],
    animals: [],
  };
}

export function yearInReviewConfigPath(year: number): string {
  return path.join(process.cwd(), "data", `year-in-review-${year}.json`);
}

export function parseYearInReviewEditorConfig(value: unknown): YearInReviewEditorConfig {
  const result = editorSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Year in Review config: ${details}`);
  }
  return result.data;
}

export function loadYearInReviewEditorConfig(year: number): YearInReviewEditorConfig {
  const file = yearInReviewConfigPath(year);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${path.relative(process.cwd(), file)}`);
  }
  return parseYearInReviewEditorConfig(JSON.parse(fs.readFileSync(file, "utf8")));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function reviewText(story: YearReviewStory): string {
  let text = [story.title, story.shortTitle, story.emphasis, story.dek, story.body, story.imageAlt, story.imageCaption, story.kidSummary, ...(story.kidQuestions ?? [])]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n");
  const source = story.sourceName.trim();
  if (source) text = text.replace(new RegExp(escapeRegExp(source), "gi"), " ");
  for (const phrase of SAFE_PHRASES) text = text.replace(phrase, " ");
  return text;
}

/** Why a story stays off the roundup, or undefined when it may be picked. */
export function yearInReviewBlockReason(story: YearReviewStory): string | undefined {
  const heavy = heavyNewsReason(story);
  if (heavy) return heavy;
  const text = reviewText(story);
  for (const rule of EXTRA_BLOCKS) {
    const match = text.match(rule.pattern);
    if (match?.[0]) return match[0];
  }
  return undefined;
}

export function yearInReviewBaseScore(story: YearReviewStory): number {
  let score = 0;
  if (story.featured) score += YEAR_IN_REVIEW_SCORE.storyOfTheDay;
  if (story.top5) {
    score += YEAR_IN_REVIEW_SCORE.top5First - (story.top5 - 1) * YEAR_IN_REVIEW_SCORE.top5Step;
  }
  if (story.worldPick) score += YEAR_IN_REVIEW_SCORE.worldPick;
  if (story.image.trim()) score += YEAR_IN_REVIEW_SCORE.image;
  const day = Number(story.date.slice(8, 10));
  if (day >= 1 && day <= 31) {
    score += Math.round((day / 31) * YEAR_IN_REVIEW_SCORE.recencyMax);
  }
  score += Math.min(Math.max(story.cheers ?? 0, 0), YEAR_IN_REVIEW_SCORE.cheersMax);
  return score;
}

function tagPoints(story: YearReviewStory, table: Record<string, number>): number {
  return story.tags.reduce((sum, tag) => sum + (table[tag] ?? 0), 0);
}

function sectionScore(story: YearReviewStory, section: "base" | "kids" | "responders" | "animals"): number {
  const base = yearInReviewBaseScore(story);
  if (section === "kids") return base + tagPoints(story, KID_TAG_POINTS);
  if (section === "responders") return base + tagPoints(story, RESPONDER_TAG_POINTS);
  if (section === "animals") {
    return base + tagPoints(story, NATURE_TAG_POINTS) + (story.category === "animals" ? 8 : 0);
  }
  return base;
}

function compareScored(section: "base" | "kids" | "responders" | "animals") {
  return (a: YearReviewStory, b: YearReviewStory): number => {
    const score = sectionScore(b, section) - sectionScore(a, section);
    if (score) return score;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (featured) return featured;
    return a.slug.localeCompare(b.slug);
  };
}

export function storyInReviewYear(story: Pick<YearReviewStory, "date">, year: number): boolean {
  return story.date.startsWith(`${year}-`);
}

export function storyQualifiesForYear(story: YearReviewStory, year: number, config: YearInReviewEditorConfig): boolean {
  if (story.draft || !storyInReviewYear(story, year)) return false;
  if (config.exclude.includes(story.slug)) return false;
  return !yearInReviewBlockReason(story);
}

export function storyIsClassroomReady(story: YearReviewStory): boolean {
  if (story.draft || !story.kidFriendly || !story.kidSummary || !story.kidQuestions?.length) return false;
  return isSuitableAnnouncementStory({
    slug: story.slug,
    title: story.title,
    shortTitle: story.shortTitle,
    dek: story.dek,
    date: story.date,
    city: story.city,
    country: story.country,
    state: story.state,
    place: story.place,
    category: story.category,
    sourceName: story.sourceName,
    sourceUrl: story.sourceUrl,
    image: story.image,
    imageAlt: story.imageAlt,
    kidFriendly: true,
    kidSummary: story.kidSummary,
    featured: story.featured,
    top5: story.top5,
    draft: story.draft,
  });
}

export function storyIsAnimalOrNature(story: YearReviewStory): boolean {
  if (story.category === "animals") return true;
  return story.tags.some((tag) => NATURE_TAGS.has(tag));
}

function monthKeyOf(story: Pick<YearReviewStory, "date">): string {
  return story.date.slice(5, 7);
}

function compareStateScore<T extends YearReviewStory>(code: string, a: T, b: T): number {
  const home = Number(b.state === code) - Number(a.state === code);
  if (home) return home;
  return compareScored("base")(a, b);
}

function takeListPins<T extends YearReviewStory>(
  label: string,
  slugs: string[],
  bySlug: Map<string, T>,
  config: YearInReviewEditorConfig,
  accept: (story: T) => string | undefined,
  pinErrors: string[],
): YearPick<T>[] {
  const picks: YearPick<T>[] = [];
  for (const slug of slugs) {
    const story = bySlug.get(slug);
    if (!story) {
      pinErrors.push(`${label}: pinned slug ${slug} is not a published story.`);
      continue;
    }
    if (config.exclude.includes(slug)) {
      pinErrors.push(`${label}: pinned slug ${slug} is on the exclude list.`);
      continue;
    }
    const blocked = yearInReviewBlockReason(story);
    if (blocked) {
      pinErrors.push(`${label}: pinned slug ${slug} is excluded by the content filter (${blocked}).`);
      continue;
    }
    const rejected = accept(story);
    if (rejected) {
      pinErrors.push(`${label}: pinned slug ${slug} ${rejected}`);
      continue;
    }
    picks.push({ story, pinned: true, score: sectionScore(story, label === "kids" ? "kids" : label === "firstResponders" ? "responders" : label === "animals" ? "animals" : "base") });
  }
  return picks;
}

function fillList<T extends YearReviewStory>(
  pinned: YearPick<T>[],
  pool: T[],
  section: "base" | "kids" | "responders" | "animals",
  limit: number,
): YearPick<T>[] {
  const seen = new Set(pinned.map((pick) => pick.story.slug));
  const room = Math.max(0, limit - pinned.length);
  const auto = pool
    .filter((story) => !seen.has(story.slug))
    .sort(compareScored(section))
    .slice(0, room)
    .map((story) => ({ story, pinned: false, score: sectionScore(story, section) }));
  return [...pinned, ...auto];
}

export function buildYearInReview<T extends YearReviewStory>(
  stories: T[],
  config: YearInReviewEditorConfig,
  year: number,
): YearInReview<T> {
  const pinErrors: string[] = [];
  const published = stories.filter((story) => !story.draft);
  const bySlug = new Map(published.map((story) => [story.slug, story]));
  const qualifies = (story: T) => storyQualifiesForYear(story, year, config);
  const qualifying = published.filter(qualifies);

  for (const slug of config.exclude) {
    if (!bySlug.has(slug)) pinErrors.push(`exclude: ${slug} is not a published story.`);
  }

  const months: YearMonth<T>[] = [];
  for (const month of YEAR_IN_REVIEW_MONTHS) {
    const pinSlug = config.months[month.key];
    if (pinSlug) {
      const story = bySlug.get(pinSlug);
      if (!story) {
        pinErrors.push(`months.${month.key}: pinned slug ${pinSlug} is not a published story.`);
      } else if (config.exclude.includes(pinSlug)) {
        pinErrors.push(`months.${month.key}: pinned slug ${pinSlug} is on the exclude list.`);
      } else if (!storyInReviewYear(story, year) || monthKeyOf(story) !== month.key) {
        pinErrors.push(`months.${month.key}: pinned slug ${pinSlug} is not dated in ${month.name} ${year}.`);
      } else {
        const blocked = yearInReviewBlockReason(story);
        if (blocked) {
          pinErrors.push(`months.${month.key}: pinned slug ${pinSlug} is excluded by the content filter (${blocked}).`);
        } else {
          months.push({
            key: month.key,
            name: month.name,
            story,
            pinned: true,
            score: sectionScore(story, "base"),
          });
          continue;
        }
      }
    }
    const pool = qualifying.filter((story) => monthKeyOf(story) === month.key).sort(compareScored("base"));
    const story = pool[0];
    if (!story) continue;
    months.push({
      key: month.key,
      name: month.name,
      story,
      pinned: false,
      score: sectionScore(story, "base"),
    });
  }
  const emptyMonths = YEAR_IN_REVIEW_MONTHS.filter((month) => !months.some((pick) => pick.key === month.key)).map((month) => ({
    key: month.key,
    name: month.name,
  }));

  const statePins = { ...config.states };
  for (const [code, slug] of Object.entries(config.states)) {
    const story = bySlug.get(slug);
    if (!story) continue;
    if (config.exclude.includes(slug)) {
      pinErrors.push(`${code}: pinned slug ${slug} is on the exclude list.`);
      delete statePins[code];
      continue;
    }
    const blocked = yearInReviewBlockReason(story);
    if (blocked) {
      pinErrors.push(`${code}: pinned slug ${slug} is excluded by the content filter (${blocked}).`);
      delete statePins[code];
      continue;
    }
    if (!storyInReviewYear(story, year)) {
      pinErrors.push(`${code}: pinned slug ${slug} is not dated in ${year}.`);
      delete statePins[code];
    }
  }
  const statePick = pickStateStories({
    stories: qualifying,
    pins: statePins,
    qualifies: () => true,
    compare: compareStateScore,
  });
  pinErrors.push(...statePick.pinErrors);

  const worldPins = takeListPins("world", config.world, bySlug, config, (story) => {
    if (!storyInReviewYear(story, year)) return `is not dated in ${year}.`;
    if (story.country === "US") return "is a United States story.";
    return undefined;
  }, pinErrors);
  const worldCountries = new Set(worldPins.map((pick) => pick.story.country));
  const worldSeen = new Set(worldPins.map((pick) => pick.story.slug));
  const bestByCountry = new Map<string, T>();
  for (const story of qualifying.filter((story) => story.country !== "US" && !worldSeen.has(story.slug)).sort(compareScored("base"))) {
    if (worldCountries.has(story.country) || bestByCountry.has(story.country)) continue;
    bestByCountry.set(story.country, story);
  }
  const world = [
    ...worldPins,
    ...[...bestByCountry.values()].sort(compareScored("base")).map((story) => ({
      story,
      pinned: false,
      score: sectionScore(story, "base"),
    })),
  ];

  const kidPins = takeListPins("kids", config.kids, bySlug, config, (story) => {
    if (!storyInReviewYear(story, year)) return `is not dated in ${year}.`;
    if (!storyIsClassroomReady(story)) return "does not clear the classroom filter.";
    return undefined;
  }, pinErrors);
  const kids = fillList(
    kidPins,
    qualifying.filter((story) => storyIsClassroomReady(story)),
    "kids",
    YEAR_IN_REVIEW_LIMITS.kids,
  );

  const responderPins = takeListPins("firstResponders", config.firstResponders, bySlug, config, (story) => {
    if (!storyInReviewYear(story, year)) return `is not dated in ${year}.`;
    if (!isFirstResponderCandidate(story)) return "is not a first responder story.";
    return undefined;
  }, pinErrors);
  const firstResponders = fillList(
    responderPins,
    qualifying.filter((story) => isFirstResponderCandidate(story)),
    "responders",
    YEAR_IN_REVIEW_LIMITS.firstResponders,
  );

  const animalPins = takeListPins("animals", config.animals, bySlug, config, (story) => {
    if (!storyInReviewYear(story, year)) return `is not dated in ${year}.`;
    if (!storyIsAnimalOrNature(story)) return "is not an animal or nature story.";
    return undefined;
  }, pinErrors);
  const animals = fillList(
    animalPins,
    qualifying.filter((story) => storyIsAnimalOrNature(story)),
    "animals",
    YEAR_IN_REVIEW_LIMITS.animals,
  );

  const placeCodes = new Set<string>();
  const countries = new Set<string>();
  for (const story of qualifying) {
    countries.add(story.country);
    if (story.country === "US") {
      if (story.state && getStateByCode(story.state)) placeCodes.add(story.state);
      for (const extra of story.alsoStates) {
        if (getStateByCode(extra)) placeCodes.add(extra);
      }
    }
  }

  const numbers: YearInReviewNumbers = {
    stories: qualifying.length,
    places: placeCodes.size,
    countries: countries.size,
    months: new Set(qualifying.map((story) => monthKeyOf(story))).size,
    classroom: qualifying.filter((story) => storyIsClassroomReady(story)).length,
    world: qualifying.filter((story) => story.country !== "US").length,
    firstResponders: qualifying.filter((story) => isFirstResponderCandidate(story)).length,
    animals: qualifying.filter((story) => storyIsAnimalOrNature(story)).length,
  };

  const seen = new Set<string>();
  const listed: T[] = [];
  function add(story?: T) {
    if (!story || seen.has(story.slug)) return;
    seen.add(story.slug);
    listed.push(story);
  }
  for (const month of months) add(month.story);
  for (const slot of statePick.slots) add(slot.story);
  for (const pick of world) add(pick.story);
  for (const pick of kids) add(pick.story);
  for (const pick of firstResponders) add(pick.story);
  for (const pick of animals) add(pick.story);

  const imageStory = listed.slice().sort(compareScored("base"))[0];
  const latest = qualifying.map((story) => story.date).sort().at(-1);

  return {
    year,
    months,
    emptyMonths,
    slots: statePick.slots,
    covered: statePick.slots.filter((slot) => slot.story),
    gaps: statePick.slots.filter((slot) => !slot.story),
    world,
    kids,
    firstResponders,
    animals,
    numbers,
    stories: listed,
    imageStory,
    latest,
    pinErrors,
  };
}

const cache = new Map<number, YearInReview<Story>>();

export function getYearInReview(year: number): YearInReview<Story> {
  if (!isYearInReviewEdition(year)) {
    throw new Error(`${year} is not a Year in Review edition.`);
  }
  if (process.env.NODE_ENV === "production") {
    const cached = cache.get(year);
    if (cached) return cached;
  }
  const review = buildYearInReview(getPublishedStories(), loadYearInReviewEditorConfig(year), year);
  if (review.pinErrors.length) {
    throw new Error(`Year in Review ${year} config:\n- ${review.pinErrors.join("\n- ")}`);
  }
  cache.set(year, review);
  return review;
}

export function formatYearInReviewGapReport(review: YearInReview): string {
  const lines = [
    `Good News Year in Review ${review.year}`,
    `Qualifying stories: ${review.numbers.stories}`,
    `States and D.C. covered: ${review.numbers.places} of ${STATES.length}`,
    `Countries covered: ${review.numbers.countries}`,
    `Classroom stories: ${review.numbers.classroom}`,
    `First responder stories: ${review.numbers.firstResponders}`,
    `Animal and nature stories: ${review.numbers.animals}`,
    `Stories outside the United States: ${review.numbers.world}`,
    review.months.length
      ? `Months with a story: ${review.months.map((month) => month.name).join(", ")}`
      : "Months with a story: none",
    review.emptyMonths.length
      ? `Months with no qualifying story: ${review.emptyMonths.map((month) => month.name).join(", ")}`
      : "Months with no qualifying story: none",
    review.gaps.length
      ? `States with no qualifying story: ${review.gaps.map((slot) => slot.state.name).join(", ")}`
      : "States with no qualifying story: none",
  ];
  if (review.numbers.classroom === 0) lines.push("No qualifying classroom story yet.");
  if (review.numbers.firstResponders === 0) lines.push("No qualifying first responder story yet.");
  if (review.numbers.animals === 0) lines.push("No qualifying animal or nature story yet.");
  if (review.numbers.world === 0) lines.push("No qualifying story outside the United States yet.");
  return lines.join("\n");
}

export function yearInReviewJsonLd(review: YearInReview) {
  const url = absoluteUrl(yearInReviewPath(review.year));
  const indexUrl = absoluteUrl(YEAR_IN_REVIEW_INDEX_PATH);
  const listed = review.stories.slice(0, 40);
  const title = yearInReviewTitle(review.year);
  const description = yearInReviewDescription(review);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Article", "CollectionPage"],
        "@id": `${url}#article`,
        headline: title,
        name: title,
        description,
        url,
        mainEntityOfPage: url,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        ...(review.latest
          ? { datePublished: publishedIso(review.latest), dateModified: publishedIso(review.latest) }
          : {}),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: review.stories.length,
          itemListElement: listed.map((story, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: story.title,
            url: absoluteUrl(`/story/${story.slug}`),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Year in Review", item: indexUrl },
          { "@type": "ListItem", position: 3, name: String(review.year), item: url },
        ],
      },
    ],
  };
}

export function yearInReviewIndexJsonLd() {
  const url = absoluteUrl(YEAR_IN_REVIEW_INDEX_PATH);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        name: "Good News Year in Review",
        headline: "Good News Year in Review",
        description: "Year-end roundups of verified good news.",
        url,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: YEAR_IN_REVIEW_EDITIONS.length,
          itemListElement: YEAR_IN_REVIEW_EDITIONS.map((edition, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: yearInReviewTitle(edition.year),
            url: absoluteUrl(yearInReviewPath(edition.year)),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Year in Review", item: url },
        ],
      },
    ],
  };
}
