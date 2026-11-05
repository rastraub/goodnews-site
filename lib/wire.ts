/**
 * Good News Wire.
 * Publishers may republish this site's headlines and summaries with credit.
 * Photos stay off the wire unless the image credit or license names this
 * publication or its owner. Creative Commons and public-domain photos are
 * someone else's, so they are left out.
 */
import { SQUARE_LOGO } from "./brand";
import { getCategory } from "./categories";
import { getCountry } from "./countries";
import {
  FEED_LIMIT,
  escapeXml,
  formatInlineHtml,
  plainStoryText,
  renderRssChannel,
  rssMediaXml,
  xmlCdata,
} from "./feed";
import { storyFeedImage } from "./feed-image";
import { sortedUpdates } from "./follow-ups";
import { formatStoryDate } from "./format";
import { placeLabel } from "./present";
import { absoluteUrl, storyModifiedIso, storyPublishedIso } from "./seo";
import { getByState, getPublishedStories, type Story } from "./stories";
import { getStateByCode } from "./states";
import { getKidStories } from "./kids";
import { addDays, formatWeekRange, mountainDay, selectStandouts, weekStart } from "./weeks";
import { siteConfig } from "@/site.config";

export const WIRE_PATH = "/wire";
export const WIRE_FEED_PATH = "/wire/feed.xml";
export const WIRE_JSON_PATH = "/wire/feed.json";
export const WIRE_KIDS_FEED_PATH = "/wire/kids/feed.xml";
export const WIRE_KIDS_JSON_PATH = "/wire/kids/feed.json";

export type WireAudience = "general" | "kids";

export function wireStateFeedPath(slug: string): string {
  return `/wire/${slug}/feed.xml`;
}

export function wireFeedTitle(): string {
  return `${siteConfig.name} Good News Wire`;
}

export function wireKidsFeedTitle(): string {
  return `${siteConfig.name} Good News Wire for classrooms`;
}

export function wireStateFeedTitle(name: string): string {
  return `${siteConfig.name} Good News Wire: ${name}`;
}

export function wireFeedDescription(): string {
  return `Short summaries from ${siteConfig.name} that publishers may republish with credit. Each item links to the story here and to the newsroom that reported it. Photos are not included.`;
}

export function wireKidsFeedDescription(): string {
  return `Classroom summaries from ${siteConfig.name} that a school may republish with credit. Each item is the version written for a teacher to read with a class.`;
}

export function wireStateFeedDescription(name: string): string {
  return `Short summaries from ${name} on ${siteConfig.name} that a local publisher may republish with credit. Each item links to the story here and to the newsroom that reported it.`;
}

export function storyWireUrl(slug: string): string {
  return absoluteUrl(`/story/${slug}`);
}

/**
 * A photo rides along only when the credit or the license names this publication
 * or its owner. Anything else, including Creative Commons and public domain, stays off.
 */
export function wireMayIncludeImage(story: Pick<Story, "imageCredit" | "imageLicense">): boolean {
  const haystack = `${story.imageCredit} ${story.imageLicense}`.toLowerCase();
  const markers = [siteConfig.name, siteConfig.owner.name]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 4);
  return markers.some((marker) => haystack.includes(marker));
}

export function wireCreditPlain(story: Pick<Story, "slug" | "sourceName" | "sourceUrl">): string {
  return `Summary from ${siteConfig.name}: ${storyWireUrl(story.slug)}. Original reporting by ${story.sourceName}: ${story.sourceUrl}.`;
}

export function wireCreditHtml(story: Pick<Story, "slug" | "sourceName" | "sourceUrl">): string {
  const url = storyWireUrl(story.slug);
  return `<p class="wire-credit">Summary from <a href="${escapeXml(url)}" rel="canonical">${escapeXml(siteConfig.name)}</a>. Original reporting by <a href="${escapeXml(story.sourceUrl)}">${escapeXml(story.sourceName)}</a>.</p>`;
}

function blocks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function itemParagraphs(story: Story, audience: WireAudience): string[] {
  if (audience === "kids") {
    const parts = blocks(story.kidSummary || story.dek);
    if (story.kidWord && story.kidDefinition) parts.push(`Word: ${story.kidWord}. ${story.kidDefinition}`);
    if (story.kidQuestions?.length) {
      const questions = story.kidQuestions.map((question, index) => `${index + 1}. ${question}`).join(" ");
      parts.push(`Questions to ask: ${questions}`);
    }
    return parts;
  }
  const parts = [story.dek, ...blocks(story.body)];
  if (story.correction) parts.push(`Correction: ${story.correction}`);
  for (const update of sortedUpdates(story).slice().reverse()) {
    let line = `Update (${formatStoryDate(update.date)}): ${update.text}`;
    if (update.sourceName && update.sourceUrl) {
      line += ` Update source: ${update.sourceName} (${update.sourceUrl}).`;
    }
    parts.push(line);
  }
  return parts;
}

function wireFigureHtml(story: Story): string {
  if (!wireMayIncludeImage(story)) return "";
  const image = storyFeedImage(story.image);
  const src = absoluteUrl(image.path);
  const size = image.width > 0 && image.height > 0 ? ` width="${image.width}" height="${image.height}"` : "";
  const caption = `${story.imageCaption} ${story.imageCredit}. ${story.imageLicense}.`;
  return `<figure><img src="${escapeXml(src)}" alt="${escapeXml(story.imageAlt)}"${size} /><figcaption>${escapeXml(caption)} <a href="${escapeXml(story.imageLicenseUrl)}">${escapeXml(story.imageLicense)}</a></figcaption></figure>`;
}

/** Full summary plus the credit line, as plain text. */
export function wireItemText(story: Story, audience: WireAudience = "general"): string {
  const paragraphs = itemParagraphs(story, audience).map((paragraph) => plainStoryText(paragraph));
  return [...paragraphs, wireCreditPlain(story)].join("\n\n");
}

/** Full summary plus the credit line, as HTML. The story link is rel=canonical. */
export function wireItemHtml(story: Story, audience: WireAudience = "general"): string {
  const paragraphs = itemParagraphs(story, audience)
    .map((paragraph) => `<p>${formatInlineHtml(paragraph)}</p>`)
    .join("");
  return `${wireFigureHtml(story)}${paragraphs}${wireCreditHtml(story)}`;
}

export type WireFeedInput = {
  stories?: Story[];
  selfPath: string;
  title: string;
  description: string;
  link: string;
  audience?: WireAudience;
};

function resolveStories(options: WireFeedInput): Story[] {
  const audience = options.audience ?? "general";
  const source = options.stories ?? (audience === "kids" ? getKidStories() : getPublishedStories());
  return source.slice(0, FEED_LIMIT);
}

function wireRssItem(story: Story, audience: WireAudience): string {
  const link = storyWireUrl(story.slug);
  const category = getCategory(story.category);
  const state = getStateByCode(story.state);
  const country = story.country === "US" ? undefined : getCountry(story.country);
  const photo = wireMayIncludeImage(story) ? `\n      ${rssMediaXml(story)}` : "";
  return `<item>
      <title>${escapeXml(story.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(storyPublishedIso(story)).toUTCString()}</pubDate>
      <description>${escapeXml(wireItemText(story, audience))}</description>
      <content:encoded>${xmlCdata(wireItemHtml(story, audience))}</content:encoded>
      <atom:link href="${escapeXml(link)}" rel="canonical" type="text/html" />
      <atom:link href="${escapeXml(story.sourceUrl)}" rel="via" type="text/html" title="${escapeXml(story.sourceName)}" />
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      ${category ? `<category>${escapeXml(category.label)}</category>` : ""}
      ${state ? `<category>${escapeXml(state.name)}</category>` : ""}
      ${country ? `<category>${escapeXml(country.name)}</category>` : ""}${photo}
    </item>`;
}

export function renderWireRss(options: WireFeedInput): string {
  const audience = options.audience ?? "general";
  const stories = resolveStories(options);
  const items = stories.map((story) => wireRssItem(story, audience)).join("\n");
  return renderRssChannel(
    {
      stories,
      selfPath: options.selfPath,
      title: options.title,
      description: options.description,
      link: options.link,
      media: stories.some((story) => wireMayIncludeImage(story)),
    },
    items,
  );
}

function wireJsonItem(story: Story, audience: WireAudience) {
  const link = storyWireUrl(story.slug);
  const category = getCategory(story.category);
  const state = getStateByCode(story.state);
  const country = story.country === "US" ? undefined : getCountry(story.country);
  const tags = [category?.label, state?.name, country?.name, story.city].filter((value): value is string => Boolean(value));
  const lead = audience === "kids" ? story.kidSummary || story.dek : story.dek;
  const item: Record<string, unknown> = {
    id: link,
    url: link,
    external_url: story.sourceUrl,
    title: story.title,
    summary: `${plainStoryText(lead)}\n\n${wireCreditPlain(story)}`,
    content_text: wireItemText(story, audience),
    content_html: wireItemHtml(story, audience),
    date_published: storyPublishedIso(story),
    date_modified: storyModifiedIso(story),
    authors: [{ name: siteConfig.editor.name, url: absoluteUrl("/about") }],
    tags,
    language: "en-US",
  };
  if (wireMayIncludeImage(story)) {
    const image = storyFeedImage(story.image);
    item.image = absoluteUrl(image.path);
    item.banner_image = absoluteUrl(image.path);
  }
  return item;
}

export function renderWireJson(options: WireFeedInput): string {
  const audience = options.audience ?? "general";
  const stories = resolveStories(options);
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: options.title,
    home_page_url: absoluteUrl(options.link),
    feed_url: absoluteUrl(options.selfPath),
    description: options.description,
    language: "en-US",
    icon: absoluteUrl(SQUARE_LOGO.path),
    authors: [{ name: siteConfig.editor.name, url: absoluteUrl("/about") }],
    items: stories.map((story) => wireJsonItem(story, audience)),
  };
  return `${JSON.stringify(feed, null, 2)}\n`;
}

export function renderNationalWireRss(): string {
  return renderWireRss({
    selfPath: WIRE_FEED_PATH,
    title: wireFeedTitle(),
    description: wireFeedDescription(),
    link: WIRE_PATH,
  });
}

export function renderNationalWireJson(): string {
  return renderWireJson({
    selfPath: WIRE_JSON_PATH,
    title: wireFeedTitle(),
    description: wireFeedDescription(),
    link: WIRE_PATH,
  });
}

export function renderKidsWireRss(): string {
  return renderWireRss({
    selfPath: WIRE_KIDS_FEED_PATH,
    title: wireKidsFeedTitle(),
    description: wireKidsFeedDescription(),
    link: WIRE_PATH,
    audience: "kids",
  });
}

export function renderKidsWireJson(): string {
  return renderWireJson({
    selfPath: WIRE_KIDS_JSON_PATH,
    title: wireKidsFeedTitle(),
    description: wireKidsFeedDescription(),
    link: WIRE_PATH,
    audience: "kids",
  });
}

export function renderStateWireRss(state: { slug: string; name: string; code: string }): string {
  return renderWireRss({
    stories: getByState(state.code),
    selfPath: wireStateFeedPath(state.slug),
    title: wireStateFeedTitle(state.name),
    description: wireStateFeedDescription(state.name),
    link: `/state/${state.slug}`,
  });
}

const STANDOUT_CAP = 5;

export type WireNewsletter = {
  start: string;
  end: string;
  rangeLabel: string;
  stories: Story[];
  /** True when the set is not the Mountain Time week that contains today. */
  earlierWeek: boolean;
  html: string;
  text: string;
};

function newsletterIntro(rangeLabel: string, count: number, earlierWeek: boolean): string {
  if (!count) return `No summary is ready to copy yet. Check ${absoluteUrl(WIRE_PATH)} after the next edition.`;
  const ready = count === 1 ? "1 summary is ready" : `${count} summaries are ready`;
  const permission = "You may republish them. Keep the credit under each one.";
  if (rangeLabel === "Latest summaries") {
    return `${ready}. This set is the latest summaries from ${siteConfig.name}. ${permission}`;
  }
  if (earlierWeek) {
    return `${ready} from ${rangeLabel}, the latest week with summaries. The current week does not have one yet. ${permission}`;
  }
  return `${ready} from ${siteConfig.name} for ${rangeLabel}. ${permission}`;
}

function newsletterHtml(stories: Story[], rangeLabel: string, earlierWeek: boolean): string {
  const intro = newsletterIntro(rangeLabel, stories.length, earlierWeek);
  if (!stories.length) {
    return `<h2>This week's 5 for your newsletter</h2>\n<p>${escapeXml(intro)}</p>`;
  }
  const articles = stories
    .map((story) => {
      const url = storyWireUrl(story.slug);
      const place = `${placeLabel(story)} · ${formatStoryDate(story.date)}`;
      return `<article>
<h3><a href="${escapeXml(url)}" rel="canonical">${escapeXml(story.title)}</a></h3>
<p>${escapeXml(place)}</p>
${wireItemHtml(story)}
</article>`;
    })
    .join("\n");
  return `<h2>This week's 5 for your newsletter</h2>
<p>${escapeXml(intro)}</p>
${articles}`;
}

function newsletterText(stories: Story[], rangeLabel: string, earlierWeek: boolean): string {
  const intro = newsletterIntro(rangeLabel, stories.length, earlierWeek);
  if (!stories.length) return `This week's 5 for your newsletter\n\n${intro}`;
  const items = stories
    .map((story, index) => {
      const url = storyWireUrl(story.slug);
      const place = `${placeLabel(story)} · ${formatStoryDate(story.date)}`;
      return `${index + 1}. ${story.title}\n${url}\n${place}\n\n${wireItemText(story)}`;
    })
    .join("\n\n");
  return `This week's 5 for your newsletter\n\n${intro}\n\n${items}`;
}

/** Up to five standout stories from the current Mountain Time week. */
export function wireNewsletter(stories = getPublishedStories(), today = mountainDay()): WireNewsletter {
  const current = weekStart(today);
  let cursor = current;
  for (let i = 0; i < 8; i++) {
    const end = addDays(cursor, 6);
    const group = stories.filter((story) => story.date >= cursor && story.date <= end);
    const picks = selectStandouts(group).slice(0, STANDOUT_CAP);
    if (picks.length) {
      const rangeLabel = formatWeekRange(cursor, end);
      const earlierWeek = cursor !== current;
      return {
        start: cursor,
        end,
        rangeLabel,
        stories: picks,
        earlierWeek,
        html: newsletterHtml(picks, rangeLabel, earlierWeek),
        text: newsletterText(picks, rangeLabel, earlierWeek),
      };
    }
    cursor = addDays(cursor, -7);
  }
  const picks = stories.slice(0, STANDOUT_CAP);
  const end = addDays(current, 6);
  return {
    start: current,
    end,
    rangeLabel: "Latest summaries",
    stories: picks,
    earlierWeek: true,
    html: newsletterHtml(picks, "Latest summaries", true),
    text: newsletterText(picks, "Latest summaries", true),
  };
}
