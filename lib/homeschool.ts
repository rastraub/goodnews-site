/**
 * Good news for homeschool and co-ops. One static page per Monday-start week,
 * the same week key as /week and /classroom/week.
 *
 * A pack is built from published kid-friendly stories that already have a
 * read-aloud summary. When the week has at least four stories that also have
 * a discussion question, those are the only ones used. A thinner week may add
 * a story that has a summary and no question. The page does not invent a
 * summary, a question, a vocabulary line, or a fact.
 */
import { getCategory } from "./categories";
import { isClassroomReady, selectPackStories, type PackCandidate } from "./classroom-pack";
import { getKindnessChallenges } from "./kindness";
import { placeLabel } from "./present";
import { getPublishedStories, type Story } from "./stories";
import {
  MAX_PRERENDERED_WEEKS,
  addDays,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";

export const HOMESCHOOL_INDEX_PATH = "/homeschool";
export const HOMESCHOOL_INDEX_TITLE = "Good News for Homeschool";
export const HOMESCHOOL_INDEX_DESCRIPTION =
  "Free weekly current-events packs for homeschool families and co-ops. Read-alouds, discussion prompts, and an at-home kindness challenge. Separate from the teacher packs.";

export const HOMESCHOOL_PACK_SIZE = 5;
const HOMESCHOOL_TARGET = 4;
const SUMMARY_MIN = 40;

export type HomeKindness = {
  home: string;
  path: string;
  storySlug: string;
};

export type HomeschoolPack<T extends PackCandidate = PackCandidate> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  parentNote: string;
  circle: string;
  challenge: string;
  challengePath?: string;
  stories: T[];
  readyCount: number;
  image: string;
  imageAlt: string;
  latest: string;
};

export function homeschoolPackPath(start: string): string {
  return `/homeschool/week/${start}`;
}

/** Kid-friendly, with a real read-aloud. A discussion question is not required. */
export function isHomeschoolReady(story: PackCandidate): boolean {
  const summary = story.kidSummary?.trim() ?? "";
  return Boolean(!story.draft && story.kidFriendly && summary.length >= SUMMARY_MIN);
}

function byNewest<T extends PackCandidate>(a: T, b: T): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

function placeKey(story: PackCandidate): string {
  if (story.country === "US") return `US-${story.state || story.city}`;
  return story.country;
}

function fillScore<T extends PackCandidate>(story: T, picked: T[]): number {
  let score = 0;
  if (!picked.some((item) => item.category === story.category)) score += 2;
  if (!picked.some((item) => placeKey(item) === placeKey(story))) score += 1;
  if (story.country !== "US" && !picked.some((item) => item.country !== "US")) score += 3;
  if (isClassroomReady(story)) score += 0.25;
  return score;
}

/**
 * Up to five stories. A week that already has four stories with discussion
 * questions uses the classroom selection, so a summary-only story is not
 * added just to reach five. A thinner week may add summary-only stories.
 */
export function selectHomeschoolStories<T extends PackCandidate>(stories: T[]): T[] {
  const ready = stories.filter(isHomeschoolReady).slice().sort(byNewest);
  if (!ready.length) return [];
  const strict = ready.filter(isClassroomReady);
  if (strict.length >= HOMESCHOOL_TARGET) return selectPackStories(strict);

  const picked = selectPackStories(strict);
  const used = new Set(picked.map((story) => story.slug));
  while (picked.length < HOMESCHOOL_PACK_SIZE) {
    let best: T | undefined;
    let bestScore = -1;
    for (const story of ready) {
      if (used.has(story.slug)) continue;
      const score = fillScore(story, picked);
      if (!best || score > bestScore) {
        best = story;
        bestScore = score;
      }
    }
    if (!best) break;
    picked.push(best);
    used.add(best.slug);
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

export function parentNote(readyCount: number, hasPrompt: boolean): string {
  const short =
    readyCount < HOMESCHOOL_PACK_SIZE
      ? ` This week has ${readyCount} ${readyCount === 1 ? "story" : "stories"} ready for home, so the pack is shorter than five.`
      : "";
  const ask = hasPrompt ? "ask one discussion prompt, and point to the place." : "and point to the place.";
  return `Plan on 10 to 15 minutes with ages 6 to 11. A parent or co-op leader reads aloud. Show the photo, read one story, ${ask} If you have time, read another story or try the at-home kindness challenge. The rest of the pack can wait.${short} Skip any part a story does not include.`;
}

/** Two or three sentences a parent can read at a morning circle or co-op share. */
export function morningCircle(stories: PackCandidate[], inProgress: boolean): string {
  const count = stories.length;
  const storyWord = count === 1 ? "story" : "stories";
  const places = uniqueInOrder(stories.map((story) => placeLabel(story)));
  const shown = places.slice(0, 3);
  const rest = places.length - shown.length;
  const placeText = !shown.length
    ? ""
    : rest > 0
      ? ` from ${shown.join(", ")}, and ${rest} more ${rest === 1 ? "place" : "places"}`
      : ` from ${listPhrase(shown)}`;
  const categories = uniqueInOrder(stories.map((story) => (getCategory(story.category)?.label ?? story.category).toLowerCase()));
  const about = categories.length ? listPhrase(categories) : "good news";
  const open = inProgress ? "So far this week" : "This week";
  const hasPrompt = stories.some((story) => (story.kidQuestions ?? []).some((question) => question.trim()));
  const third = hasPrompt
    ? "We will read one together, notice where it happened, and talk about one question from the page."
    : "We will read one together and notice where it happened.";
  return `${open} we have ${count} ${storyWord} of good news${placeText}. They are about ${about}. ${third}`;
}

/** Uses the week's at-home kindness step when one exists. Otherwise a free act tied to the pack's places and sections. */
export function atHomeChallenge(stories: PackCandidate[], kindness?: HomeKindness): { text: string; path?: string } {
  if (kindness?.home.trim()) {
    const tied = stories.some((story) => story.slug === kindness.storySlug);
    const tie = tied
      ? " The story that inspired it is in this pack."
      : " The story that inspired it is on the kindness challenge page.";
    return { text: `${kindness.home.trim()} It is the at-home step from this week's kindness challenge.${tie}`, path: kindness.path };
  }
  const categories = uniqueInOrder(stories.map((story) => (getCategory(story.category)?.label ?? story.category).toLowerCase()));
  const places = uniqueInOrder(stories.map((story) => placeLabel(story)));
  const shown = places.slice(0, 3);
  const rest = places.length - shown.length;
  const placeText =
    rest > 0 ? `${shown.join(", ")}, and ${rest} more ${rest === 1 ? "place" : "places"}` : listPhrase(places);
  const about = categories.length ? listPhrase(categories) : "good news";
  const from = placeText ? `, from ${placeText}` : "";
  return {
    text: `This week's stories are about ${about}${from}. After you read one together, talk about what happened. Stay with what you just heard. Then pick one small, free kind act your family or co-op can do at home before next week.`,
  };
}

function packIntro(stories: PackCandidate[], inProgress: boolean): string {
  const places = new Set(stories.map(placeKey)).size;
  const sections = new Set(stories.map((story) => story.category)).size;
  const placeWord = places === 1 ? "place" : "places";
  const sectionWord = sections === 1 ? "section" : "sections";
  const open = inProgress ? " Stories published so far." : "";
  return `${stories.length} ${stories.length === 1 ? "story" : "stories"} for current events at home, from ${places} ${placeWord} and ${sections} ${sectionWord}.${open}`;
}

function finishPack<T extends PackCandidate>(start: string, ready: T[], today: string, kindness?: HomeKindness): HomeschoolPack<T> | undefined {
  const stories = selectHomeschoolStories(ready);
  if (!stories.length) return undefined;
  const end = addDays(start, 6);
  const inProgress = start === weekStart(today);
  const rangeLabel = formatWeekRange(start, end);
  const photo = stories[0];
  if (!photo) return undefined;
  const latest = stories.reduce((max, story) => (story.date > max ? story.date : max), photo.date);
  const count = stories.length;
  const storyWord = count === 1 ? "1 story" : `${count} stories`;
  const hasPrompt = stories.some((story) => (story.kidQuestions ?? []).some((question) => question.trim()));
  const challenge = atHomeChallenge(stories, kindness);
  return {
    start,
    end,
    path: homeschoolPackPath(start),
    inProgress,
    rangeLabel,
    title: inProgress ? `Good News for Homeschool, So Far: ${rangeLabel}` : `Good News for Homeschool: ${rangeLabel}`,
    heading: inProgress
      ? "Good news for this week's current events at home, so far."
      : "Good news for this week's current events at home.",
    description: `${storyWord} for homeschool and co-op current events (${rangeLabel}). A read-aloud, discussion prompts, and an at-home kindness challenge.`,
    intro: packIntro(stories, inProgress),
    parentNote: parentNote(ready.length, hasPrompt),
    circle: morningCircle(stories, inProgress),
    challenge: challenge.text,
    challengePath: challenge.path,
    stories,
    readyCount: ready.length,
    image: photo.image,
    imageAlt: photo.imageAlt,
    latest,
  };
}

/** Packs since launch week, oldest first. A week with no ready story is not a page. */
export function buildHomeschoolPacks<T extends PackCandidate>(
  stories: readonly T[],
  today = mountainDay(),
  kindnessForWeek?: (start: string) => HomeKindness | undefined,
): HomeschoolPack<T>[] {
  const launch = launchWeekStart();
  const current = weekStart(today);
  const buckets = new Map<string, T[]>();
  for (const story of stories) {
    if (!parseIsoDate(story.date) || !isHomeschoolReady(story)) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    const list = buckets.get(start);
    if (list) list.push(story);
    else buckets.set(start, [story]);
  }
  const packs: HomeschoolPack<T>[] = [];
  for (const [start, ready] of buckets) {
    const pack = finishPack(start, ready, today, kindnessForWeek?.(start));
    if (pack) packs.push(pack);
  }
  packs.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return packs;
}

let cache: HomeschoolPack<Story>[] | null = null;

export function getHomeschoolPacks(): HomeschoolPack<Story>[] {
  if (cache && process.env.NODE_ENV !== "development") return cache;
  const kindness = new Map(
    getKindnessChallenges().map((challenge) => [
      challenge.week,
      { home: challenge.home, path: challenge.path, storySlug: challenge.story.slug },
    ]),
  );
  const packs = buildHomeschoolPacks(getPublishedStories(), mountainDay(), (start) => kindness.get(start));
  if (process.env.NODE_ENV !== "development") cache = packs;
  return packs;
}

export function homeschoolToPrerender(packs = getHomeschoolPacks()): HomeschoolPack<Story>[] {
  if (packs.length <= MAX_PRERENDERED_WEEKS) return packs;
  return packs
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}

export function homeschoolByStart(start: string, packs = getHomeschoolPacks()): HomeschoolPack<Story> | undefined {
  return packs.find((pack) => pack.start === start);
}

function sampleStory(partial: Partial<PackCandidate> & Pick<PackCandidate, "slug" | "date">): PackCandidate {
  return {
    title: `Home story ${partial.slug}`,
    city: "Denver",
    country: "US",
    state: "CO",
    category: "animals",
    kidFriendly: true,
    kidSummary: "A short read-aloud a parent can share at home without adding anything to the report.",
    kidQuestions: ["What did the people in this story do?", "What could a family try at home?"],
    image: `/images/stories/${partial.slug}.webp`,
    imageAlt: "A photo from the homeschool pack",
    ...partial,
  };
}

function sentenceCount(value: string): number {
  return value
    .split(/(?<=[.])\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

/** Fixture checks for the helper. validate-stories calls this. */
export function assertHomeschoolPacks() {
  if (HOMESCHOOL_INDEX_PATH !== "/homeschool") throw new Error("The homeschool index should live at /homeschool.");
  if (!isHomeschoolReady(sampleStory({ slug: "ready", date: "2026-10-07" }))) {
    throw new Error("A kid-friendly story with a summary should be ready for homeschool.");
  }
  const bare = sampleStory({ slug: "bare", date: "2026-10-07", kidFriendly: false, kidSummary: undefined, kidQuestions: undefined });
  const short = sampleStory({ slug: "short", date: "2026-10-07", kidSummary: "Too short." });
  const draft = sampleStory({ slug: "draft", date: "2026-10-07", draft: true });
  if (isHomeschoolReady(bare) || isHomeschoolReady(short) || isHomeschoolReady(draft)) {
    throw new Error("A story without a usable summary should stay out of the homeschool pack.");
  }

  const summaryOnly = sampleStory({
    slug: "summary-only",
    date: "2026-10-08",
    kidQuestions: undefined,
    category: "science",
    state: "WA",
    city: "Seattle",
  });
  const strict = ["one", "two", "three"].map((slug, index) =>
    sampleStory({ slug, date: addDays("2026-10-05", index), state: index === 1 ? "UT" : "CO", category: index === 2 ? "community" : "animals" }),
  );
  const loosened = selectHomeschoolStories([...strict, summaryOnly]);
  if (loosened.length !== 4 || !loosened.some((story) => story.slug === "summary-only")) {
    throw new Error("A week under four prompt-ready stories may add a story that already has a summary.");
  }
  const full = Array.from({ length: 6 }, (_, index) =>
    sampleStory({
      slug: `full-${index}`,
      date: addDays("2026-10-05", index % 4),
      category: index % 2 === 0 ? "animals" : "science",
      state: index % 2 === 0 ? "CO" : "WA",
    }),
  );
  const capped = selectHomeschoolStories([...full, summaryOnly]);
  if (capped.length !== HOMESCHOOL_PACK_SIZE || capped.some((story) => story.slug === "summary-only")) {
    throw new Error("Four or more prompt-ready stories should fill the pack without a summary-only story.");
  }
  if (selectHomeschoolStories(full).map((story) => story.slug).join(",") !== selectPackStories(full).map((story) => story.slug).join(",")) {
    throw new Error("A full homeschool week should use the same stories as the classroom selection.");
  }

  const early = buildHomeschoolPacks([sampleStory({ slug: "early", date: "2026-09-30" })], "2026-10-20");
  if (early.length) throw new Error("A week before launch should not be a homeschool pack.");
  const future = buildHomeschoolPacks([sampleStory({ slug: "future", date: "2026-10-26" })], "2026-10-20");
  if (future.length) throw new Error("A week that has not started should not be a homeschool pack.");
  const finished = buildHomeschoolPacks(
    [sampleStory({ slug: "mon", date: "2026-10-05", category: "heroes", state: "UT", city: "Moab" })],
    "2026-10-20",
    () => ({
      home: "Write a note to someone in your home who does a job the family counts on.",
      path: "/kindness-challenge/2026-10-05",
      storySlug: "mon",
    }),
  );
  if (finished.length !== 1 || finished[0]?.path !== "/homeschool/week/2026-10-05" || finished[0].inProgress) {
    throw new Error("Homeschool packs should use the Monday of the week.");
  }
  const pack = finished[0];
  if (!pack) throw new Error("The sample homeschool pack is missing.");
  if (!pack.heading.includes("current events at home") || /lesson plan/i.test(pack.heading + pack.parentNote + pack.circle)) {
    throw new Error("Homeschool copy should stay with parents and co-ops.");
  }
  if (!pack.parentNote.includes("parent or co-op leader") || !pack.parentNote.includes("shorter than five")) {
    throw new Error("The parent note should describe a short week at home.");
  }
  if (sentenceCount(pack.circle) < 2 || sentenceCount(pack.circle) > 3) {
    throw new Error("The morning circle should be two or three sentences.");
  }
  if (!pack.challenge.includes("Write a note") || pack.challengePath !== "/kindness-challenge/2026-10-05" || !pack.challenge.includes("in this pack")) {
    throw new Error("The at-home challenge should reuse the week's kindness step when one exists.");
  }
  const fallback = buildHomeschoolPacks([sampleStory({ slug: "mon", date: "2026-10-05", category: "heroes", state: "UT", city: "Moab" })], "2026-10-20");
  if (!fallback[0]?.challenge.includes("heroes") || !fallback[0].challenge.includes("Moab") || fallback[0].challenge.includes("Home story")) {
    throw new Error("Without a kindness step, the challenge should use the week's section and place, not a headline.");
  }

  const today = mountainDay();
  const current = weekStart(today);
  const launch = launchWeekStart();
  const packs = getHomeschoolPacks();
  const published = getPublishedStories();
  const readyWeeks = new Set<string>();
  for (const story of published) {
    if (!isHomeschoolReady(story)) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    readyWeeks.add(start);
  }
  const packed = new Set(packs.map((item) => item.start));
  for (const start of readyWeeks) {
    if (!packed.has(start)) throw new Error(`${start} has a homeschool-ready story and should be a pack.`);
  }
  for (const item of packs) {
    if (!readyWeeks.has(item.start)) throw new Error(`${item.path} has no ready story.`);
    if (item.stories.length < 1 || item.stories.length > HOMESCHOOL_PACK_SIZE) throw new Error(`${item.path} should have 1 to 5 stories.`);
    if (item.start !== weekStart(item.start) || item.path !== homeschoolPackPath(item.start)) {
      throw new Error(`${item.path} should be keyed to Monday.`);
    }
    const weekStories = published.filter((story) => isHomeschoolReady(story) && weekStart(story.date) === item.start);
    const strictCount = weekStories.filter(isClassroomReady).length;
    if (strictCount >= HOMESCHOOL_TARGET && item.stories.some((story) => !isClassroomReady(story))) {
      throw new Error(`${item.path} used a summary-only story even though four prompt-ready stories exist.`);
    }
    for (const story of item.stories) {
      if ((story.kidSummary?.trim().length ?? 0) < SUMMARY_MIN) throw new Error(`${story.slug} is in a homeschool pack without a summary.`);
    }
    if (sentenceCount(item.circle) < 2 || sentenceCount(item.circle) > 3) {
      throw new Error(`${item.path} morning circle should be two or three sentences.`);
    }
  }
  const shortWeeks = packs.filter((item) => item.stories.length < HOMESCHOOL_PACK_SIZE).map((item) => `${item.start} (${item.stories.length})`);
  console.log(`Homeschool packs: ${packs.length} since ${launch}. Shorter than five: ${shortWeeks.join(", ") || "none"}.`);
}
