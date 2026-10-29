/**
 * Good News Friday packs. One static page per Monday-start week, the same
 * week key as /week/{YYYY-MM-DD}. Friday is the day a class prints it.
 *
 * A pack is built only from classroom-ready stories already in that week:
 * kidFriendly, with a read-aloud summary and at least one discussion question.
 * Stories without that text are left out. The page does not invent a summary,
 * a vocabulary word, or a fact to fill a gap.
 */
import { getCategory } from "./categories";
import { countryName } from "./countries";
import { placeLabel } from "./present";
import { getPublishedStories, type Story } from "./stories";
import {
  MAX_PRERENDERED_WEEKS,
  addDays,
  formatLongDate,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";

export const CLASSROOM_INDEX_PATH = "/classroom";
export const CLASSROOM_INDEX_TITLE = "Good News for Kids This Week";
export const CLASSROOM_INDEX_DESCRIPTION =
  "Free weekly printable packs of good news for kids. Current events for kids, printable, with a read-aloud, discussion questions, and a class kindness challenge.";

export const PACK_SIZE = 5;
export const PACK_QUESTION_LIMIT = 2;

export type PackCandidate = {
  slug: string;
  title: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  place?: string;
  category: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  kidQuestions?: string[];
  kidWord?: string;
  kidDefinition?: string;
  draft?: boolean;
  image: string;
  imageAlt: string;
};

export type ClassroomPack<T extends PackCandidate = PackCandidate> = {
  start: string;
  end: string;
  friday: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  fridayLabel: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  teacherNote: string;
  challenge: string;
  stories: T[];
  readyCount: number;
  image: string;
  imageAlt: string;
  latest: string;
};

export function classroomPackPath(start: string): string {
  return `/classroom/week/${start}`;
}

export function isClassroomReady(story: PackCandidate): boolean {
  const summary = story.kidSummary?.trim() ?? "";
  const questions = (story.kidQuestions ?? []).filter((question) => question.trim());
  return Boolean(!story.draft && story.kidFriendly && summary.length >= 40 && questions.length >= 1);
}

/** The first two discussion questions on the story. A third stays on the story page. */
export function packQuestions(story: { kidQuestions?: string[] }): string[] {
  return (story.kidQuestions ?? []).map((question) => question.trim()).filter(Boolean).slice(0, PACK_QUESTION_LIMIT);
}

/** Present only when the story file already has both a word and a definition. */
export function packVocabulary(story: { kidWord?: string; kidDefinition?: string }): { word: string; definition: string } | undefined {
  const word = story.kidWord?.trim();
  const definition = story.kidDefinition?.trim();
  if (!word || !definition) return undefined;
  return { word, definition };
}

export function whereInTheWorld(story: Pick<PackCandidate, "city" | "state" | "place" | "country">): string {
  const place = placeLabel(story);
  const country = countryName(story.country);
  if (!country) return place;
  if (place.toLowerCase().includes(country.toLowerCase())) return place;
  return `${place}, ${country}`;
}

function byNewest<T extends PackCandidate>(a: T, b: T): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

function placeKey(story: PackCandidate): string {
  if (story.country === "US") return `US-${story.state || story.city}`;
  return story.country;
}

function diversityScore(story: PackCandidate, picked: PackCandidate[]): number {
  const categories = new Set(picked.map((item) => item.category));
  const places = new Set(picked.map(placeKey));
  let score = 0;
  if (!categories.has(story.category)) score += 2;
  if (!places.has(placeKey(story))) score += 1;
  return score;
}

/**
 * Up to five classroom-ready stories.
 * When the week has a story from outside the United States, the newest of
 * those is kept. The other spots prefer a category not yet used, then a
 * place not yet used. Ties go to the newer edition date, then the slug.
 * Stories that are not classroom-ready are not used to fill a short week.
 */
export function selectPackStories<T extends PackCandidate>(stories: T[]): T[] {
  const ready = stories.filter(isClassroomReady).slice().sort(byNewest);
  if (!ready.length) return [];

  const picked: T[] = [];
  const used = new Set<string>();
  const take = (story: T) => {
    picked.push(story);
    used.add(story.slug);
  };

  const world = ready.find((story) => story.country !== "US");
  if (world) take(world);

  while (picked.length < PACK_SIZE) {
    let best: T | undefined;
    let bestScore = -1;
    for (const story of ready) {
      if (used.has(story.slug)) continue;
      const score = diversityScore(story, picked);
      if (!best || score > bestScore) {
        best = story;
        bestScore = score;
      }
    }
    if (!best) break;
    take(best);
  }
  return picked;
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function uniqueInOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

export function kindnessChallenge(stories: PackCandidate[]): string {
  const categories = uniqueInOrder(
    stories.map((story) => (getCategory(story.category)?.label ?? story.category).toLowerCase()),
  );
  const places = uniqueInOrder(stories.map((story) => placeLabel(story)));
  const shown = places.slice(0, 3);
  const rest = places.length - shown.length;
  const placeText =
    rest > 0 ? `${shown.join(", ")}, and ${rest} more ${rest === 1 ? "place" : "places"}` : listPhrase(places);
  const about = categories.length ? listPhrase(categories) : "good news";
  const from = placeText ? `, from ${placeText}` : "";
  return `This week's stories are about ${about}${from}. After the read-aloud, ask the class what happened in one story. Stay with what they just heard. Then choose one small kind act the class can do at school before next Friday.`;
}

export function teacherNote(readyCount: number): string {
  const short =
    readyCount < PACK_SIZE
      ? ` This week has ${readyCount} classroom ${readyCount === 1 ? "story" : "stories"} ready, so the pack is shorter than five.`
      : "";
  return `Plan on 10 to 15 minutes with ages 6 to 11 (about grades 1 to 6). An adult reads aloud. Show the photo, read one story, ask one discussion question, and point to the place. If you have time, read another story or do the kindness challenge. The rest of the pack can wait.${short} Skip any part a story does not include.`;
}

function packIntro(stories: PackCandidate[], fridayLabel: string, inProgress: boolean): string {
  const places = new Set(stories.map(placeKey)).size;
  const sections = new Set(stories.map((story) => story.category)).size;
  const placeWord = places === 1 ? "place" : "places";
  const sectionWord = sections === 1 ? "section" : "sections";
  const open = inProgress ? " Stories published so far." : "";
  return `${stories.length} classroom ${stories.length === 1 ? "story" : "stories"} from ${places} ${placeWord}, across ${sections} ${sectionWord}. For Friday, ${fridayLabel}.${open}`;
}

function finishPack<T extends PackCandidate>(start: string, ready: T[], today: string): ClassroomPack<T> | undefined {
  const stories = selectPackStories(ready);
  if (!stories.length) return undefined;
  const end = addDays(start, 6);
  const friday = addDays(start, 4);
  const inProgress = start === weekStart(today);
  const rangeLabel = formatWeekRange(start, end);
  const fridayLabel = formatLongDate(friday);
  const photo = stories[0];
  const latest = stories.reduce((max, story) => (story.date > max ? story.date : max), stories[0].date);
  const count = stories.length;
  const storyWord = count === 1 ? "1 printable story" : `${count} printable stories`;
  return {
    start,
    end,
    friday,
    path: classroomPackPath(start),
    inProgress,
    rangeLabel,
    fridayLabel,
    title: inProgress
      ? `Good News for Kids This Week, So Far: ${rangeLabel}`
      : `Good News for Kids This Week: ${rangeLabel}`,
    heading: inProgress ? "Good news for kids this week, so far." : "Good news for kids this week.",
    description: `${storyWord} of good news for kids this week (${rangeLabel}). Current events for kids, printable, with a read-aloud, discussion questions, and a kindness challenge.`,
    intro: packIntro(stories, fridayLabel, inProgress),
    teacherNote: teacherNote(ready.length),
    challenge: kindnessChallenge(stories),
    stories,
    readyCount: ready.length,
    image: photo.image,
    imageAlt: photo.imageAlt,
    latest,
  };
}

/** Packs since launch week, oldest first. A week with no classroom story is not a page. */
export function buildClassroomPacks<T extends PackCandidate>(stories: T[], today = mountainDay()): ClassroomPack<T>[] {
  const launch = launchWeekStart();
  const current = weekStart(today);
  const buckets = new Map<string, T[]>();
  for (const story of stories) {
    if (story.draft || !parseIsoDate(story.date) || !isClassroomReady(story)) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    const list = buckets.get(start);
    if (list) list.push(story);
    else buckets.set(start, [story]);
  }
  const packs: ClassroomPack<T>[] = [];
  for (const [start, ready] of buckets) {
    const pack = finishPack(start, ready, today);
    if (pack) packs.push(pack);
  }
  packs.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return packs;
}

let cache: ClassroomPack<Story>[] | null = null;

export function getClassroomPacks(): ClassroomPack<Story>[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const packs = buildClassroomPacks(getPublishedStories());
  cache = packs;
  return packs;
}

/** Newest packs win if the archive ever passes the cap. Validation fails before that on a normal build. */
export function packsToPrerender(packs = getClassroomPacks()): ClassroomPack<Story>[] {
  if (packs.length <= MAX_PRERENDERED_WEEKS) return packs;
  return packs
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}

export function packByStart(start: string, packs = getClassroomPacks()): ClassroomPack<Story> | undefined {
  return packs.find((pack) => pack.start === start);
}
