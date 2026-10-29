/**
 * School-day morning announcement scripts.
 *
 * A script is three kid-friendly stories from that edition date, an opening,
 * a kindness thought, and a sign-off. It is written to be read aloud in about
 * a minute. Stories with crime, violence, injury details, politics, or anything
 * scary are left out, even if a file was marked for classrooms.
 *
 * Story dates are the morning edition's calendar. "Today" uses Mountain Time,
 * the same clock as that edition. Saturday and Sunday are not school days:
 * those URLs redirect to the previous Friday, and the index lists weekdays only.
 */
import { placeLabel } from "./present";
import { absoluteUrl, publishedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { addDays, formatLongDate, mountainDay, parseIsoDate } from "./weeks";
import { siteConfig } from "@/site.config";

export const MORNING_ANNOUNCEMENTS_PATH = "/morning-announcements";

/** Spoken length of a full script. About 60 to 90 seconds at a school-PA pace. */
export const MIN_SCRIPT_WORDS = 150;
export const MAX_SCRIPT_WORDS = 220;
export const SCRIPT_STORY_COUNT = 3;
const TARGET_SCRIPT_WORDS = 185;
const SPOKEN_WORDS_PER_MINUTE = 150;

/** One page per calendar day in the archive. Past this, validation fails closed. */
export const MAX_ANNOUNCEMENT_DAYS = 2_500;

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const STORY_LEADS = ["First", "Next", "And one more"] as const;

/**
 * Abbreviations whose period is not the end of a sentence.
 * The boundary keeps "list." and "nests." from looking like "St."
 */
const ABBREVIATION = /\b(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|Inc|Ltd|No|vs|U\.S|a\.m|p\.m|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\./gi;

const KINDNESS_THOUGHTS = [
  "Kindness thought for the day: Hold the door, share a smile, or let someone go first. A small kindness can change someone's whole morning.",
  "Kindness thought for the day: Learn one new person's name and say hello. Being noticed is a real gift.",
  "Kindness thought for the day: If a classmate is sitting alone, save them a seat. Company is a kind of help.",
  "Kindness thought for the day: Thank someone who helps your school, like a bus driver, a cook, or a custodian.",
  "Kindness thought for the day: Leave a place a little nicer than you found it. Picking up one scrap of paper counts.",
  "Kindness thought for the day: When you win, cheer for the other side too. Good sportsmanship is its own good news.",
  "Kindness thought for the day: Offer a pencil, a snack, or a turn. Sharing is a way to say you belong here.",
  "Kindness thought for the day: Listen all the way through before you answer. Patience is a quiet kind of kindness.",
  "Kindness thought for the day: Write a short thank-you to someone who helped you this week. Specific thanks means more.",
  "Kindness thought for the day: If you make a mistake, own it and try to repair it. Fixing it is part of being kind.",
  "Kindness thought for the day: Invite a new student into the game. A first friend makes a school feel smaller.",
  "Kindness thought for the day: Use a kind voice in the hallway. The way you speak is something people carry with them.",
  "Kindness thought for the day: Notice something true and good about a classmate, and tell them. Praise should be real.",
  "Kindness thought for the day: Help without being asked, then let the other person have the credit.",
];

const UNSUITABLE_PATTERNS: RegExp[] = [
  /\bcancers?\b/i,
  /\bchemo(?:therapy)?\b/i,
  /\btumou?rs?\b/i,
  /\b(?:murder(?:ed|s)?|homicide|shootings?|gunshots?|gunfire|stabbed|stabbing|assault(?:ed)?|rape[ds]?|kidnapp(?:ed|ing)|abduct(?:ed|ion)?|robbery)\b/i,
  /\b(?:suicides?|overdoses?|addiction|abused|abuses|abuse|weapons?|guns?|bombings?|(?<!seed )bombs?|terrorism|terrorist)\b/i,
  /\b(?:prison|jail|arrested)\b/i,
  /\b(?:bleeding|blood)\b/i,
  /\b(?:spinal|fractures?)\b/i,
  /\b(?:neck|back|head) injury\b/i,
  /\binjur(?:y|ed|ies)\b/i,
  /\b(?:killed|killing)\b/i,
  /\b(?:passed away|funerals?)\b/i,
  /(?<!phone )\b(?:died|dead)\b/i,
  /\bwar\b/i,
  /\b(?:democrats?|republicans?|congress|senate|senators?|governors?|ballot|political|politics|politicians?)\b/i,
  /\b(?:haunted|nightmares?|horror|terrifying|frightening|scary)\b/i,
  /\b(?:floodwater|bloody)\b/i,
  /\b(?:tsunami|earthquakes?|hurricanes?|tornadoes?|tornados?|wildfires?)\b/i,
  /\bviolence\b/i,
  /\bviolent\b/i,
  /\bcrimes?\b/i,
  /\bcriminals?\b/i,
];

export type AnnouncementCandidate = {
  slug: string;
  title: string;
  shortTitle?: string;
  dek: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  place?: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  image?: string;
  imageAlt?: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  featured?: boolean;
  top5?: number;
  draft?: boolean;
};

export type ScriptStory = {
  slug: string;
  title: string;
  place: string;
  lead: string;
  blurb: string;
  sourceName: string;
  sourceUrl: string;
  line: string;
  image?: string;
  imageAlt?: string;
};

export type AnnouncementScript = {
  date: string;
  path: string;
  indexable: boolean;
  opening: string;
  kindness: string;
  signoff: string;
  stories: ScriptStory[];
  bridges: string[];
  plainText: string;
  wordCount: number;
  readSeconds: number;
  readLabel: string;
};

export type ThinAnnouncement = {
  date: string;
  path: string;
  kind: "thin";
  suitableCount: number;
  links: { slug: string; title: string }[];
};

export type AnnouncementDay =
  | { date: string; path: string; kind: "weekend"; redirectTo: string }
  | ThinAnnouncement
  | { date: string; path: string; kind: "script"; script: AnnouncementScript };

export function announcementPath(date: string): string {
  return `${MORNING_ANNOUNCEMENTS_PATH}/${date}`;
}

export function announcementSignoff(): string {
  return `That's today's good news from ${siteConfig.name}.`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function spokenSeconds(words: number): number {
  return Math.max(1, Math.round((words / SPOKEN_WORDS_PER_MINUTE) * 60));
}

export function spokenReadLabel(words: number): string {
  const seconds = spokenSeconds(words);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 1) return `About ${seconds} seconds`;
  if (rest === 0) return minutes === 1 ? "About 1 minute" : `About ${minutes} minutes`;
  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `About ${minuteLabel} ${rest} seconds`;
}

export function weekdayIndex(iso: string): number {
  const parts = parseIsoDate(iso);
  if (!parts) return -1;
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay();
}

export function weekdayName(iso: string): string {
  const index = weekdayIndex(iso);
  return index < 0 ? iso : WEEKDAY_NAMES[index];
}

export function isWeekend(iso: string): boolean {
  const index = weekdayIndex(iso);
  return index === 0 || index === 6;
}

export function previousSchoolDay(iso: string): string {
  let cursor = addDays(iso, -1);
  while (isWeekend(cursor)) cursor = addDays(cursor, -1);
  return cursor;
}

export function nextSchoolDay(iso: string): string {
  let cursor = addDays(iso, 1);
  while (isWeekend(cursor)) cursor = addDays(cursor, 1);
  return cursor;
}

/** The school day a morning page should feature. Weekends use the previous Friday. */
export function featuredSchoolDate(today: string): string {
  if (!parseIsoDate(today)) throw new Error(`Bad date ${today}`);
  return isWeekend(today) ? previousSchoolDay(today) : today;
}

export function isUnsuitableText(text: string): boolean {
  return UNSUITABLE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isSuitableAnnouncementStory(
  story: AnnouncementCandidate,
): story is AnnouncementCandidate & { kidSummary: string } {
  if (story.draft || !story.kidFriendly) return false;
  const summary = story.kidSummary?.trim();
  if (!summary) return false;
  const text = [story.title, story.shortTitle ?? "", story.dek, summary].join("\n");
  return !isUnsuitableText(text);
}

function preference(a: AnnouncementCandidate, b: AnnouncementCandidate): number {
  const tier = (story: AnnouncementCandidate) => (story.featured ? 0 : story.top5 ? 1 : 2);
  const tierGap = tier(a) - tier(b);
  if (tierGap !== 0) return tierGap;
  const rankGap = (a.top5 ?? 99) - (b.top5 ?? 99);
  if (rankGap !== 0) return rankGap;
  return a.slug.localeCompare(b.slug);
}

/** Up to three suitable stories, spread across categories, in a stable order. */
export function pickAnnouncementStories<T extends AnnouncementCandidate>(stories: T[]): T[] {
  const suitable = stories.filter(isSuitableAnnouncementStory);
  const sorted = suitable.slice().sort(preference);
  const picked: T[] = [];
  const categories = new Set<string>();
  for (const story of sorted) {
    if (picked.length === SCRIPT_STORY_COUNT) break;
    if (categories.has(story.category)) continue;
    picked.push(story);
    categories.add(story.category);
  }
  for (const story of sorted) {
    if (picked.length === SCRIPT_STORY_COUNT) break;
    if (!picked.includes(story)) picked.push(story);
  }
  return picked.sort(preference);
}

export function sentencesOf(text: string): string[] {
  const masked = text.replace(ABBREVIATION, (match) => `${match.slice(0, -1)}\u0000`);
  const parts = masked.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [masked];
  return parts.map((part) => part.replaceAll("\u0000", ".").trim()).filter(Boolean);
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function kindnessFor(date: string): string {
  const parts = parseIsoDate(date);
  if (!parts) return KINDNESS_THOUGHTS[0];
  const day = Math.floor(Date.UTC(parts.y, parts.m - 1, parts.d) / 86_400_000);
  const index = ((day % KINDNESS_THOUGHTS.length) + KINDNESS_THOUGHTS.length) % KINDNESS_THOUGHTS.length;
  return KINDNESS_THOUGHTS[index];
}

function bridgeLines(): string[] {
  return [
    `Your class can open the full stories on ${siteConfig.name} after the announcements.`,
    "Each report was checked, and the newsroom that published it is named here.",
  ];
}

function storyLine(lead: string, place: string, blurb: string, sourceName: string): string {
  return `${lead}, in ${place}: ${ensurePeriod(blurb)} ${sourceName} reported it.`;
}

type Piece = { sentences: string[]; used: number };

function assemble(
  date: string,
  stories: Array<AnnouncementCandidate & { kidSummary: string }>,
  pieces: Piece[],
  bridges: string[],
): { opening: string; kindness: string; signoff: string; lines: string[]; plainText: string; wordCount: number } {
  const opening = `Good morning. It is ${weekdayName(date)}, ${formatLongDate(date)}. Here are three pieces of good news.`;
  const kindness = kindnessFor(date);
  const signoff = announcementSignoff();
  const lines = stories.map((story, index) =>
    storyLine(STORY_LEADS[index] ?? "And one more", placeLabel(story), pieces[index].sentences.slice(0, pieces[index].used).join(" "), story.sourceName),
  );
  const plainText = [opening, ...lines, ...bridges, kindness, signoff].join("\n\n");
  return { opening, kindness, signoff, lines, plainText, wordCount: countWords(plainText) };
}

function trimToMax(sentence: string, maxWords: number): string {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return ensurePeriod(sentence);
  const cut = words.slice(0, Math.max(8, maxWords));
  while (cut.length > 8 && /^(?:and|or|but|a|an|the|to|of|in|on|for|with|that)$/i.test(cut[cut.length - 1].replace(/[.,;:]$/, ""))) {
    cut.pop();
  }
  return ensurePeriod(cut.join(" ").replace(/[,:;]+$/, ""));
}

export function buildAnnouncementScript(
  date: string,
  stories: Array<AnnouncementCandidate & { kidSummary: string }>,
): AnnouncementScript {
  if (stories.length !== SCRIPT_STORY_COUNT) {
    throw new Error(`A morning script needs ${SCRIPT_STORY_COUNT} stories.`);
  }
  const pieces: Piece[] = stories.map((story) => {
    const sentences = sentencesOf(story.kidSummary);
    return { sentences: sentences.length ? sentences : [ensurePeriod(story.dek)], used: 1 };
  });
  const bridges: string[] = [];
  let draft = assemble(date, stories, pieces, bridges);

  if (draft.wordCount > MAX_SCRIPT_WORDS) {
    let guard = 0;
    while (draft.wordCount > MAX_SCRIPT_WORDS && guard < 80) {
      guard += 1;
      let longest = 0;
      for (let index = 1; index < pieces.length; index += 1) {
        if (countWords(pieces[index].sentences[0]) > countWords(pieces[longest].sentences[0])) longest = index;
      }
      const current = pieces[longest].sentences[0];
      const next = trimToMax(current, countWords(current) - 1);
      if (next === current) break;
      pieces[longest].sentences[0] = next;
      pieces[longest].used = 1;
      draft = assemble(date, stories, pieces, bridges);
    }
  }

  let guard = 0;
  while (draft.wordCount < MAX_SCRIPT_WORDS && guard < 12) {
    guard += 1;
    let bestIndex = -1;
    let bestWords = -1;
    for (let index = 0; index < pieces.length; index += 1) {
      if (pieces[index].used >= pieces[index].sentences.length) continue;
      pieces[index].used += 1;
      const next = assemble(date, stories, pieces, bridges);
      pieces[index].used -= 1;
      if (next.wordCount > MAX_SCRIPT_WORDS) continue;
      if (bestIndex < 0 || closerToTarget(next.wordCount, bestWords)) {
        bestIndex = index;
        bestWords = next.wordCount;
      }
    }
    if (bestIndex < 0 || !closerToTarget(bestWords, draft.wordCount)) break;
    pieces[bestIndex].used += 1;
    draft = assemble(date, stories, pieces, bridges);
  }

  for (const bridge of bridgeLines()) {
    if (draft.wordCount >= MIN_SCRIPT_WORDS) break;
    const withBridge = countWords(`${draft.plainText}\n\n${bridge}`);
    if (withBridge > MAX_SCRIPT_WORDS) continue;
    bridges.push(bridge);
    draft = assemble(date, stories, pieces, bridges);
  }

  const scriptStories: ScriptStory[] = stories.map((story, index) => ({
    slug: story.slug,
    title: story.shortTitle ?? story.title,
    place: placeLabel(story),
    lead: STORY_LEADS[index] ?? "And one more",
    blurb: ensurePeriod(pieces[index].sentences.slice(0, pieces[index].used).join(" ")),
    sourceName: story.sourceName,
    sourceUrl: story.sourceUrl,
    line: draft.lines[index],
    image: story.image,
    imageAlt: story.imageAlt,
  }));

  const wordCount = draft.wordCount;
  return {
    date,
    path: announcementPath(date),
    indexable: wordCount >= MIN_SCRIPT_WORDS && wordCount <= MAX_SCRIPT_WORDS,
    opening: draft.opening,
    kindness: draft.kindness,
    signoff: draft.signoff,
    stories: scriptStories,
    bridges,
    plainText: draft.plainText,
    wordCount,
    readSeconds: spokenSeconds(wordCount),
    readLabel: spokenReadLabel(wordCount),
  };
}

function closerToTarget(candidate: number, current: number): boolean {
  if (current < 0) return true;
  const candidateIn = candidate >= MIN_SCRIPT_WORDS && candidate <= MAX_SCRIPT_WORDS;
  const currentIn = current >= MIN_SCRIPT_WORDS && current <= MAX_SCRIPT_WORDS;
  if (candidateIn !== currentIn) return candidateIn;
  if (candidateIn && currentIn) return Math.abs(candidate - TARGET_SCRIPT_WORDS) < Math.abs(current - TARGET_SCRIPT_WORDS);
  return candidate > current;
}

export function announcementSpan(
  stories: Pick<AnnouncementCandidate, "date">[],
  today = mountainDay(),
): { start: string; end: string } | undefined {
  const dates = stories.map((story) => story.date).filter((date) => parseIsoDate(date));
  if (!dates.length || !parseIsoDate(today)) return undefined;
  const sorted = dates.slice().sort();
  const start = sorted[0];
  const latest = sorted[sorted.length - 1];
  const end = latest > today ? latest : today;
  return { start, end };
}

export function datesInSpan(span: { start: string; end: string }): string[] {
  const dates: string[] = [];
  for (let cursor = span.start; cursor <= span.end; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
    if (dates.length > MAX_ANNOUNCEMENT_DAYS) break;
  }
  return dates;
}

export function resolveAnnouncementDay(date: string, stories: AnnouncementCandidate[]): AnnouncementDay | undefined {
  if (!parseIsoDate(date)) return undefined;
  const path = announcementPath(date);
  if (isWeekend(date)) {
    return { date, path, kind: "weekend", redirectTo: announcementPath(previousSchoolDay(date)) };
  }
  const published = stories.filter((story) => story.date === date && !story.draft);
  const suitable = published.filter(isSuitableAnnouncementStory);
  if (suitable.length < SCRIPT_STORY_COUNT) {
    return {
      date,
      path,
      kind: "thin",
      suitableCount: suitable.length,
      links: suitable.map((story) => ({ slug: story.slug, title: story.shortTitle ?? story.title })),
    };
  }
  const script = buildAnnouncementScript(date, pickAnnouncementStories(suitable));
  return { date, path, kind: "script", script };
}

export function listAnnouncementDays(stories: AnnouncementCandidate[], today = mountainDay()): AnnouncementDay[] {
  const span = announcementSpan(stories, today);
  if (!span) return [];
  return datesInSpan(span).flatMap((date) => {
    const day = resolveAnnouncementDay(date, stories);
    return day ? [day] : [];
  });
}

let memo: { stories: Story[]; today: string; days: AnnouncementDay[] } | null = null;

export function loadAnnouncementDays(today = mountainDay()): AnnouncementDay[] {
  const stories = getPublishedStories();
  if (memo && memo.stories === stories && memo.today === today) return memo.days;
  const days = listAnnouncementDays(stories, today);
  memo = { stories, today, days };
  return days;
}

export function indexableAnnouncementDays(days: AnnouncementDay[]): Array<Extract<AnnouncementDay, { kind: "script" }>> {
  return days.filter((day): day is Extract<AnnouncementDay, { kind: "script" }> => day.kind === "script" && day.script.indexable);
}

export function announcementJsonLd(script: AnnouncementScript) {
  const url = absoluteUrl(script.path);
  const crumbs = [
    { name: "Today", path: "/" },
    { name: "Morning announcements", path: MORNING_ANNOUNCEMENTS_PATH },
    { name: formatLongDate(script.date), path: script.path },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": `${url}#script`,
        name: `Good News Morning Announcements for ${formatLongDate(script.date)}`,
        headline: `Good News Morning Announcements for ${formatLongDate(script.date)}`,
        description: script.opening,
        url,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        learningResourceType: "Read-aloud script",
        educationalLevel: "Primary education",
        audience: {
          "@type": "EducationalAudience",
          educationalRole: "teacher",
        },
        datePublished: publishedIso(script.date),
        timeRequired: `PT${script.readSeconds}S`,
        publisher: {
          "@type": "Organization",
          name: siteConfig.owner.name,
        },
        provider: {
          "@type": "NewsMediaOrganization",
          name: siteConfig.name,
          url: siteConfig.url,
        },
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        citation: script.stories.map((story) => story.sourceUrl),
        isBasedOn: script.stories.map((story) => absoluteUrl(`/story/${story.slug}`)),
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
