/**
 * Good news for caregivers at /caregivers and /caregivers/{Monday}.
 *
 * Weeks use the same America/Denver Monday key as the quiz, classroom packs,
 * and the kindness challenge. An edition is five gentle stories from that
 * week. A thin week borrows from the recent backlog. Nothing here is a
 * homepage banner. November is National Family Caregivers Month, and that
 * sentence stays on this page.
 *
 * Politics and violence use the table-talk harm list and the World Kindness
 * Day block (heavy news, extra harm, tragedy headlines). A pin cannot put a
 * blocked story back. Kid-only classroom stories stay off unless they are
 * also broadly gentle, or an editor includes them.
 *
 * Editor lists live in data/caregivers-pins.json.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { formatStoryDate } from "./format";
import { placeLabel } from "./present";
import { absoluteUrl } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { tableTalkHarmReason } from "./table-talk";
import {
  MAX_PRERENDERED_WEEKS,
  addDays,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  weekStart,
} from "./weeks";
import { kindnessBlockReason } from "./world-kindness-day";
import { siteConfig } from "@/site.config";

export const CAREGIVERS_PATH = "/caregivers";

export const CAREGIVERS_TITLE = "Good news for caregivers";

export const CAREGIVERS_DESCRIPTION =
  "A calm weekly list of gentle good news for family caregivers, activity directors, senior centers, and waiting rooms. Five stories for group reading. No politics.";

export const CAREGIVERS_EDITION_SIZE = 5;

/** How far back a thin week may look for stories that were not already used. */
export const CAREGIVERS_BACKLOG_DAYS = 28;

export const LARGE_PRINT_PATH = "/large-print";

export const LIBRARIES_PATH = "/libraries";

export const CAREGIVER_ACTIVITY_TIPS = [
  "Read one story aloud. Five stories is a full sitting. One story is enough on a hard day.",
  "Pair this list with the large-print edition when the room needs bigger type.",
  "Leave politics out of the conversation. These stories stay off elections, crime, and violence.",
  "A waiting room can leave this page open, or print the list and post it.",
] as const;

export const CAREGIVER_ACTIVITY_NOTE = CAREGIVER_ACTIVITY_TIPS.join(" ");

const CONFIG_PATH = path.join(process.cwd(), "data", "caregivers-pins.json");

const KID_ONLY_TAGS = new Set([
  "kids",
  "students",
  "playgrounds",
  "youth-sports",
  "school-lunch",
  "toys",
  "stem",
  "schools",
]);

/** A kid-tagged story with one of these is still fine for a mixed room. */
const BROAD_TAGS = new Set([
  "seniors",
  "kindness",
  "neighbors",
  "volunteers",
  "community-meals",
  "food-banks",
  "food-rescue",
  "libraries",
  "little-free-libraries",
  "literacy",
  "animal-rescue",
  "dogs",
  "cats",
  "birds",
  "horses",
  "pet-adoption",
  "therapy-animals",
  "service-dogs",
  "wildlife-conservation",
  "sea-turtles",
  "zoos",
  "parks",
  "trees",
  "rivers",
  "music",
  "art",
  "home-repairs",
  "accessibility",
  "public-health",
  "vision-care",
  "medical-research",
  "community-garden",
  "cleanups",
  "festivals",
  "housing",
  "veterans",
  "teachers",
  "first-responders",
  "winter-clothes",
  "running",
  "inclusion",
  "cancer-support",
]);

const PREFERRED_CATEGORIES = new Set(["community", "animals", "health-tech"]);

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

const weekSchema = z
  .object({
    include: z.array(slugSchema).optional().default([]),
    exclude: z.array(slugSchema).optional().default([]),
  })
  .strict();

const fileSchema = z
  .object({
    weeks: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"), weekSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const [start, week] of Object.entries(data.weeks)) {
      if (mondayKey(start) !== start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weeks", start],
          message: `${start} must be the Monday of that week`,
        });
      }
      for (const field of ["include", "exclude"] as const) {
        const seen = new Set<string>();
        for (const slug of week[field]) {
          if (seen.has(slug)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["weeks", start, field],
              message: `Duplicate slug ${slug}`,
            });
          }
          seen.add(slug);
        }
      }
      for (const slug of week.include) {
        if (week.exclude.includes(slug)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["weeks", start, "include"],
            message: `${slug} is both included and excluded`,
          });
        }
      }
    }
  });

export type CaregiverWeekPins = { include: string[]; exclude: string[] };

export type CaregiverPinFile = { weeks: Record<string, CaregiverWeekPins> };

export type CaregiverCandidate = {
  slug: string;
  title: string;
  dek: string;
  body?: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  place?: string;
  alsoStates?: readonly string[];
  category: string;
  tags: readonly string[];
  sourceName?: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  kidQuestions?: string[];
  imageAlt?: string;
  imageCaption?: string;
  image: string;
  featured?: boolean;
  top5?: number;
  cheers?: number;
  draft?: boolean;
};

export type CaregiverEdition<T extends CaregiverCandidate = CaregiverCandidate> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  lede: string;
  stories: T[];
  pinned: string[];
  usedBacklog: boolean;
  image: string;
  imageAlt: string;
  latest: string;
};

export type CaregiverBuild<T extends CaregiverCandidate = CaregiverCandidate> = {
  editions: CaregiverEdition<T>[];
  pinErrors: string[];
};

export function caregiverEditionPath(start: string): string {
  return `${CAREGIVERS_PATH}/${start}`;
}

export function largePrintEditionPath(start: string): string {
  return `${LARGE_PRINT_PATH}/${start}`;
}

/** November on the America/Denver calendar. The page stays up the other months. */
export function familyCaregiversMonthNote(day = mountainDay()): string | undefined {
  if (!/^\d{4}-11-\d{2}$/.test(day)) return undefined;
  return "November is National Family Caregivers Month in the United States. This weekly list stays up the rest of the year for the same kind of group reading.";
}

function mondayKey(iso: string): string | undefined {
  try {
    return weekStart(iso);
  } catch {
    return undefined;
  }
}

/**
 * Kid-only classroom pieces are awkward as the main read in a senior center.
 * A story that is also about animals, neighbors, health, or another broad tag stays.
 */
export function awkwardForCaregivers(story: { tags: readonly string[]; category: string; kidFriendly?: boolean }): boolean {
  const kidTagged = story.tags.some((tag) => KID_ONLY_TAGS.has(tag));
  const broadTag = story.tags.some((tag) => BROAD_TAGS.has(tag));
  if (broadTag) return false;
  if (kidTagged && PREFERRED_CATEGORIES.has(story.category)) return false;
  if (kidTagged) return true;
  if (story.kidFriendly && story.category === "science") return true;
  return false;
}

/** Politics, violence, and tragedy. Same lists as table talk and World Kindness Day. */
export function caregiverHarmReason(story: CaregiverCandidate): string | undefined {
  const kindness = kindnessBlockReason({
    slug: story.slug,
    title: story.title,
    dek: story.dek,
    body: story.body ?? "",
    date: story.date,
    country: story.country,
    state: story.state,
    alsoStates: story.alsoStates ? [...story.alsoStates] : [],
    category: story.category,
    tags: [...story.tags],
    sourceName: story.sourceName,
    kidFriendly: story.kidFriendly,
    kidSummary: story.kidSummary,
    kidQuestions: story.kidQuestions,
    imageAlt: story.imageAlt,
    imageCaption: story.imageCaption,
    city: story.city,
    place: story.place,
    draft: false,
  });
  if (kindness) return kindness;
  return tableTalkHarmReason({
    slug: story.slug,
    title: story.title,
    dek: story.dek,
    body: story.body ?? "",
    date: story.date,
    city: story.city,
    country: story.country,
    state: story.state,
    place: story.place,
    category: story.category,
    tags: [...story.tags],
    sourceName: story.sourceName,
    kidFriendly: story.kidFriendly,
    kidSummary: story.kidSummary,
    kidQuestions: story.kidQuestions,
    imageAlt: story.imageAlt,
    imageCaption: story.imageCaption,
  });
}

export function caregiverBlockReason(story: CaregiverCandidate): string | undefined {
  if (story.draft) return "draft";
  const harm = caregiverHarmReason(story);
  if (harm) return harm;
  if (awkwardForCaregivers(story)) return "kid-only";
  return undefined;
}

/** Seniors first, then community, animals, and health, then other gentle tags. */
export function caregiverPreferenceScore(story: {
  tags: readonly string[];
  category: string;
  featured?: boolean;
  top5?: number;
  cheers?: number;
}): number {
  let score = 0;
  if (story.tags.includes("seniors")) score += 100;
  if (PREFERRED_CATEGORIES.has(story.category)) score += 40;
  if (story.tags.some((tag) => BROAD_TAGS.has(tag))) score += 12;
  if (story.featured) score += 6;
  if (story.top5) score += 4;
  score += Math.min(story.cheers ?? 0, 3);
  return score;
}

function compareCaregiver<T extends CaregiverCandidate>(a: T, b: T): number {
  const score = caregiverPreferenceScore(b) - caregiverPreferenceScore(a);
  if (score !== 0) return score;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

function editionLede(count: number, inProgress: boolean, usedBacklog: boolean): string {
  const open = inProgress ? "So far this week has" : "This week has";
  const noun = count === 1 ? "story" : "stories";
  const backlog = usedBacklog
    ? " The week was thin, so recent stories still waiting for a group read fill out the list."
    : "";
  const short =
    count < CAREGIVERS_EDITION_SIZE ? " Fewer than five gentle stories were ready, so this list is shorter." : "";
  return `${open} ${count} gentle ${noun} for family caregivers, activity directors, senior centers, and group reading.${backlog}${short} Read one aloud, or leave the list up in a waiting room.`;
}

export function parseCaregiverPins(data: unknown): CaregiverPinFile {
  const parsed = fileSchema.safeParse(data);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`data/caregivers-pins.json: ${details}`);
  }
  return parsed.data;
}

export function loadCaregiverPins(): CaregiverPinFile {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as unknown;
  return parseCaregiverPins(raw);
}

function emptyWeek(): CaregiverWeekPins {
  return { include: [], exclude: [] };
}

function takeFrom<T extends CaregiverCandidate>(pool: T[], picked: T[], limit: number) {
  const used = new Set(picked.map((story) => story.slug));
  const ranked = pool.filter((story) => !used.has(story.slug)).sort(compareCaregiver);
  for (const story of ranked) {
    if (picked.length >= limit) break;
    picked.push(story);
  }
}

export function buildCaregiverEditions<T extends CaregiverCandidate>(
  stories: T[],
  config: CaregiverPinFile,
  today = mountainDay(),
): CaregiverBuild<T> {
  const pinErrors: string[] = [];
  const published = stories.filter((story) => !story.draft && mondayKey(story.date));
  const bySlug = new Map(published.map((story) => [story.slug, story]));

  for (const [start, week] of Object.entries(config.weeks)) {
    for (const slug of week.exclude) {
      if (!bySlug.has(slug)) pinErrors.push(`${start}: exclude ${slug} is not a published story.`);
    }
    for (const slug of week.include) {
      const story = bySlug.get(slug);
      if (!story) {
        pinErrors.push(`${start}: include ${slug} is not a published story.`);
        continue;
      }
      const harm = caregiverHarmReason(story);
      if (harm) pinErrors.push(`${start}: include ${slug} is excluded by the content filter (${harm}).`);
    }
  }

  const gentle = published.filter((story) => !caregiverBlockReason(story));
  const launch = launchWeekStart();
  const current = weekStart(today);
  const usedBefore = new Set<string>();
  const editions: CaregiverEdition<T>[] = [];

  for (let start = launch; start <= current; start = addDays(start, 7)) {
    const week = config.weeks[start] ?? emptyWeek();
    const excluded = new Set(week.exclude);
    const picked: T[] = [];
    const pinned: string[] = [];

    for (const slug of week.include) {
      const story = bySlug.get(slug);
      if (!story || excluded.has(slug) || caregiverHarmReason(story)) continue;
      if (picked.some((item) => item.slug === slug)) continue;
      picked.push(story);
      pinned.push(slug);
    }

    const home = gentle.filter((story) => weekStart(story.date) === start && !excluded.has(story.slug));
    takeFrom(home, picked, CAREGIVERS_EDITION_SIZE);

    const backlogStart = addDays(start, -CAREGIVERS_BACKLOG_DAYS);
    const backlog = gentle.filter((story) => {
      if (excluded.has(story.slug) || usedBefore.has(story.slug)) return false;
      if (story.date < backlogStart || story.date >= start) return false;
      return true;
    });
    const beforeBacklog = picked.length;
    takeFrom(backlog, picked, CAREGIVERS_EDITION_SIZE);
    const usedBacklog = picked.slice(beforeBacklog).length > 0;

    if (!picked.length) continue;

    const end = addDays(start, 6);
    const inProgress = start === current;
    const rangeLabel = formatWeekRange(start, end);
    const photo = picked[0];
    const latest = picked.reduce((max, story) => (story.date > max ? story.date : max), picked[0].date);
    const count = picked.length;
    const noun = count === 1 ? "story" : "stories";
    editions.push({
      start,
      end,
      path: caregiverEditionPath(start),
      inProgress,
      rangeLabel,
      title: inProgress ? `Good News for Caregivers, So Far: ${rangeLabel}` : `Good News for Caregivers: ${rangeLabel}`,
      heading: inProgress ? `Good news for caregivers, so far: ${rangeLabel}.` : `Good news for caregivers: ${rangeLabel}.`,
      description: `${count} gentle ${noun} for caregivers and group reading (${rangeLabel}). No politics. Read one aloud.`,
      lede: editionLede(count, inProgress, usedBacklog),
      stories: picked,
      pinned,
      usedBacklog,
      image: photo.image,
      imageAlt: photo.imageAlt ?? photo.title,
      latest,
    });
    for (const story of picked) usedBefore.add(story.slug);
  }

  return { editions, pinErrors };
}

export function caregiverEditionText(edition: CaregiverEdition): string {
  const lines = [
    `${siteConfig.name}: Good news for caregivers`,
    `Week of ${edition.rangeLabel}`,
    "",
    edition.lede,
    "",
    CAREGIVER_ACTIVITY_NOTE,
    "",
  ];
  edition.stories.forEach((story, index) => {
    lines.push(`${index + 1}. ${story.title}`);
    lines.push(`${placeLabel(story)} · ${formatStoryDate(story.date)}`);
    lines.push(story.dek);
    lines.push(absoluteUrl(`/story/${story.slug}`));
    lines.push("");
  });
  lines.push(`Large-print edition: ${absoluteUrl(LARGE_PRINT_PATH)}`);
  lines.push(`This week's large-print edition: ${absoluteUrl(largePrintEditionPath(edition.start))}`);
  lines.push(`Libraries: ${absoluteUrl(LIBRARIES_PATH)}`);
  return lines.join("\n");
}

let cache: CaregiverBuild<Story> | null = null;

export function getCaregiverBuild(): CaregiverBuild<Story> {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const result = buildCaregiverEditions(getPublishedStories(), loadCaregiverPins());
  cache = result;
  return result;
}

export function getCaregiverEditions(): CaregiverEdition<Story>[] {
  return getCaregiverBuild().editions;
}

/** Newest editions win if the archive ever passes the cap. Validation fails before that on a normal build. */
export function editionsToPrerender(editions = getCaregiverEditions()): CaregiverEdition<Story>[] {
  if (editions.length <= MAX_PRERENDERED_WEEKS) return editions;
  return editions
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}
