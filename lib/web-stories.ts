/**
 * One AMP web story per edition date.
 * The morning job does not add a file for it. The build renders every date
 * that already has published stories, and crops that day's poster.
 * Ranks follow the daily Top 5 when this date has them. Otherwise the
 * featured story leads and the newest stories follow.
 */
import fs from "fs";
import path from "path";
import { SQUARE_LOGO } from "./brand";
import { readImageSize } from "./feed-image";
import { placeLabel } from "./present";
import { absoluteUrl, publishedIso, storyModifiedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { escapeHtml } from "./tip-mail";
import { formatLongDate } from "./weeks";
import { siteConfig } from "@/site.config";

export const WEB_STORIES_INDEX = "/web-stories";
export const WEB_STORY_WORDS = 10;
export const WEB_STORY_POSTER = { width: 1200, height: 1600 } as const;
export const WEB_STORY_POSTER_MIN = { width: 640, height: 853 } as const;

export const COVER_TITLE = "Today's good news";
export const SUBSCRIBE_TITLE = "Good news, every morning.";
export const SUBSCRIBE_DEK = "The daily Top 5, free.";
export const READ_CTA = "Read the story";
export const SUBSCRIBE_CTA = "Subscribe";

export type WebStoryCandidate = {
  slug: string;
  date: string;
  title: string;
  featured?: boolean;
  top5?: number;
};

export type WebStoryEdition = {
  date: string;
  path: string;
  posterPath: string;
  title: string;
  description: string;
  stories: Story[];
  published: string;
  modified: string;
};

const BOILERPLATE =
  "body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}";

const BOILERPLATE_NOSCRIPT = "body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}";

const STORY_CSS = [
  "amp-story{font-family:Georgia,'Times New Roman',serif;color:#fff}",
  "amp-story-page{background:#1C2733}",
  ".scrim{background:linear-gradient(180deg,rgba(28,39,51,0) 12%,rgba(28,39,51,.5) 52%,rgba(28,39,51,.94) 100%)}",
  ".bottom{align-content:end;padding:24px 24px 112px}",
  ".center{align-content:center;padding:32px 28px}",
  "h1{font-size:32px;line-height:1.15;font-weight:600;margin:0 0 10px;color:#fff}",
  ".place{font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#FFD36E;margin:0 0 8px}",
  ".dek,.date{font-family:Arial,sans-serif;font-size:16px;line-height:1.35;color:#F7F1E6;margin:0}",
  ".credit{font-family:Arial,sans-serif;font-size:12px;line-height:1.4;color:#F7F1E6;margin:12px 0 0}",
  ".credit a{color:#fff}",
  ".logo{width:96px;height:96px;margin:0 0 16px}",
  ".center .logo{margin:0 auto 16px}",
  ".center h1,.center .dek{text-align:center}",
].join("");

const sizeCache = new Map<string, { width: number; height: number }>();

export function webStoryPath(date: string): string {
  return `${WEB_STORIES_INDEX}/${date}`;
}

export function webStoryPosterPath(date: string, imagePath: string): string {
  const file = imagePath.split("/").pop() ?? "lead.webp";
  const stem = file.replace(/\.webp$/i, "").replace(/[^a-z0-9-]/gi, "");
  return `/images/web-stories/${date}-${stem}.jpg`;
}

export function webStoryTitle(date: string): string {
  return `${COVER_TITLE}, ${formatLongDate(date)}`;
}

export function webStoryDescription(date: string, stories: Pick<Story, "shortTitle" | "title">[]): string {
  const lead = stories[0];
  const line = lead?.shortTitle?.trim() || lead?.title || "Verified good news";
  return `${COVER_TITLE} for ${formatLongDate(date)}: ${line}`;
}

export function wordCount(text: string): number {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

/** First words only. Web story pages stay near ten words. */
export function limitWords(text: string, max = WEB_STORY_WORDS): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.slice(0, max).join(" ");
}

export function storyPageCopy(story: Story): { place: string; title: string; dek: string } {
  return {
    place: limitWords(placeLabel(story)),
    title: limitWords(story.shortTitle?.trim() || story.title),
    dek: limitWords(story.dek),
  };
}

function byFeaturedThenNewest<T extends WebStoryCandidate>(a: T, b: T): number {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.title.localeCompare(b.title);
}

/**
 * Same order as `getTop5` when any story in the pool has a rank.
 * With no ranks, the featured story leads and newer stories follow.
 */
export function selectWebStoryStories<T extends WebStoryCandidate>(stories: T[]): T[] {
  const ranked = stories.filter((story) => story.top5).sort((a, b) => (a.top5 ?? 99) - (b.top5 ?? 99));
  if (ranked.length >= 5) return ranked.slice(0, 5);
  if (ranked.length > 0) {
    const used = new Set(ranked.map((story) => story.slug));
    const rest = stories.filter((story) => !used.has(story.slug));
    return [...ranked, ...rest].slice(0, 5);
  }
  return [...stories].sort(byFeaturedThenNewest).slice(0, 5);
}

function toEdition(date: string, stories: Story[]): WebStoryEdition {
  const lead = stories[0];
  const published = publishedIso(date);
  const modified = stories.reduce((latest, story) => {
    const value = storyModifiedIso(story);
    return value > latest ? value : latest;
  }, published);
  return {
    date,
    path: webStoryPath(date),
    posterPath: lead ? webStoryPosterPath(date, lead.image) : webStoryPosterPath(date, "/images/stories/lead.webp"),
    title: webStoryTitle(date),
    description: webStoryDescription(date, stories),
    stories,
    published,
    modified,
  };
}

export function listWebStories(stories = getPublishedStories()): WebStoryEdition[] {
  const byDate = new Map<string, Story[]>();
  for (const story of stories) {
    const group = byDate.get(story.date);
    if (group) group.push(story);
    else byDate.set(story.date, [story]);
  }
  return [...byDate.entries()]
    .map(([date, day]) => toEdition(date, selectWebStoryStories(day)))
    .filter((edition) => edition.stories.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getWebStory(date: string, stories = getPublishedStories()): WebStoryEdition | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return listWebStories(stories).find((edition) => edition.date === date);
}

function pixelSize(publicPath: string): { width: number; height: number } {
  const cached = sizeCache.get(publicPath);
  if (cached) return cached;
  const absolute = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const size = readImageSize(fs.readFileSync(absolute));
  if (!size || size.width < 1 || size.height < 1) {
    throw new Error(`Could not read the size of ${publicPath}`);
  }
  sizeCache.set(publicPath, size);
  return size;
}

function ampImg(src: string, width: number, height: number, alt: string, layout: "fill" | "fixed"): string {
  return `<amp-img src="${escapeHtml(src)}" width="${width}" height="${height}" layout="${layout}" alt="${escapeHtml(alt)}"></amp-img>`;
}

function creditLine(story: Story): string {
  return `<p class="credit">Photo: <a href="${escapeHtml(story.imageCreditUrl)}">${escapeHtml(story.imageCredit)}</a> · <a href="${escapeHtml(story.imageLicenseUrl)}">${escapeHtml(story.imageLicense)}</a></p>`;
}

function outlink(href: string, label: string): string {
  return `<amp-story-page-outlink layout="nodisplay"><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></amp-story-page-outlink>`;
}

function logoMarkup(): string {
  const src = absoluteUrl(SQUARE_LOGO.path);
  return `<div class="logo">${ampImg(src, 96, 96, siteConfig.name, "fixed")}</div>`;
}

function storyJsonLd(edition: WebStoryEdition): string {
  const canonical = absoluteUrl(edition.path);
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: edition.title,
    description: edition.description,
    image: {
      "@type": "ImageObject",
      url: absoluteUrl(edition.posterPath),
      width: WEB_STORY_POSTER.width,
      height: WEB_STORY_POSTER.height,
    },
    datePublished: edition.published,
    dateModified: edition.modified,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    author: {
      "@type": "Organization",
      name: siteConfig.editor.name,
      url: absoluteUrl("/about#masthead"),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(SQUARE_LOGO.path),
        width: SQUARE_LOGO.width,
        height: SQUARE_LOGO.height,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function pageShell(id: string, inner: string): string {
  return `<amp-story-page id="${id}">${inner}</amp-story-page>`;
}

function photoLayers(story: Story): string {
  const size = pixelSize(story.image);
  return [
    `<amp-story-grid-layer template="fill">${ampImg(absoluteUrl(story.image), size.width, size.height, story.imageAlt, "fill")}</amp-story-grid-layer>`,
    `<amp-story-grid-layer template="fill"><div class="scrim"></div></amp-story-grid-layer>`,
  ].join("");
}

function renderCover(edition: WebStoryEdition): string {
  const lead = edition.stories[0];
  if (!lead) return "";
  const inner = [
    photoLayers(lead),
    `<amp-story-grid-layer template="vertical" class="bottom">${logoMarkup()}<h1>${escapeHtml(COVER_TITLE)}</h1><p class="date">${escapeHtml(formatLongDate(edition.date))}</p>${creditLine(lead)}</amp-story-grid-layer>`,
  ].join("");
  return pageShell("cover", inner);
}

function renderStoryPage(story: Story, index: number): string {
  const copy = storyPageCopy(story);
  const inner = [
    photoLayers(story),
    `<amp-story-grid-layer template="vertical" class="bottom"><p class="place">${escapeHtml(copy.place)}</p><h1>${escapeHtml(copy.title)}</h1><p class="dek">${escapeHtml(copy.dek)}</p>${creditLine(story)}</amp-story-grid-layer>`,
    outlink(absoluteUrl(`/story/${story.slug}`), READ_CTA),
  ].join("");
  return pageShell(`story-${index + 1}`, inner);
}

function renderSubscribe(): string {
  const inner = [
    `<amp-story-grid-layer template="vertical" class="center">${logoMarkup()}<h1>${escapeHtml(SUBSCRIBE_TITLE)}</h1><p class="dek">${escapeHtml(SUBSCRIBE_DEK)}</p></amp-story-grid-layer>`,
    outlink(absoluteUrl("/subscribe"), SUBSCRIBE_CTA),
  ].join("");
  return pageShell("subscribe", inner);
}

/** Standalone AMP HTML. The site layout must not wrap this document. */
export function renderWebStoryDocument(edition: WebStoryEdition): string {
  const lead = edition.stories[0];
  if (!lead) throw new Error(`No stories for ${edition.date}`);
  const canonical = absoluteUrl(edition.path);
  const poster = absoluteUrl(edition.posterPath);
  const logo = absoluteUrl(SQUARE_LOGO.path);
  const pages = [renderCover(edition), ...edition.stories.map((story, index) => renderStoryPage(story, index)), renderSubscribe()].join("");
  return `<!doctype html>
<html amp lang="en">
<head>
<meta charset="utf-8">
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
<title>${escapeHtml(edition.title)}</title>
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
<meta name="description" content="${escapeHtml(edition.description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<style amp-boilerplate>${BOILERPLATE}</style>
<noscript><style amp-boilerplate>${BOILERPLATE_NOSCRIPT}</style></noscript>
<style amp-custom>${STORY_CSS}</style>
<script type="application/ld+json">${storyJsonLd(edition)}</script>
</head>
<body>
<amp-story standalone title="${escapeHtml(edition.title)}" publisher="${escapeHtml(siteConfig.name)}" publisher-logo-src="${escapeHtml(logo)}" poster-portrait-src="${escapeHtml(poster)}">
${pages}
</amp-story>
</body>
</html>
`;
}
