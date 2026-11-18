/**
 * Weekly workplace digests.
 * One page per Monday-start week in America/Denver, the same week key as /week.
 * The pick is about five stories from that Monday through Sunday. Editor pins
 * in data/workplace-pins.json come first. The rest are filled from the archive.
 * Nothing here is written as a new story. Lines are cut from the dek.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { editionYear } from "./format";
import { heavyNewsReason } from "./news-break";
import { sentencesOf } from "./morning-announcements";
import { absoluteUrl, publishedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { escapeHtml } from "./tip-mail";
import {
  addDays,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";
import { siteConfig } from "@/site.config";

export const WORKPLACE_PATH = "/workplace";
export const WORKPLACE_RSS_PATH = "/workplace/rss.xml";
export const WORKPLACE_STORY_COUNT = 5;
export const WORKPLACE_MIN_STORIES = 3;
export const WORKPLACE_MIN_CHARS = 800;
export const WORKPLACE_MAX_CHARS = 1200;

const PINS_PATH = path.join(process.cwd(), "data", "workplace-pins.json");

const KIND_TAGS = new Set([
  "kindness",
  "neighbors",
  "community-meals",
  "community-garden",
  "animal-rescue",
  "pet-adoption",
  "dogs",
  "cats",
]);

const HEALTH_TAGS = new Set(["medical-research", "public-health"]);

/**
 * Violence and heavy crime, on top of the news-break list
 * (politics, shootings, use of force).
 * "World War II", "war memorials", and "Cuban Missile Crisis" stay,
 * because those phrases show up in honor-flight and birthday stories.
 * "Seed bombs" and a former "bombing range" stay too.
 * Word boundaries keep "warm", "award", and "cardiac arrest" from matching.
 */
const CRIME_TERMS = [
  "murders?",
  "homicides?",
  "manslaughter",
  "stabbings?",
  "stabbed",
  "assaults?",
  "assaulted",
  "robberies",
  "robbery",
  "robbed",
  "burglaries",
  "burglary",
  "kidnappings?",
  "kidnapped",
  "abductions?",
  "abducted",
  "rapes?",
  "raped",
  "terrorists?",
  "terrorism",
  "suicides?",
  "gunmen",
  "gunman",
  "firearms?",
  "handguns?",
  "shootouts?",
  "violence",
  "violent",
  "incarcerated",
  "felonies",
  "felony",
  "convicted",
  "arrested",
  "under arrest",
  "airstrikes?",
  "warfare",
];

const CRIME = new RegExp(`\\b(?:${CRIME_TERMS.join("|")})\\b`, "i");
const BOMB = /(?<!seed )(?<!seed-)(?<!unexploded )bombs?\b|(?<![\w-])bombings?\b(?! range)|(?<![\w-])bombed\b/i;

const SAFE_PHRASES = [
  /democratic republic/gi,
  /democrat-gazette/gi,
  /times[-\s]+republican/gi,
  /cynthiana democrat/gi,
  /library of congress/gi,
];

const pinsSchema = z.record(z.string(), z.array(z.string()).max(WORKPLACE_STORY_COUNT));

export type WorkplaceSource = {
  slug: string;
  title: string;
  shortTitle?: string;
  emphasis?: string;
  dek: string;
  date: string;
  category: string;
  tags?: string[];
  body?: string;
  city?: string;
  place?: string;
  correction?: string;
  sourceName?: string;
  imageAlt?: string;
  imageCaption?: string;
  kidSummary?: string;
  kidQuestions?: string[];
  kidFriendly?: boolean;
  featured?: boolean;
  top5?: number;
  worldPick?: boolean;
  cheers?: number;
  draft?: boolean;
  image?: string;
};

export type WorkplacePick = {
  slug: string;
  title: string;
  date: string;
  category: string;
  pinned: boolean;
  url: string;
  line: string;
  image?: string;
  imageAlt?: string;
};

export type WorkplaceDigest = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  description: string;
  stories: WorkplacePick[];
  plainText: string;
  html: string;
  latest: string;
  image?: string;
  imageAlt?: string;
};

export function workplacePath(start: string): string {
  return `${WORKPLACE_PATH}/${start}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function crimeText(story: WorkplaceSource): string {
  let text = [story.title, story.shortTitle, story.dek, story.body, story.kidSummary, story.imageAlt, story.imageCaption]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n");
  const source = story.sourceName?.trim();
  if (source) text = text.replace(new RegExp(escapeRegExp(source), "gi"), " ");
  for (const phrase of SAFE_PHRASES) text = text.replace(phrase, " ");
  return text;
}

/** A matched term when the story should stay out of a workplace post. */
export function workplaceBlockReason(story: WorkplaceSource): string | undefined {
  if (story.draft) return "draft";
  const heavy = heavyNewsReason(story);
  if (heavy) return heavy;
  const text = crimeText(story);
  return text.match(CRIME)?.[0] ?? text.match(BOMB)?.[0];
}

export function isWorkplaceStory(story: WorkplaceSource): boolean {
  return workplaceBlockReason(story) === undefined;
}

function preference(story: WorkplaceSource): number {
  let score = 0;
  if (story.kidFriendly) score += 8;
  if ((story.tags ?? []).some((tag) => KIND_TAGS.has(tag))) score += 6;
  if (story.category === "community") score += 5;
  if (story.category === "animals") score += 5;
  if (story.category === "health-tech") score += 5;
  if ((story.tags ?? []).some((tag) => HEALTH_TAGS.has(tag))) score += 3;
  const lead = `${story.title}\n${story.dek}`;
  if (story.category === "science" && /\b(?:trials?|therap(?:y|ies)|treatments?|vaccines?|transplants?)\b/i.test(lead)) {
    score += 4;
  }
  if (story.featured) score += 2;
  if (story.top5) score += 1;
  return score;
}

function byPreference(a: WorkplaceSource, b: WorkplaceSource): number {
  const score = preference(b) - preference(a);
  if (score !== 0) return score;
  const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featured !== 0) return featured;
  const rank = (a.top5 ?? 99) - (b.top5 ?? 99);
  if (rank !== 0) return rank;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

export function parseWorkplacePins(value: unknown): Record<string, string[]> {
  const result = pinsSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Workplace pins: ${details}`);
  }
  for (const [key, slugs] of Object.entries(result.data)) {
    if (!parseIsoDate(key) || weekStart(key) !== key) {
      throw new Error(`Workplace pins: ${key} must be the Monday of that week, written YYYY-MM-DD.`);
    }
    for (const slug of slugs) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(`Workplace pins: ${key} includes “${slug}”, which is not a story slug.`);
      }
    }
    if (new Set(slugs).size !== slugs.length) {
      throw new Error(`Workplace pins: ${key} lists the same story twice.`);
    }
  }
  return result.data;
}

export function loadWorkplacePins(): Record<string, string[]> {
  const raw = fs.readFileSync(PINS_PATH, "utf8");
  return parseWorkplacePins(JSON.parse(raw));
}

function plainDek(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/[*_]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clipWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const space = slice.lastIndexOf(" ");
  const cut = (space > 40 ? slice.slice(0, space) : slice).replace(/[,:;–—-]+$/u, "").trim();
  if (/[.!?…]$/.test(cut)) return cut;
  return `${cut}…`;
}

function oneLiner(dek: string, max: number, extra: boolean): string {
  const text = plainDek(dek);
  const sentences = sentencesOf(text);
  let line = sentences[0] ?? text;
  if (extra && sentences[1]) {
    const combined = `${line} ${sentences[1]}`;
    if (combined.length <= max) line = combined;
  }
  return clipWords(line, max);
}

function headline(story: WorkplaceSource, useShort: boolean): string {
  if (useShort && story.shortTitle && story.shortTitle.length < story.title.length) return story.shortTitle;
  return story.title;
}

function renderPlain(
  rangeLabel: string,
  path: string,
  rows: { title: string; line: string; url: string }[],
): string {
  const lines = [`Good news for the week of ${rangeLabel}`, ""];
  rows.forEach((row, index) => {
    lines.push(`${index + 1}. ${row.title}`);
    lines.push(row.line);
    lines.push(row.url);
    lines.push("");
  });
  lines.push(`Shared from ${siteConfig.name} — verified good news`);
  lines.push(absoluteUrl(path));
  return lines.join("\n");
}

function renderHtml(rangeLabel: string, path: string, rows: { title: string; line: string; url: string }[]): string {
  const items = rows
    .map((row) => {
      return `<li style="margin:0 0 14px;"><a href="${escapeHtml(row.url)}" style="color:#24537F;font-weight:700;">${escapeHtml(row.title)}</a><br /><span style="color:#4A5563;">${escapeHtml(row.line)}</span></li>`;
    })
    .join("");
  const page = absoluteUrl(path);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Georgia,'Times New Roman',serif;color:#1C2733;max-width:560px;">
  <tr><td style="padding:0 0 12px;font-size:18px;line-height:1.35;">Good news for the week of ${escapeHtml(rangeLabel)}</td></tr>
  <tr><td><ol style="margin:0;padding:0 0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.45;">${items}</ol></td></tr>
  <tr><td style="padding-top:8px;font-family:system-ui,sans-serif;font-size:14px;line-height:1.45;">Shared from <a href="${escapeHtml(page)}" style="color:#24537F;font-weight:700;">${escapeHtml(siteConfig.name)}</a> — verified good news</td></tr>
</table>`;
}

function fitPost(
  stories: WorkplaceSource[],
  rangeLabel: string,
  path: string,
): { plainText: string; html: string; lines: string[]; titles: string[] } {
  let closest: { plainText: string; html: string; lines: string[]; titles: string[]; distance: number } | undefined;
  for (const extra of [true, false]) {
    for (const useShort of [false, true]) {
      for (let max = 280; max >= 48; max -= 8) {
        const titles = stories.map((story) => headline(story, useShort));
        const lines = stories.map((story) => oneLiner(story.dek, max, extra));
        const rows = stories.map((story, index) => ({
          title: titles[index],
          line: lines[index],
          url: absoluteUrl(`/story/${story.slug}`),
        }));
        const plainText = renderPlain(rangeLabel, path, rows);
        const distance =
          plainText.length < WORKPLACE_MIN_CHARS
            ? WORKPLACE_MIN_CHARS - plainText.length
            : plainText.length > WORKPLACE_MAX_CHARS
              ? plainText.length - WORKPLACE_MAX_CHARS
              : 0;
        if (distance === 0) {
          return { plainText, html: renderHtml(rangeLabel, path, rows), lines, titles };
        }
        if (!closest || distance < closest.distance) {
          closest = { plainText, html: renderHtml(rangeLabel, path, rows), lines, titles, distance };
        }
      }
    }
  }
  if (!closest) throw new Error("Workplace post had no stories.");
  return closest;
}

function selectForWeek<T extends WorkplaceSource>(eligible: T[], pinSlugs: string[]): { stories: T[]; pinned: Set<string> } {
  const bySlug = new Map(eligible.map((story) => [story.slug, story]));
  const picked: T[] = [];
  const pinned = new Set<string>();
  for (const slug of pinSlugs) {
    const story = bySlug.get(slug);
    if (!story || picked.some((item) => item.slug === slug)) continue;
    if (picked.length >= WORKPLACE_STORY_COUNT) break;
    picked.push(story);
    pinned.add(slug);
  }
  const ranked = eligible.filter((story) => !pinned.has(story.slug)).sort(byPreference);
  const categories = new Set(picked.map((story) => story.category));
  for (const story of ranked) {
    if (picked.length >= WORKPLACE_STORY_COUNT) break;
    if (categories.has(story.category)) continue;
    picked.push(story);
    categories.add(story.category);
  }
  for (const story of ranked) {
    if (picked.length >= WORKPLACE_STORY_COUNT) break;
    if (!picked.some((item) => item.slug === story.slug)) picked.push(story);
  }
  return { stories: picked, pinned };
}

export function buildWorkplaceDigests<T extends WorkplaceSource>(
  stories: T[],
  pins: Record<string, string[]> = {},
  today = mountainDay(),
): { digests: WorkplaceDigest[]; pinErrors: string[] } {
  const pinErrors: string[] = [];
  const published = stories.filter((story) => !story.draft);
  const bySlug = new Map(published.map((story) => [story.slug, story]));
  const first = launchWeekStart();
  const last = weekStart(today);
  const validPins = new Map<string, string[]>();

  for (const [start, slugs] of Object.entries(pins)) {
    const end = addDays(start, 6);
    const accepted: string[] = [];
    for (const slug of slugs) {
      const story = bySlug.get(slug);
      if (!story) {
        pinErrors.push(`${start}: ${slug} is not a published story.`);
        continue;
      }
      if (story.date < start || story.date > end) {
        pinErrors.push(`${start}: ${slug} is dated ${story.date}, outside that Monday-Sunday week.`);
        continue;
      }
      const blocked = workplaceBlockReason(story);
      if (blocked) {
        pinErrors.push(`${start}: ${slug} is excluded by the content filter (${blocked}).`);
        continue;
      }
      accepted.push(slug);
    }
    if (start < first || start > last) {
      if (accepted.length) pinErrors.push(`${start}: that week is outside the published archive.`);
      continue;
    }
    validPins.set(start, accepted);
  }

  const byWeek = new Map<string, T[]>();
  for (const story of published) {
    const start = weekStart(story.date);
    if (start < first || start > last) continue;
    const group = byWeek.get(start);
    if (group) group.push(story);
    else byWeek.set(start, [story]);
  }

  const digests: WorkplaceDigest[] = [];
  for (let start = first; start <= last; start = addDays(start, 7)) {
    const end = addDays(start, 6);
    const group = byWeek.get(start) ?? [];
    const eligible = group.filter((story) => isWorkplaceStory(story));
    const { stories: chosen, pinned } = selectForWeek(eligible, validPins.get(start) ?? []);
    if (chosen.length < WORKPLACE_MIN_STORIES) continue;
    const path = workplacePath(start);
    const rangeLabel = formatWeekRange(start, end);
    const fitted = fitPost(chosen, rangeLabel, path);
    const picks: WorkplacePick[] = chosen.map((story, index) => ({
      slug: story.slug,
      title: fitted.titles[index] ?? story.title,
      date: story.date,
      category: story.category,
      pinned: pinned.has(story.slug),
      url: absoluteUrl(`/story/${story.slug}`),
      line: fitted.lines[index] ?? "",
      image: story.image,
      imageAlt: story.imageAlt,
    }));
    const latest = chosen.map((story) => story.date).sort().at(-1) ?? end;
    const imageStory = chosen.find((story) => story.image);
    const inProgress = today <= end;
    digests.push({
      start,
      end,
      path,
      inProgress,
      rangeLabel,
      title: `Workplace good news, ${rangeLabel}`,
      description: `${picks.length} verified stories for a workplace post covering ${rangeLabel}. Politics, violence, and heavy crime stay off the list.`,
      stories: picks,
      plainText: fitted.plainText,
      html: fitted.html,
      latest,
      image: imageStory?.image,
      imageAlt: imageStory?.imageAlt,
    });
  }

  return { digests, pinErrors };
}

let cachedToday: string | undefined;
let cachedDigests: WorkplaceDigest[] | null = null;

export function getWorkplaceDigests(today = mountainDay()): WorkplaceDigest[] {
  if (process.env.NODE_ENV === "production" && cachedDigests && cachedToday === today) return cachedDigests;
  const built = buildWorkplaceDigests(getPublishedStories(), loadWorkplacePins(), today);
  if (built.pinErrors.length) {
    throw new Error(`Workplace pins:\n- ${built.pinErrors.join("\n- ")}`);
  }
  cachedToday = today;
  cachedDigests = built.digests;
  return built.digests;
}

export function digestsToPrerender(today = mountainDay()): WorkplaceDigest[] {
  return getWorkplaceDigests(today);
}

export function workplaceIndexJsonLd(digests: WorkplaceDigest[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `Workplace good news from ${siteConfig.name}`,
        description: `A free weekly good-news post for Slack, Microsoft Teams, and an email signature. Each story links to the original report.`,
        url: absoluteUrl(WORKPLACE_PATH),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en-US",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: digests.length,
          itemListElement: digests
            .slice()
            .reverse()
            .slice(0, 40)
            .map((digest, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: digest.title,
              url: absoluteUrl(digest.path),
            })),
        },
      },
      breadcrumb([
        { name: "Today", path: "/" },
        { name: "Workplace digest", path: WORKPLACE_PATH },
      ]),
    ],
  };
}

export function workplaceDigestJsonLd(digest: WorkplaceDigest) {
  const url = absoluteUrl(digest.path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["WebPage", "CollectionPage"],
        "@id": `${url}#webpage`,
        name: digest.title,
        description: digest.description,
        url,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en-US",
        author: { "@type": "Organization", name: siteConfig.editor.name },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: digest.stories.length,
          itemListElement: digest.stories.map((story, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: story.title,
            url: story.url,
          })),
        },
      },
      breadcrumb([
        { name: "Today", path: "/" },
        { name: "Workplace digest", path: WORKPLACE_PATH },
        { name: digest.rangeLabel, path: digest.path },
      ]),
    ],
  };
}

function breadcrumb(crumbs: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Finished weeks only, so a subscriber does not get a post that is still changing. */
export function renderWorkplaceRss(digests: WorkplaceDigest[] = getWorkplaceDigests()): string {
  const finished = digests.filter((digest) => !digest.inProgress).slice().reverse();
  const self = absoluteUrl(WORKPLACE_RSS_PATH);
  const channelLink = absoluteUrl(WORKPLACE_PATH);
  const updated = finished[0] ? new Date(publishedIso(addDays(finished[0].end, 1))).toUTCString() : new Date().toUTCString();
  const items = finished
    .map((digest) => {
      const link = absoluteUrl(digest.path);
      const image = digest.image ? absoluteUrl(digest.image) : "";
      const media = image
        ? `<media:content url="${escapeXml(image)}" medium="image" type="image/webp">
        <media:title>${escapeXml(digest.title)}</media:title>
        <media:description>${escapeXml(digest.imageAlt || digest.title)}</media:description>
      </media:content>
      <enclosure url="${escapeXml(image)}" type="image/webp" />`
        : "";
      return `<item>
      <title>${escapeXml(digest.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(publishedIso(addDays(digest.end, 1))).toUTCString()}</pubDate>
      <description>${escapeXml(digest.plainText)}</description>
      <content:encoded>${cdata(digest.html)}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      ${media}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`${siteConfig.name}: Workplace good news`)}</title>
    <link>${channelLink}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml("One post for each finished workplace week. The current week is left out until Sunday is over.")}</description>
    <language>en-us</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <copyright>© ${editionYear()} ${escapeXml(siteConfig.name)}</copyright>
    <managingEditor>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</managingEditor>
    <webMaster>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</webMaster>
    ${items}
  </channel>
</rss>`;
}
