/**
 * Weekly Kindness Challenge. One Monday-start page for classrooms and families,
 * tied to a story already on the site. Curated weeks live in
 * data/kindness-challenges.json. A week inside the published window with no
 * curated entry still builds: pickFallbackStory chooses a kid-friendly story
 * tagged kindness, or any kid-friendly story if none are tagged.
 *
 * Dates use the same Monday calendar as the weekly roundups.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { openGraphImage } from "./feed-image";
import { absoluteUrl, publishedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { addDays, formatWeekRange, launchWeekStart, mountainDay, parseIsoDate, weekStart } from "./weeks";
import { siteConfig } from "@/site.config";

export const KINDNESS_INDEX_PATH = "/kindness-challenge";

/** How many Mondays past the current week stay on the site. */
export const KINDNESS_LOOKAHEAD_WEEKS = 8;

export const MIN_CURATED_CHALLENGES = 10;

export const KINDNESS_TAG = "kindness";

export const KINDNESS_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const kindnessCopySchema = z
  .object({
    challenge: z.string().trim().min(40).max(200),
    why: z.string().trim().min(80).max(500),
    school: z.string().trim().min(40).max(400),
    home: z.string().trim().min(40).max(400),
    neighborhood: z.string().trim().min(40).max(400),
    teacherNote: z.string().trim().min(80).max(700),
    shareText: z.string().trim().min(40).max(280),
  })
  .strict();

const kindnessEntrySchema = kindnessCopySchema
  .extend({
    week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    storySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  })
  .strict();

const kindnessFileSchema = z
  .object({
    challenges: z.array(kindnessEntrySchema),
  })
  .strict();

export type KindnessCopy = z.infer<typeof kindnessCopySchema>;
export type KindnessEntry = z.infer<typeof kindnessEntrySchema>;

export type KindnessCandidate = {
  slug: string;
  title: string;
  kidFriendly?: boolean;
  draft?: boolean;
  tags?: readonly string[];
};

export type KindnessStatus = "this-week" | "upcoming" | "past";

export type ResolvedKindnessChallenge<T extends KindnessCandidate = Story> = KindnessCopy & {
  week: string;
  end: string;
  path: string;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  status: KindnessStatus;
  origin: "curated" | "fallback";
  story: T;
};

const FALLBACK_COPIES: KindnessCopy[] = [
  {
    challenge: "Write a thank-you note to a grown-up who helps at your school, such as a custodian, a bus driver, or a lunch helper.",
    why: "The story linked on this page is a real good-news report a teacher can read aloud. This challenge is a small, free thank-you for people you already know.",
    school: "Students write the note in class. The teacher delivers the notes to a staff member the class already knows.",
    home: "Write a note to someone in your home who does a job the family counts on.",
    neighborhood: "With a grown-up you live with, leave a thank-you at a library desk your family already uses. Stay with that grown-up.",
    teacherNote: "Read the linked story aloud, then give the class five quiet minutes to write. Deliver the notes yourself, and do not send children off alone. Do not collect a child's name, age, school, or email.",
    shareText: "This week's kindness challenge is a free thank-you note for someone who helps at school.",
  },
  {
    challenge: "Do one helpful job at home that a grown-up you live with would be glad to have finished.",
    why: "The story linked on this page is a real good-news report a teacher can read aloud. This challenge is one helpful job at home, with nothing to buy and no one new to meet.",
    school: "The class picks one shared classroom job, such as wiping a table or putting books away, and does it together.",
    home: "Choose one job a grown-up lists and finish it before you stop.",
    neighborhood: "With a grown-up you live with, tidy a shared space your own family uses. Stay together.",
    teacherNote: "Pick a job every student can do, and keep it short. Read the linked story aloud before you start. Do not send children off alone. Do not collect a child's name, age, school, or email.",
    shareText: "This week's kindness challenge is one helpful job at home for classrooms and families.",
  },
  {
    challenge: "Invite someone you already know to sit with you, play a game, or hear one kind sentence from you.",
    why: "The story linked on this page is a real good-news report a teacher can read aloud. This challenge is a way to include someone you already know, at school or at home.",
    school: "At lunch or recess, students invite a classmate they already know to sit or play with them. A student may say no.",
    home: "Teach someone you live with a game you like, and let them take the first turn.",
    neighborhood: "On an outing with a grown-up you live with, let another child in your own group go first. Stay with your grown-up.",
    teacherNote: "Keep the invitation welcome, and let a student decline. Read the linked story aloud before the class tries it. Do not send children off alone. Do not collect a child's name, age, school, or email.",
    shareText: "This week's kindness challenge is including someone you already know at lunch, at a game, or with one kind sentence.",
  },
  {
    challenge: "Draw a bright picture and give it to someone in your class or in your home.",
    why: "The story linked on this page is a real good-news report a teacher can read aloud. A drawing is a free way to share something cheerful with people you already know.",
    school: "Students draw in class and give the picture to a classmate or a teacher they already know.",
    home: "Tape the drawing on the fridge or leave it where someone in your home will see it.",
    neighborhood: "With a grown-up you live with, notice one cheerful thing on a walk and add it to the drawing at home. Stay together.",
    teacherNote: "Keep the pictures cheerful. Read the linked story aloud before the class draws. Do not send children off alone. Do not collect a child's name, age, school, or email.",
    shareText: "This week's kindness challenge is a bright drawing for someone in your class or in your home.",
  },
];

function dataPath(): string {
  return path.join(process.cwd(), "data", "kindness-challenges.json");
}

function dayNumber(iso: string): number {
  const parts = parseIsoDate(iso);
  if (!parts) return 0;
  return Math.floor(Date.UTC(parts.y, parts.m - 1, parts.d) / 86_400_000);
}

export function isOneSentence(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.endsWith(".")) return false;
  return !/[.!?]/.test(trimmed.slice(0, -1));
}

export function formatChallengeDay(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  return `${SHORT_MONTHS[parts.m - 1]} ${parts.d}`;
}

export function kindnessStatus(week: string, today: string): KindnessStatus {
  const start = weekStart(today);
  if (week === start) return "this-week";
  if (week > start) return "upcoming";
  return "past";
}

/** Mondays from launch week through the lookahead, oldest first. */
export function challengeWeekStarts(today = mountainDay()): string[] {
  const first = launchWeekStart();
  const current = weekStart(today);
  const anchor = current < first ? first : current;
  const last = addDays(anchor, KINDNESS_LOOKAHEAD_WEEKS * 7);
  const weeks: string[] = [];
  for (let cursor = first; cursor <= last; cursor = addDays(cursor, 7)) weeks.push(cursor);
  return weeks;
}

/**
 * The first Monday from launch that has no curated entry.
 * When the open window is full, this is the Monday after it, so the daily job
 * can prepare the following week.
 */
export function nextUncuratedWeek(weeks: readonly string[], today = mountainDay()): string {
  const have = new Set(weeks);
  const open = challengeWeekStarts(today);
  const horizon = open[open.length - 1] ?? launchWeekStart();
  const lastCurated = weeks.length ? [...weeks].sort().at(-1) : undefined;
  const end = lastCurated && lastCurated > horizon ? lastCurated : horizon;
  for (let cursor = launchWeekStart(); cursor <= end; cursor = addDays(cursor, 7)) {
    if (!have.has(cursor)) return cursor;
  }
  return addDays(end, 7);
}

export function kindnessPool<T extends KindnessCandidate>(stories: readonly T[], preferKindness = true): T[] {
  const published = stories.filter((story) => story.kidFriendly && !story.draft);
  const kind = published.filter((story) => story.tags?.includes(KINDNESS_TAG));
  const pool = preferKindness && kind.length ? kind : published;
  return pool.slice().sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Stable pick for a Monday. Kindness-tagged classroom stories win when any exist. */
export function pickFallbackStory<T extends KindnessCandidate>(
  stories: readonly T[],
  week: string,
  used: ReadonlySet<string> = new Set(),
): T | undefined {
  const pool = kindnessPool(stories, true);
  const fresh = pool.filter((story) => !used.has(story.slug));
  const source = fresh.length ? fresh : pool;
  if (!source.length) return undefined;
  return source[Math.abs(dayNumber(week)) % source.length];
}

export function fallbackCopy(week: string): KindnessCopy {
  return FALLBACK_COPIES[Math.abs(dayNumber(week)) % FALLBACK_COPIES.length];
}

export function loadCuratedKindnessChallenges(): KindnessEntry[] {
  const file = dataPath();
  if (!fs.existsSync(file)) {
    throw new Error(`Missing kindness challenges at ${file}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not parse JSON";
    throw new Error(`data/kindness-challenges.json: ${message}`);
  }
  const parsed = kindnessFileSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`data/kindness-challenges.json: ${details}`);
  }
  return parsed.data.challenges;
}

export function kindnessProblems(
  entries: readonly KindnessEntry[],
  stories: readonly KindnessCandidate[],
  minCount = 0,
): string[] {
  const problems: string[] = [];
  if (entries.length < minCount) {
    problems.push(`Add at least ${minCount} curated kindness challenges. Found ${entries.length}.`);
  }
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const seen = new Set<string>();
  const launch = launchWeekStart();
  for (const entry of entries) {
    const label = entry.week || "(missing week)";
    if (seen.has(entry.week)) problems.push(`${label}: duplicate week`);
    seen.add(entry.week);
    if (!parseIsoDate(entry.week) || weekStart(entry.week) !== entry.week) {
      problems.push(`${label}: week must be a Monday, YYYY-MM-DD`);
    } else if (entry.week < launch) {
      problems.push(`${label}: week is before the launch week ${launch}`);
    }
    if (!isOneSentence(entry.challenge)) {
      problems.push(`${label}: challenge must be one sentence ending in a period`);
    }
    if (/\bstrangers?\b/i.test(entry.challenge)) {
      problems.push(`${label}: the challenge sentence must not send children to strangers`);
    }
    if (!/\bgrown-up\b/i.test(entry.neighborhood)) {
      problems.push(`${label}: the neighborhood step must keep a child with a grown-up`);
    }
    if (!/email/i.test(entry.teacherNote)) {
      problems.push(`${label}: the teacher note must say not to collect a child's email`);
    }
    const story = bySlug.get(entry.storySlug);
    if (!story || story.draft) {
      problems.push(`${label}: story ${entry.storySlug} is not a published story`);
      continue;
    }
    if (!story.kidFriendly) {
      problems.push(`${label}: story ${entry.storySlug} must be kidFriendly`);
    }
    if (entry.shareText.includes(story.title)) {
      problems.push(`${label}: share text should stay spoiler-free and must not repeat the story headline`);
    }
  }
  return problems;
}

function present<T extends KindnessCandidate>(
  week: string,
  copy: KindnessCopy,
  story: T,
  origin: ResolvedKindnessChallenge<T>["origin"],
  today: string,
): ResolvedKindnessChallenge<T> {
  const end = addDays(week, 6);
  const rangeLabel = formatWeekRange(week, end);
  const status = kindnessStatus(week, today);
  const title = status === "this-week" ? `This Week's Kindness Challenge: ${rangeLabel}` : `Kindness Challenge: ${rangeLabel}`;
  const heading =
    status === "this-week"
      ? "This week's kindness challenge."
      : status === "upcoming"
        ? `Coming up: ${rangeLabel}.`
        : `Kindness challenge: ${rangeLabel}.`;
  return {
    ...copy,
    week,
    end,
    path: `${KINDNESS_INDEX_PATH}/${week}`,
    rangeLabel,
    title,
    heading,
    description: `${copy.challenge} For classrooms and families.`,
    status,
    origin,
    story,
  };
}

export function resolveKindnessWeek<T extends KindnessCandidate>(
  week: string,
  curated: readonly KindnessEntry[],
  stories: readonly T[],
  today: string,
): ResolvedKindnessChallenge<T> | undefined {
  const entry = curated.find((item) => item.week === week);
  if (entry) {
    const story = stories.find((item) => item.slug === entry.storySlug && !item.draft);
    if (!story) {
      throw new Error(`Kindness challenge ${week} points at missing story ${entry.storySlug}.`);
    }
    const copy: KindnessCopy = {
      challenge: entry.challenge,
      why: entry.why,
      school: entry.school,
      home: entry.home,
      neighborhood: entry.neighborhood,
      teacherNote: entry.teacherNote,
      shareText: entry.shareText,
    };
    return present(week, copy, story, "curated", today);
  }
  const used = new Set(curated.map((item) => item.storySlug));
  const story = pickFallbackStory(stories, week, used);
  if (!story) return undefined;
  const copy = fallbackCopy(week);
  const shareText = copy.shareText.includes(story.title)
    ? "A free kindness challenge for classrooms and families is ready for this week."
    : copy.shareText;
  return present(week, { ...copy, shareText }, story, "fallback", today);
}

export function draftFallbackChallenge<T extends KindnessCandidate>(
  week: string,
  stories: readonly T[],
  used: ReadonlySet<string> = new Set(),
): (KindnessEntry & { story: T }) | undefined {
  const story = pickFallbackStory(stories, week, used);
  if (!story) return undefined;
  const copy = fallbackCopy(week);
  const shareText = copy.shareText.includes(story.title)
    ? "A free kindness challenge for classrooms and families is ready for this week."
    : copy.shareText;
  return { week, storySlug: story.slug, ...copy, shareText, story };
}

export function buildKindnessChallenges<T extends KindnessCandidate>(
  curated: readonly KindnessEntry[],
  stories: readonly T[],
  today = mountainDay(),
): ResolvedKindnessChallenge<T>[] {
  const problems = kindnessProblems(curated, stories, MIN_CURATED_CHALLENGES);
  if (problems.length) {
    throw new Error(`Kindness challenges failed:\n- ${problems.join("\n- ")}`);
  }
  const resolved: ResolvedKindnessChallenge<T>[] = [];
  for (const week of challengeWeekStarts(today)) {
    const challenge = resolveKindnessWeek(week, curated, stories, today);
    if (challenge) resolved.push(challenge);
  }
  return resolved;
}

let cached: ResolvedKindnessChallenge[] | null = null;

export function getKindnessChallenges(): ResolvedKindnessChallenge[] {
  if (process.env.NODE_ENV === "production" && cached) return cached;
  const challenges = buildKindnessChallenges(loadCuratedKindnessChallenges(), getPublishedStories());
  cached = challenges;
  return challenges;
}

export function thisWeeksChallenge(
  challenges = getKindnessChallenges(),
  today = mountainDay(),
): ResolvedKindnessChallenge | undefined {
  const start = weekStart(today);
  return challenges.find((item) => item.week === start) ?? challenges.find((item) => item.week > start) ?? challenges.at(-1);
}

export function challengesForStory(slug: string, challenges = getKindnessChallenges()): ResolvedKindnessChallenge[] {
  return challenges.filter((item) => item.story.slug === slug).slice().reverse();
}

export function kindnessJsonLd(challenge: ResolvedKindnessChallenge) {
  const url = absoluteUrl(challenge.path);
  const image = openGraphImage(challenge.story);
  const crumbs = [
    { name: "Today", path: "/" },
    { name: "Kindness Challenge", path: KINDNESS_INDEX_PATH },
    { name: challenge.rangeLabel, path: challenge.path },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": `${url}#challenge`,
        name: challenge.title,
        headline: challenge.heading,
        description: challenge.description,
        url,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        learningResourceType: "Activity",
        educationalUse: "group work",
        educationalLevel: "Elementary",
        teaches: "Kindness",
        timeRequired: "P7D",
        datePublished: publishedIso(challenge.week),
        image: absoluteUrl(image.url),
        thumbnailUrl: absoluteUrl(image.url),
        audience: [
          { "@type": "EducationalAudience", educationalRole: "teacher" },
          { "@type": "PeopleAudience", suggestedMinAge: 6, suggestedMaxAge: 12 },
        ],
        isBasedOn: [absoluteUrl(`/story/${challenge.story.slug}`), challenge.story.sourceUrl],
        citation: challenge.story.sourceUrl,
        publisher: {
          "@type": "Organization",
          name: siteConfig.owner.name,
          email: siteConfig.contactEmail,
          url: absoluteUrl("/about"),
        },
        provider: {
          "@type": "NewsMediaOrganization",
          name: siteConfig.name,
          url: siteConfig.url,
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

function sampleEntry(week: string, storySlug: string): KindnessEntry {
  return { week, storySlug, ...FALLBACK_COPIES[0] };
}

/** Fixture checks for the helper. validate-stories calls this. */
export function assertKindnessHelpers() {
  const kind = { slug: "kind-note", title: "Xylophone kindness report", kidFriendly: true, tags: ["kindness"] };
  const animal = { slug: "animal-owl", title: "Xylophone owl report", kidFriendly: true, tags: ["animals"] };
  const plain = { slug: "plain-news", title: "Xylophone plain report", kidFriendly: false, tags: ["kindness"] };

  const picked = pickFallbackStory([animal, plain, kind], "2026-10-05");
  const again = pickFallbackStory([kind, animal, plain], "2026-10-05");
  if (picked?.slug !== "kind-note" || again?.slug !== picked.slug) {
    throw new Error("Fallback should prefer one stable kid-friendly kindness story.");
  }
  if (pickFallbackStory([animal, plain], "2026-10-12")?.slug !== "animal-owl") {
    throw new Error("Fallback should use a kid-friendly story when none are tagged kindness.");
  }
  if (pickFallbackStory([plain], "2026-10-12")) {
    throw new Error("A story that is not kid-friendly should not become the challenge.");
  }

  const missing = kindnessProblems([sampleEntry("2026-10-05", "missing-slug")], [kind], 0);
  if (!missing.some((line) => line.includes("missing-slug"))) {
    throw new Error("A missing story slug should fail the kindness check.");
  }
  if (!kindnessProblems([sampleEntry("2026-10-06", "kind-note")], [kind], 0).length) {
    throw new Error("A kindness week has to start on Monday.");
  }
  if (!kindnessProblems([sampleEntry("2026-09-28", "kind-note")], [kind], 0).length) {
    throw new Error("A kindness week before launch should fail.");
  }
  if (!kindnessProblems([sampleEntry("2026-10-05", "kind-note"), sampleEntry("2026-10-05", "kind-note")], [kind], 0).length) {
    throw new Error("Duplicate kindness weeks should fail.");
  }
  if (!kindnessProblems([sampleEntry("2026-10-05", "plain-news")], [plain], 0).length) {
    throw new Error("A kindness challenge needs a kid-friendly story.");
  }
  const ok = kindnessProblems([sampleEntry("2026-10-05", "kind-note")], [kind], 0);
  if (ok.length) throw new Error(`A valid kindness entry should pass: ${ok.join("; ")}`);

  const fallback = resolveKindnessWeek("2026-11-02", [], [kind, animal], "2026-10-28");
  if (!fallback || fallback.origin !== "fallback" || fallback.story.slug !== "kind-note") {
    throw new Error("A week with no curated entry should auto-pick a kindness story.");
  }
  const curated = resolveKindnessWeek("2026-10-05", [sampleEntry("2026-10-05", "kind-note")], [kind, animal], "2026-10-28");
  if (!curated || curated.origin !== "curated" || curated.path !== "/kindness-challenge/2026-10-05") {
    throw new Error("A curated week should keep its story and Monday path.");
  }
  for (const copy of FALLBACK_COPIES) {
    const problems = kindnessProblems([{ week: "2026-10-05", storySlug: "kind-note", ...copy }], [kind], 0);
    if (problems.length) throw new Error(`Fallback copy should be valid: ${problems.join("; ")}`);
  }
  if (nextUncuratedWeek(["2026-10-05", "2026-10-19"], "2026-10-28") !== "2026-10-12") {
    throw new Error("The next kindness week should be the first missing Monday.");
  }
  const filled = challengeWeekStarts("2026-10-28");
  if (nextUncuratedWeek(filled, "2026-10-28") !== addDays(filled[filled.length - 1] ?? "2026-10-05", 7)) {
    throw new Error("When every open week is curated, the script should offer the following Monday.");
  }
}
