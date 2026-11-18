/**
 * Weekly bulletin packs for congregation newsletters.
 * Weeks use the same Monday start as /week.
 *
 * A story has to clear the classroom mark (kidFriendly, with a read-aloud)
 * and the morning-announcement block on crime, violence, politics, injury,
 * and disasters. Faith pages add a second pass: allow kindness, community,
 * service, volunteer, animal, and neighbor stories, and refuse scripture,
 * theology, and illness with a bad outcome. The page does not add religious language.
 */
import { getCategory } from "./categories";
import { currentHelp } from "./follow-ups";
import { isUnsuitableText } from "./morning-announcements";
import { placeLabel } from "./present";
import { absoluteUrl, publishedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import type { HelpLink } from "./story-schema";
import { escapeHtml } from "./tip-mail";
import { thanksgivingIso } from "./table-talk";
import {
  MAX_PRERENDERED_WEEKS,
  addDays,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";
import { GIVING_TUESDAY_PATH } from "./giving-tuesday";
import { THANKS_PATH } from "./thanks";
import { siteConfig } from "@/site.config";

export const FAITH_INDEX_PATH = "/faith";
export const FAITH_FEED_PATH = "/faith/rss.xml";
export const FAITH_INDEX_TITLE = "Good News for Faith Communities";
export const FAITH_INDEX_DESCRIPTION =
  "A free weekly bulletin pack of gentle good news for church, synagogue, mosque, temple, and other congregation newsletters, plus small groups and youth leaders. Non-sectarian, with no scripture and no politics.";

export const FAITH_STORY_TARGET = 5;
export const FAITH_STORY_MIN = 3;

const ALLOW_CATEGORIES = new Set(["community", "animals"]);

/**
 * Tags that can qualify a story outside Community and Animals.
 * Classroom words such as students or farming are not enough on their own.
 */
const CORE_TAGS = new Set([
  "animal-rescue",
  "dogs",
  "cats",
  "birds",
  "horses",
  "wildlife-conservation",
  "sea-turtles",
  "pet-adoption",
  "zoos",
  "parks",
  "trees",
  "rivers",
  "community-garden",
  "cleanups",
  "libraries",
  "literacy",
  "little-free-libraries",
  "food-banks",
  "community-meals",
  "food-rescue",
  "kindness",
  "volunteers",
  "neighbors",
  "seniors",
  "therapy-animals",
  "service-dogs",
  "pollinators",
  "toys",
  "winter-clothes",
  "school-lunch",
  "home-repairs",
  "housing",
  "playgrounds",
  "inclusion",
  "accessibility",
]);

/** Topics a bulletin should not carry even when a file was marked for classrooms. */
const DENY_TAGS = new Set([
  "cancer-support",
  "medical-research",
  "public-health",
  "first-responders",
  "firefighters",
  "police",
  "ems",
  "dispatch",
  "search-and-rescue",
]);

const FAITH_DENY_TEXT: RegExp[] = [
  /\b(?:scriptures?|theolog(?:y|ies|ical)|sermons?|bibles?|qur['’]?ans?|torah|gospels?|denominations?|missionar(?:y|ies)|proselyt(?:e|ize|izing|ising)?|worship(?:ping|ed|s)?)\b/i,
  /\b(?:pray(?:ers?|ing|ed)?)\b/i,
  /\b(?:gods?|jesus|allah|buddha|christs?)\b/i,
  /\b(?:disasters?|evacuat(?:ed|ion|ions)|landslides?|mudslides?|fires?|blazes?)\b/i,
  /\b(?:illness(?:es)?|diseases?|diagnosed|terminal|hospice)\b/i,
];

const PROMPT_POOL = [
  "Who is a quiet helper in our community?",
  "What is one free thing our group could do this week that a neighbor would notice?",
  "Which story would you want a young person to hear, and what should they remember?",
  "Where did someone make room for an animal, a neighbor, or a newcomer?",
  "What would it look like to try one small part of a story where we live?",
  "Who usually does the work that nobody applauds?",
  "What is a kindness that costs time instead of money?",
  "How could a youth group try the free version of this week's service idea?",
];

const HELP_RANK: Record<HelpLink["kind"], number> = {
  volunteer: 3,
  thank: 2,
  learn: 1,
  donate: 0,
};

export type FaithCandidate = {
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
  tags?: string[];
  sourceName: string;
  sourceUrl: string;
  image: string;
  imageAlt: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  howToHelp: HelpLink[];
  updates?: Story["updates"];
  draft?: boolean;
};

export type FaithServiceIdea = {
  slug: string;
  place: string;
  sentence: string;
  text: string;
  href: string;
  linkLabel: string;
  paid: false;
};

export type FaithBulletin<T extends FaithCandidate = FaithCandidate> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  stories: T[];
  items: { slug: string; sentence: string; sourceName: string; sourceUrl: string; storyUrl: string }[];
  plainText: string;
  html: string;
  service: FaithServiceIdea;
  prompts: string[];
  image: string;
  imageAlt: string;
  latest: string;
};

export type FaithSeasonLink = { href: string; label: string };

export function faithPath(start: string): string {
  return `${FAITH_INDEX_PATH}/${start}`;
}

export function faithTextBlocked(text: string): boolean {
  if (isUnsuitableText(text)) return true;
  return FAITH_DENY_TEXT.some((pattern) => pattern.test(text));
}

export function isFaithStory(story: FaithCandidate): story is FaithCandidate & { kidSummary: string } {
  if (story.draft || !story.kidFriendly) return false;
  const summary = story.kidSummary?.trim() ?? "";
  if (summary.length < 40) return false;
  const tags = story.tags ?? [];
  if (tags.some((tag) => DENY_TAGS.has(tag))) return false;
  const allowed = ALLOW_CATEGORIES.has(story.category) || tags.some((tag) => CORE_TAGS.has(tag));
  if (!allowed) return false;
  const text = [story.title, story.shortTitle ?? "", story.dek, summary, tags.join(" ")].join("\n");
  return !faithTextBlocked(text);
}

function byNewest<T extends FaithCandidate>(a: T, b: T): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

function placeKey(story: FaithCandidate): string {
  if (story.country === "US") return `US-${story.state || story.city}`;
  return story.country;
}

function diversityScore(story: FaithCandidate, picked: FaithCandidate[]): number {
  const categories = new Set(picked.map((item) => item.category));
  const places = new Set(picked.map(placeKey));
  let score = 0;
  if (!categories.has(story.category)) score += 2;
  if (!places.has(placeKey(story))) score += 1;
  const help = bestFreeHelp(story);
  if (help) score += HELP_RANK[help.kind];
  return score;
}

function bestFreeHelp(story: FaithCandidate): HelpLink | undefined {
  const links = currentHelp(story).links.filter((link) => link.kind !== "donate");
  return links.slice().sort((a, b) => HELP_RANK[b.kind] - HELP_RANK[a.kind] || a.label.localeCompare(b.label))[0];
}

/** Up to five gentle stories. A short week is not padded with stories that failed the filter. */
export function selectFaithStories<T extends FaithCandidate>(stories: T[]): T[] {
  const ready = stories.filter(isFaithStory).slice().sort(byNewest);
  if (!ready.length) return [];
  const picked: T[] = [];
  const used = new Set<string>();
  while (picked.length < FAITH_STORY_TARGET) {
    let best: T | undefined;
    let bestScore = -1;
    for (const story of ready) {
      if (used.has(story.slug)) continue;
      const score = diversityScore(story, picked);
      if (!best || score > bestScore || (score === bestScore && byNewest(story, best) < 0)) {
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

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

const ABBREVIATION = /\b(?:Dr|Mr|Mrs|Ms|Lt|Sgt|Capt|Col|Gen|St|Jr|Sr|Inc|Ltd|No|vs|U\.S|D\.C|a\.m|p\.m|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\./gi;

function faithSentences(text: string): string[] {
  const masked = text.replace(ABBREVIATION, (match) => `${match.slice(0, -1)}\u0000`);
  const parts = masked.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [masked];
  return parts.map((part) => part.replaceAll("\u0000", ".").trim()).filter(Boolean);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const TITLE_SKIP = new Set(["about", "after", "their", "there", "which", "where", "while", "would", "could", "should", "first", "years", "story"]);

/** One or two deck sentences that still name what the headline is about. */
export function faithSentence(story: Pick<FaithCandidate, "title" | "kidSummary" | "dek">): string {
  const source = story.dek.trim() || story.kidSummary?.trim() || "";
  const sentences = faithSentences(source);
  const first = sentences[0] || source;
  const titleWords = story.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5 && !TITLE_SKIP.has(word));
  const shares = (sentence: string) => titleWords.some((word) => sentence.toLowerCase().includes(word));
  const second = sentences[1];
  const pair = second ? `${ensurePeriod(first)} ${second}` : first;
  const chosen = second && wordCount(pair) <= 55 && (!shares(first) || wordCount(first) < 12) ? pair : first;
  return ensurePeriod(chosen.replace(/\s+/g, " "));
}

function creditsOutlet(sentence: string, sourceName: string): boolean {
  const lower = sentence.toLowerCase();
  const name = sourceName.toLowerCase().trim();
  if (name && lower.includes(name)) return true;
  const skip = new Set(["news", "local", "times", "post", "daily", "press", "herald", "area", "service", "county", "city", "state"]);
  const tokens = name.split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !skip.has(word));
  if (!tokens.length) return false;
  const distinctive = tokens.sort((a, b) => b.length - a.length)[0];
  return lower.includes(distinctive);
}

function creditedSentence(story: FaithCandidate): string {
  const sentence = faithSentence(story);
  const source = story.sourceName.trim();
  if (creditsOutlet(sentence, source)) return sentence;
  return `${sentence} ${source} reported it.`;
}

function dayNumber(iso: string): number {
  const parts = parseIsoDate(iso);
  if (!parts) return 0;
  return Math.floor(Date.UTC(parts.y, parts.m - 1, parts.d) / 86_400_000);
}

export function faithPrompts(start: string): string[] {
  const offset = ((dayNumber(start) % PROMPT_POOL.length) + PROMPT_POOL.length) % PROMPT_POOL.length;
  const prompts = [PROMPT_POOL[0]];
  for (let step = 1; prompts.length < 3; step += 1) {
    const next = PROMPT_POOL[(offset + step) % PROMPT_POOL.length];
    if (!prompts.includes(next)) prompts.push(next);
  }
  return prompts;
}

function freeAct(story: FaithCandidate): string {
  const tags = new Set(story.tags ?? []);
  if (story.category === "animals" || tags.has("animal-rescue") || tags.has("pet-adoption") || tags.has("dogs") || tags.has("cats")) {
    return "Spend an hour with a shelter, a foster, or a neighbor's animal. Call first.";
  }
  if (tags.has("food-banks") || tags.has("community-meals") || tags.has("food-rescue") || tags.has("school-lunch")) {
    return "Pack an extra meal, or a bag of groceries, for a pantry that already takes food.";
  }
  if (tags.has("libraries") || tags.has("literacy") || tags.has("little-free-libraries")) {
    return "Leave a book where a neighbor can take it, or ask a library if they need an hour of help.";
  }
  if (tags.has("cleanups") || tags.has("parks") || tags.has("trails")) {
    return "Spend an hour picking up litter in a park or on a block you already walk.";
  }
  return "Give an hour this week to the same kind of help, close to home, at no cost.";
}

export function faithServiceIdea<T extends FaithCandidate>(stories: T[]): FaithServiceIdea {
  const ranked = stories
    .map((story) => ({ story, help: bestFreeHelp(story) }))
    .sort((a, b) => (HELP_RANK[b.help?.kind ?? "donate"] ?? 0) - (HELP_RANK[a.help?.kind ?? "donate"] ?? 0));
  const chosen = ranked[0];
  const story = chosen?.story ?? stories[0];
  const place = placeLabel(story);
  const sentence = creditedSentence(story);
  const lead = faithSentences(sentence)[0] || sentence;
  const help = chosen?.help;
  if (help) {
    const verb = help.kind === "volunteer" ? "A free way to take part" : help.kind === "thank" ? "A free thank-you" : "A free next step";
    return {
      slug: story.slug,
      place,
      sentence,
      text: `${lead} ${verb}: ${help.label}. This idea does not ask for a donation to ${siteConfig.name}.`,
      href: help.url,
      linkLabel: help.label,
      paid: false,
    };
  }
  return {
    slug: story.slug,
    place,
    sentence,
    text: `${lead} ${freeAct(story)} This idea does not ask for a donation to ${siteConfig.name}.`,
    href: absoluteUrl(`/story/${story.slug}#how-to-help`),
    linkLabel: "How to help on the full story",
    paid: false,
  };
}

function bulletinIntro(rangeLabel: string): string {
  return `Good news for the week of ${rangeLabel}. Summaries are from ${siteConfig.name}. The reporting belongs to the newsrooms linked here. Free to paste into a bulletin, newsletter, or small-group note.`;
}

export function faithPlainText(bulletin: Pick<FaithBulletin, "rangeLabel" | "items" | "path">): string {
  const lines = bulletin.items.map((item, index) => {
    return `${index + 1}. ${item.sentence} ${item.sourceName}: ${item.sourceUrl} ${siteConfig.name}: ${item.storyUrl}`;
  });
  return [bulletinIntro(bulletin.rangeLabel), ...lines, absoluteUrl(bulletin.path)].join("\n\n");
}

export function faithHtml(bulletin: Pick<FaithBulletin, "rangeLabel" | "items" | "path">): string {
  const items = bulletin.items
    .map((item) => {
      return `  <li>${escapeHtml(item.sentence)} <a href="${escapeHtml(item.sourceUrl)}">${escapeHtml(item.sourceName)}</a>. <a href="${escapeHtml(item.storyUrl)}">On ${escapeHtml(siteConfig.name)}</a>.</li>`;
    })
    .join("\n");
  const home = absoluteUrl("/");
  const page = absoluteUrl(bulletin.path);
  return `<p><strong>${escapeHtml(bulletinIntro(bulletin.rangeLabel))}</strong></p>\n<ol>\n${items}\n</ol>\n<p><a href="${escapeHtml(home)}">${escapeHtml(siteConfig.name)}</a> · <a href="${escapeHtml(page)}">This week's bulletin</a></p>`;
}

/** Thanksgiving through December 31, in the edition's calendar. */
export function faithGratitudeSeason(day = mountainDay()): boolean {
  const parts = parseIsoDate(day);
  if (!parts) return false;
  const start = thanksgivingIso(parts.y);
  return day >= start && day <= `${parts.y}-12-31`;
}

export function faithSeasonLinks(): FaithSeasonLink[] {
  return [
    { href: THANKS_PATH, label: "50 States of Thanks" },
    { href: GIVING_TUESDAY_PATH, label: "Giving Tuesday" },
  ];
}

function finishBulletin<T extends FaithCandidate>(start: string, ready: T[], today: string): FaithBulletin<T> | undefined {
  const stories = selectFaithStories(ready);
  if (stories.length < FAITH_STORY_MIN) return undefined;
  const end = addDays(start, 6);
  const inProgress = start === weekStart(today);
  const rangeLabel = formatWeekRange(start, end);
  const path = faithPath(start);
  const items = stories.map((story) => ({
    slug: story.slug,
    sentence: creditedSentence(story),
    sourceName: story.sourceName,
    sourceUrl: story.sourceUrl,
    storyUrl: absoluteUrl(`/story/${story.slug}`),
  }));
  const photo = stories[0];
  const latest = stories.reduce((max, story) => (story.date > max ? story.date : max), stories[0].date);
  const count = stories.length;
  const draft: FaithBulletin<T> = {
    start,
    end,
    path,
    inProgress,
    rangeLabel,
    title: inProgress
      ? `Good News for Faith Communities, So Far: ${rangeLabel}`
      : `Good News for Faith Communities: ${rangeLabel}`,
    heading: inProgress ? "Good news for faith communities, so far." : "Good news for faith communities.",
    description: `${count} gentle ${count === 1 ? "story" : "stories"} for a congregation bulletin, the week of ${rangeLabel}. Kindness, community, service, and animals. No scripture, no politics, and no donation ask.`,
    intro: inProgress
      ? `${count} stories from this week so far, chosen for a bulletin, a small group, or a youth circle.`
      : `${count} stories from the week of ${rangeLabel}, chosen for a bulletin, a small group, or a youth circle.`,
    stories,
    items,
    plainText: "",
    html: "",
    service: faithServiceIdea(stories),
    prompts: faithPrompts(start),
    image: photo.image,
    imageAlt: photo.imageAlt,
    latest,
  };
  draft.plainText = faithPlainText(draft);
  draft.html = faithHtml(draft);
  return draft;
}

export function buildFaithBulletins<T extends FaithCandidate>(stories: T[], today = mountainDay()): FaithBulletin<T>[] {
  const launch = launchWeekStart();
  const current = weekStart(today);
  const buckets = new Map<string, T[]>();
  for (const story of stories) {
    if (story.draft || !parseIsoDate(story.date) || !isFaithStory(story)) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    const list = buckets.get(start);
    if (list) list.push(story);
    else buckets.set(start, [story]);
  }
  const bulletins: FaithBulletin<T>[] = [];
  for (const [start, ready] of buckets) {
    const bulletin = finishBulletin(start, ready, today);
    if (bulletin) bulletins.push(bulletin);
  }
  bulletins.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return bulletins;
}

let cache: FaithBulletin<Story>[] | null = null;

export function getFaithBulletins(): FaithBulletin<Story>[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const bulletins = buildFaithBulletins(getPublishedStories());
  cache = bulletins;
  return bulletins;
}

export function bulletinsToPrerender(bulletins = getFaithBulletins()): FaithBulletin<Story>[] {
  if (bulletins.length <= MAX_PRERENDERED_WEEKS) return bulletins;
  return bulletins
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

/** Finished weeks only. The open week stays off the feed until Sunday is over. */
export function renderFaithRss(bulletins: FaithBulletin[] = getFaithBulletins()): string {
  const finished = bulletins.filter((bulletin) => !bulletin.inProgress).sort((a, b) => (a.start < b.start ? 1 : -1));
  const self = absoluteUrl(FAITH_FEED_PATH);
  const channelLink = absoluteUrl(FAITH_INDEX_PATH);
  const updated = finished[0] ? new Date(publishedIso(addDays(finished[0].end, 1))).toUTCString() : new Date().toUTCString();
  const items = finished
    .map((bulletin) => {
      const link = absoluteUrl(bulletin.path);
      const image = absoluteUrl(bulletin.image);
      return `<item>
      <title>${escapeXml(bulletin.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(publishedIso(addDays(bulletin.end, 1))).toUTCString()}</pubDate>
      <description>${escapeXml(bulletin.intro)}</description>
      <content:encoded>${cdata(bulletin.html)}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      <media:content url="${escapeXml(image)}" medium="image" type="image/webp">
        <media:title>${escapeXml(bulletin.title)}</media:title>
        <media:description>${escapeXml(bulletin.imageAlt)}</media:description>
      </media:content>
      <enclosure url="${escapeXml(image)}" type="image/webp" />
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`${siteConfig.name}: Good News for Faith Communities`)}</title>
    <link>${channelLink}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml("Weekly bulletin packs of gentle good news for congregation newsletters. One item per finished week.")}</description>
    <language>en-us</language>
    <lastBuildDate>${updated}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

export function faithCategoryLabel(slug: string): string {
  return getCategory(slug)?.label ?? slug;
}
