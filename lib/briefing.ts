/**
 * Spoken daily briefing.
 *
 * The latest edition uses `getTop5`, the same five stories as the homepage
 * and the daily email. Ranks are unique across the archive, so that set can
 * include a story filed on an earlier date.
 *
 * Each earlier date with at least five published stories uses the same
 * per-day selector as the web story (`selectWebStoryStories`): ranked stories
 * first, then the rest of that date. A date with fewer than five stories is
 * not a page, not a feed item, and not in the sitemap.
 *
 * The Alexa JSON feed is text-to-speech only. Amazon's feed reference
 * (checked February 8, 2024) says a text item must be fewer than 4,500
 * characters, a feed may contain at most five items, and items older than
 * seven days are ignored. Items that would repeat a story already spoken in
 * a newer item are left out.
 */
import { sentencesOf, spokenReadLabel, weekdayName } from "./morning-announcements";
import { placeLabel } from "./present";
import { absoluteUrl, publishedIso, storyModifiedIso } from "./seo";
import { getPublishedStories, getTop5, type Story } from "./stories";
import { selectWebStoryStories } from "./web-stories";
import { addDays, formatLongDate, mountainDay } from "./weeks";
import { alexaBriefing, siteConfig } from "@/site.config";

export const BRIEFING_PATH = "/briefing";
export const BRIEFING_RSS_PATH = "/briefing/feed.xml";
export const BRIEFING_ALEXA_PATH = "/briefing/alexa.json";

/** Amazon truncates a text item at the nearest sentence under this length. */
export const ALEXA_MAIN_TEXT_LIMIT = 4500;

/** Alexa reads the first five items and ignores anything older than seven days. */
export const ALEXA_ITEM_LIMIT = 5;
export const ALEXA_MAX_AGE_DAYS = 7;

const STORY_LEADS = ["First", "Next", "Then", "Also", "And one more"] as const;

const BAD_SYMBOL = /[*_~`^|\\#<>{}[\]©®™•·▪►▶←→↑↓★☆♥✔✕✖✗✘§¶†‡]/g;

export type BriefingLine = {
  slug: string;
  title: string;
  place: string;
  lead: string;
  blurb: string;
  sourceName: string;
  sourceUrl: string;
  line: string;
  segmentId: string;
  image?: string;
  imageAlt?: string;
};

export type DailyBriefing = {
  date: string;
  path: string;
  weekday: string;
  titleText: string;
  description: string;
  intro: string;
  stories: BriefingLine[];
  signoff: string;
  mainText: string;
  wordCount: number;
  readLabel: string;
  uid: string;
  updateDate: string;
  redirectionUrl: string;
};

export type AlexaBriefingItem = {
  uid: string;
  updateDate: string;
  titleText: string;
  mainText: string;
  redirectionUrl: string;
};

export function briefingPath(date: string): string {
  return `${BRIEFING_PATH}/${date}`;
}

export function briefingIntro(date: string): string {
  return `Here's your good news from ${siteConfig.name}. It is ${weekdayName(date)}, ${formatLongDate(date)}.`;
}

export function briefingSignoff(): string {
  return `That's the good news. You can read every story at ${siteConfig.domain}.`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Plain text for a voice. URLs, emoji, and symbols a voice reads aloud are removed. */
export function speakable(value: string): string {
  let text = value.replace(/\r\n/g, "\n");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1");
  text = text.replace(/https?:\/\/\S+/gi, "");
  text = text.replace(/\bwww\.\S+/gi, "");
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, "");
  text = text.replace(/[\u200B-\u200D\uFEFF\uFE0E\uFE0F]/g, "");
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  text = text.replace(/[—–]/g, ", ");
  text = text.replace(/…/g, ". ");
  text = text.replace(/\s+\/\s+/g, " and ");
  text = text.replace(/\band\/or\b/gi, "or");
  text = text.replace(/([A-Za-z])\/([A-Za-z])/g, "$1 $2");
  text = text.replace(/\(([^)]*)\)/g, (_match, inner: string) => (inner.trim() ? `, ${inner.trim()}` : ""));
  text = text.replace(/\s*&\s*/g, " and ");
  text = text.replace(BAD_SYMBOL, "");
  text = text.replace(/\s+([,.;:!?])/g, "$1");
  text = text.replace(/,(\s*,)+/g, ",");
  text = text.replace(/\s+/g, " ").trim();
  return text.replace(/^[,.;:!?]+/, "").trim();
}

function withPeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function blurbSentences(dek: string, title: string): string[] {
  // A single initial ("Janet L. Herrick") is not the end of a sentence.
  const clean = speakable(dek).replace(/\b([A-Z])\./g, "$1\u0000");
  const sentences = sentencesOf(clean).map(withPeriod).filter(Boolean).slice(0, 2);
  if (sentences.length) return sentences;
  const fallback = withPeriod(speakable(title));
  return fallback ? [fallback] : ["A neighbor did something kind."];
}

function shortenToWords(sentence: string, maxWords: number): string {
  const words = sentence
    .replace(/[.!?]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return withPeriod(sentence);
  const cut = words.slice(0, maxWords);
  while (cut.length > 8 && /^(?:and|or|but|a|an|the|to|of|in|on|for|with|that)$/i.test(cut[cut.length - 1].replace(/[.,;:]$/, ""))) {
    cut.pop();
  }
  return withPeriod(cut.join(" ").replace(/[,:;]+$/, ""));
}

export type SpokenPiece = {
  place: string;
  sourceName: string;
  sentences: string[];
};

/**
 * Intro, up to two sentences per story, and the sign-off.
 * Longer copy drops the second sentence, then trims a sentence, and always
 * stays under Amazon's text limit.
 */
export function fitSpokenScript(
  intro: string,
  pieces: SpokenPiece[],
  signoff: string,
): { lines: string[]; blurbs: string[]; mainText: string } {
  if (pieces.length !== STORY_LEADS.length) {
    throw new Error(`A briefing script needs ${STORY_LEADS.length} stories.`);
  }
  const counts = pieces.map((piece) => Math.min(2, Math.max(1, piece.sentences.length)));
  const blurbs = pieces.map((piece) => piece.sentences.map(withPeriod).filter(Boolean));
  for (let index = 0; index < blurbs.length; index += 1) {
    if (!blurbs[index].length) blurbs[index] = ["A neighbor did something kind."];
    counts[index] = Math.min(counts[index], blurbs[index].length);
  }

  function lines(): string[] {
    return pieces.map((piece, index) => {
      const blurb = blurbs[index].slice(0, counts[index]).join(" ");
      const lead = STORY_LEADS[index];
      return `${lead}, in ${piece.place}: ${blurb} Reported by ${piece.sourceName}.`;
    });
  }

  function text(): string {
    return [intro, ...lines(), signoff].join("\n\n");
  }

  let mainText = text();
  let guard = 0;
  while (mainText.length >= ALEXA_MAIN_TEXT_LIMIT && guard < 20) {
    guard += 1;
    let best = -1;
    let bestLength = -1;
    for (let index = 0; index < counts.length; index += 1) {
      if (counts[index] < 2) continue;
      const length = blurbs[index][1]?.length ?? 0;
      if (length > bestLength) {
        best = index;
        bestLength = length;
      }
    }
    if (best < 0) break;
    counts[best] = 1;
    mainText = text();
  }

  for (const maxWords of [40, 24, 12]) {
    if (mainText.length < ALEXA_MAIN_TEXT_LIMIT) break;
    for (let index = 0; index < blurbs.length; index += 1) {
      counts[index] = 1;
      blurbs[index][0] = shortenToWords(blurbs[index][0], maxWords);
    }
    mainText = text();
  }

  if (mainText.length >= ALEXA_MAIN_TEXT_LIMIT) {
    const slice = mainText.slice(0, ALEXA_MAIN_TEXT_LIMIT - 1);
    const end = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
    mainText = (end >= 40 ? slice.slice(0, end + 1) : slice).trim();
  }

  const spokenLines = lines();
  const composed = [intro, ...spokenLines, signoff].join("\n\n");
  if (composed.length < ALEXA_MAIN_TEXT_LIMIT) mainText = composed;
  return {
    lines: spokenLines,
    blurbs: blurbs.map((sentences, index) => sentences.slice(0, counts[index]).join(" ")),
    mainText,
  };
}

function editionStamp(date: string, stories: Story[], now: Date): string {
  let latest = Date.parse(publishedIso(date));
  for (const story of stories) {
    const at = Date.parse(storyModifiedIso(story));
    if (at > latest) latest = at;
  }
  const capped = Math.min(latest, now.getTime());
  return new Date(capped).toISOString();
}

export function latestEditionDate(stories: Story[], today = mountainDay()): string | undefined {
  let latest: string | undefined;
  for (const story of stories) {
    if (story.date > today) continue;
    if (!latest || story.date > latest) latest = story.date;
  }
  return latest;
}

function storiesForDate(date: string, stories: Story[], latest: string): Story[] {
  if (date === latest) return getTop5(stories).slice(0, 5);
  return selectWebStoryStories(stories.filter((story) => story.date === date)).slice(0, 5);
}

export function buildDailyBriefing(date: string, stories: Story[], now = new Date()): DailyBriefing {
  const intro = briefingIntro(date);
  const signoff = briefingSignoff();
  const pieces: SpokenPiece[] = stories.map((story) => ({
    place: speakable(placeLabel(story)) || "the news",
    sourceName: speakable(story.sourceName) || "the original newsroom",
    sentences: blurbSentences(story.dek, story.title),
  }));
  const spoken = fitSpokenScript(intro, pieces, signoff);
  const lines: BriefingLine[] = stories.map((story, index) => {
    const lead = STORY_LEADS[index];
    return {
      slug: story.slug,
      title: story.title,
      place: pieces[index].place,
      lead,
      blurb: spoken.blurbs[index],
      sourceName: pieces[index].sourceName,
      sourceUrl: story.sourceUrl,
      line: spoken.lines[index],
      segmentId: `briefing-${story.slug}`,
      image: story.image,
      imageAlt: story.imageAlt,
    };
  });
  const mainText = spoken.mainText;
  const words = countWords(mainText);
  return {
    date,
    path: briefingPath(date),
    weekday: weekdayName(date),
    titleText: `Good news for ${formatLongDate(date)}`,
    description: `Five good-news stories for ${formatLongDate(date)}, written as a short script you can read aloud.`,
    intro,
    stories: lines,
    signoff,
    mainText,
    wordCount: words,
    readLabel: spokenReadLabel(words),
    uid: `briefing-${date}`,
    updateDate: editionStamp(date, stories, now),
    redirectionUrl: absoluteUrl(briefingPath(date)),
  };
}

export function loadBriefings(stories = getPublishedStories(), today = mountainDay(), now = new Date()): DailyBriefing[] {
  const eligible = stories.filter((story) => story.date <= today);
  const latest = latestEditionDate(eligible, today);
  if (!latest) return [];
  const dates = [...new Set(eligible.map((story) => story.date))].sort();
  const briefings: DailyBriefing[] = [];
  for (const date of dates) {
    const picked = storiesForDate(date, eligible, latest);
    if (picked.length < 5) continue;
    briefings.push(buildDailyBriefing(date, picked, now));
  }
  return briefings;
}

export function latestBriefing(briefings = loadBriefings()): DailyBriefing | undefined {
  return briefings[briefings.length - 1];
}

export function indexableBriefings(briefings = loadBriefings()): DailyBriefing[] {
  return briefings.filter((briefing) => briefing.stories.length === 5 && briefing.mainText.length < ALEXA_MAIN_TEXT_LIMIT);
}

/** Newest first. At most five items, none older than seven days, no repeated story. */
export function alexaBriefings(briefings = loadBriefings(), today = mountainDay()): DailyBriefing[] {
  const cutoff = addDays(today, -(ALEXA_MAX_AGE_DAYS - 1));
  const used = new Set<string>();
  const chosen: DailyBriefing[] = [];
  const ordered = briefings.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  for (const briefing of ordered) {
    if (chosen.length >= ALEXA_ITEM_LIMIT) break;
    if (briefing.date < cutoff || briefing.date > today) continue;
    if (briefing.stories.some((story) => used.has(story.slug))) continue;
    for (const story of briefing.stories) used.add(story.slug);
    chosen.push(briefing);
  }
  return chosen;
}

export function alexaFeedItems(briefings = alexaBriefings(), now = new Date()): AlexaBriefingItem[] {
  const nowMs = now.getTime();
  let cursor = nowMs + 1000;
  return briefings.map((briefing) => {
    let at = Math.min(Date.parse(briefing.updateDate), nowMs);
    if (Number.isNaN(at)) at = Math.min(Date.parse(publishedIso(briefing.date)), nowMs);
    if (at >= cursor) at = cursor - 1000;
    cursor = at;
    return {
      uid: briefing.uid,
      updateDate: new Date(at).toISOString(),
      titleText: briefing.titleText,
      mainText: briefing.mainText,
      redirectionUrl: briefing.redirectionUrl,
    };
  });
}

export function renderAlexaFeed(items = alexaFeedItems()): string {
  return JSON.stringify(items, null, 2);
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Newest edition first. One item per briefing day. Plain RSS, no media. */
export function renderBriefingRss(briefings = loadBriefings()): string {
  const ordered = briefings.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const newest = ordered[0];
  const updated = newest ? new Date(newest.updateDate).toUTCString() : new Date().toUTCString();
  const items = ordered
    .map((briefing) => {
      const link = absoluteUrl(briefing.path);
      return `<item>
      <title>${escapeXml(briefing.titleText)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(briefing.updateDate).toUTCString()}</pubDate>
      <description>${escapeXml(briefing.mainText)}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${siteConfig.name} daily briefing`)}</title>
    <link>${absoluteUrl(BRIEFING_PATH)}</link>
    <description>${escapeXml("A spoken script of each day's Top 5 good-news stories.")}</description>
    <language>en-us</language>
    <lastBuildDate>${updated}</lastBuildDate>
    ${items}
  </channel>
</rss>
`;
}

export function smartSpeakerNote(): { text: string; href?: string } {
  if (!alexaBriefing.published) {
    return { text: "Smart speakers: a daily spoken briefing is coming soon." };
  }
  const skillUrl = alexaBriefing.skillUrl.trim();
  return {
    text: `On a smart speaker, turn on the ${siteConfig.name} briefing in the Alexa app under More, Settings, News, and Flash Briefing.`,
    ...(skillUrl.startsWith("https://") ? { href: skillUrl } : {}),
  };
}
