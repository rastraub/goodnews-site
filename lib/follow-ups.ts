import { editionYear, formatStoryDate } from "./format";
import { absoluteUrl, followUpInstant } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import type { HelpLink, StoryUpdate } from "./story-schema";
import { siteConfig } from "@/site.config";

export const FOLLOW_UPS_PATH = "/follow-ups";
export const FOLLOW_UPS_FEED_PATH = "/follow-ups/rss.xml";

const FEED_LIMIT = 100;

export function sortedUpdates(story: { updates?: StoryUpdate[] }): StoryUpdate[] {
  return [...(story.updates ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function latestUpdate(story: { updates?: StoryUpdate[] }): StoryUpdate | undefined {
  return sortedUpdates(story)[0];
}

/** Calendar day of the story, or of its newest follow-up when that day is later. */
export function storyContentDate(story: { date: string; updates?: { date: string }[] }): string {
  let latest = story.date;
  for (const update of story.updates ?? []) {
    if (update.date > latest) latest = update.date;
  }
  return latest;
}

export type FollowUpEntry = {
  story: Story;
  update: StoryUpdate;
};

export function followUpEntries(stories = getPublishedStories()): FollowUpEntry[] {
  const entries: FollowUpEntry[] = [];
  for (const story of stories) {
    for (const update of story.updates) {
      entries.push({ story, update });
    }
  }
  entries.sort((a, b) => {
    if (a.update.date !== b.update.date) return a.update.date < b.update.date ? 1 : -1;
    return a.story.title.localeCompare(b.story.title);
  });
  return entries;
}

/** One row per story, newest follow-up first. */
export function storiesWithFollowUps(stories = getPublishedStories()): Story[] {
  return stories
    .filter((story) => story.updates.length > 0)
    .sort((a, b) => {
      const aDate = latestUpdate(a)?.date ?? a.date;
      const bDate = latestUpdate(b)?.date ?? b.date;
      if (aDate !== bDate) return aDate < bDate ? 1 : -1;
      return a.title.localeCompare(b.title);
    });
}

export type CurrentHelp = {
  links: HelpLink[];
  /** Set when the newest follow-up that lists help links replaced the original list. */
  updatedOn?: string;
};

function sameHelp(a: HelpLink[], b: HelpLink[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return Boolean(other) && item.url === other.url && item.label === other.label && item.kind === other.kind;
  });
}

/**
 * Sidebar and feed help links.
 * The newest follow-up that sets howToHelp replaces the original list.
 * A later follow-up that omits howToHelp leaves that replacement in place.
 * Repeating the original list clears the "now" label.
 */
export function currentHelp(story: { howToHelp: HelpLink[]; updates?: StoryUpdate[] }): CurrentHelp {
  const found = sortedUpdates(story).find((update) => update.howToHelp && update.howToHelp.length > 0);
  if (!found?.howToHelp || sameHelp(found.howToHelp, story.howToHelp)) return { links: story.howToHelp };
  return { links: found.howToHelp, updatedOn: found.date };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cdata(value: string) {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

/** HTML for a follow-up, inserted into feed bodies. Empty when the story has none. */
export function followUpFeedHtml(story: { updates?: StoryUpdate[] }): string {
  const updates = sortedUpdates(story);
  if (!updates.length) return "";
  return updates
    .map((update) => {
      const label = `Update, ${formatStoryDate(update.date)}`;
      const source =
        update.sourceName && update.sourceUrl
          ? `<p>Source: <a href="${escapeXml(update.sourceUrl)}">${escapeXml(update.sourceName)}</a>.</p>`
          : "";
      const help = update.howToHelp?.length
        ? `<p><strong>How to help now:</strong> ${update.howToHelp
            .map((item) => `<a href="${escapeXml(item.url)}">${escapeXml(item.label)}</a>`)
            .join(". ")}.</p>`
        : "";
      return `<p><strong>${escapeXml(label)}.</strong> ${escapeXml(update.text)}</p>${source}${help}`;
    })
    .join("");
}

function uniqueInstant(iso: string, used: Set<string>): string {
  let at = Date.parse(iso);
  while (used.has(new Date(at).toISOString())) at += 1000;
  const next = new Date(at).toISOString();
  used.add(next);
  return next;
}

/**
 * RSS items are follow-ups, newest first. Each item links to the story's original URL.
 * An empty channel is valid: no invented items, and no clock in lastBuildDate.
 */
export function renderFollowUpsRss(stories?: Story[]): string {
  const entries = followUpEntries(stories).slice(0, FEED_LIMIT);
  const self = absoluteUrl(FOLLOW_UPS_FEED_PATH);
  const link = absoluteUrl(FOLLOW_UPS_PATH);
  const used = new Set<string>();
  const items = entries
    .map(({ story, update }) => {
      const storyUrl = absoluteUrl(`/story/${story.slug}`);
      const instant = uniqueInstant(followUpInstant(story, update.date), used);
      const title = `Update, ${formatStoryDate(update.date)}: ${story.title}`;
      const html = [
        followUpFeedHtml({ updates: [update] }),
        `<p>This update is filed on the original story: <a href="${escapeXml(storyUrl)}">${escapeXml(story.title)}</a>.</p>`,
      ].join("");
      return `<item>
      <title>${escapeXml(title)}</title>
      <link>${storyUrl}</link>
      <guid isPermaLink="false">${escapeXml(`${storyUrl}#update-${update.date}`)}</guid>
      <pubDate>${new Date(instant).toUTCString()}</pubDate>
      <description>${escapeXml(update.text)}</description>
      <content:encoded>${cdata(html)}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
    </item>`;
    })
    .join("\n");
  const newest = entries[0] ? followUpInstant(entries[0].story, entries[0].update.date) : "";
  const lastBuild = newest ? `<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${siteConfig.name} follow-ups`)}</title>
    <link>${link}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(`Original updates on stories ${siteConfig.name} already published. Each item links to the story's original URL.`)}</description>
    <language>en-us</language>
    ${lastBuild}
    <copyright>© ${editionYear()} ${escapeXml(siteConfig.name)}</copyright>
    <managingEditor>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</managingEditor>
    <webMaster>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</webMaster>
    ${items}
  </channel>
</rss>`;
}
