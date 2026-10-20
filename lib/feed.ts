import fs from "fs";
import path from "path";
import { getCategory } from "./categories";
import { editionYear } from "./format";
import { placeLabel } from "./present";
import { absoluteUrl, publishedIso } from "./seo";
import { getCountry } from "./countries";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode } from "./states";
import { siteConfig } from "@/site.config";

export const FEED_LIMIT = 100;

export function feedStories(): Story[] {
  return getPublishedStories().slice(0, FEED_LIMIT);
}

export type FeedOptions = {
  stories?: Story[];
  selfPath?: string;
  title?: string;
  description?: string;
  /** Site path or absolute URL for the channel link. */
  link?: string;
};

function feedView(options: FeedOptions, fallbackSelf: string) {
  return {
    stories: (options.stories ?? feedStories()).slice(0, FEED_LIMIT),
    self: absoluteUrl(options.selfPath ?? fallbackSelf),
    title: options.title ?? siteConfig.name,
    description: options.description ?? siteConfig.description,
    link: absoluteUrl(options.link ?? "/"),
  };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtml(value: string) {
  return escapeXml(value);
}

function inlineMarkdown(text: string) {
  const escaped = escapeHtml(text);
  return escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string, href: string) => {
    return `<a href="${href}">${label}</a>`;
  });
}

export function storyHtml(story: Story): string {
  const image = absoluteUrl(story.image);
  const paragraphs = story.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${inlineMarkdown(block)}</p>`)
    .join("");
  const caption = `${story.imageCaption} ${story.imageCredit}. ${story.imageLicense}.`;
  return [
    `<figure><img src="${escapeHtml(image)}" alt="${escapeHtml(story.imageAlt)}" /><figcaption>${escapeHtml(caption)}</figcaption></figure>`,
    `<p>${escapeHtml(story.dek)}</p>`,
    paragraphs,
    `<p>Read the original report: <a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(story.sourceName)}</a>.</p>`,
  ].join("");
}

function cdata(value: string) {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function fileLength(publicPath: string): number | undefined {
  try {
    return fs.statSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, ""))).size;
  } catch {
    return undefined;
  }
}

export function renderRss(options: FeedOptions = {}): string {
  const { stories, self, title, description, link: channelLink } = feedView(options, "/rss.xml");
  const updated = stories[0] ? new Date(publishedIso(stories[0].date)).toUTCString() : new Date().toUTCString();
  const items = stories
    .map((story) => {
      const link = absoluteUrl(`/story/${story.slug}`);
      const category = getCategory(story.category);
      const state = getStateByCode(story.state);
      const country = story.country === "US" ? undefined : getCountry(story.country);
      const image = absoluteUrl(story.image);
      const thumb = absoluteUrl(story.image.replace(/\.webp$/, "-sm.webp"));
      const length = fileLength(story.image);
      const enclosure = length ? ` length="${length}"` : "";
      return `<item>
      <title>${escapeXml(story.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(publishedIso(story.date)).toUTCString()}</pubDate>
      <description>${escapeXml(story.dek)}</description>
      <content:encoded>${cdata(storyHtml(story))}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      <author>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</author>
      ${category ? `<category>${escapeXml(category.label)}</category>` : ""}
      ${state ? `<category>${escapeXml(state.name)}</category>` : ""}
      ${country ? `<category>${escapeXml(country.name)}</category>` : ""}
      <media:content url="${escapeXml(image)}" medium="image" type="image/webp">
        <media:title>${escapeXml(story.title)}</media:title>
        <media:description>${escapeXml(story.imageAlt)}</media:description>
        <media:credit role="photographer">${escapeXml(story.imageCredit)}</media:credit>
      </media:content>
      <media:thumbnail url="${escapeXml(thumb)}" />
      <enclosure url="${escapeXml(image)}" type="image/webp"${enclosure} />
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:snf="http://www.smartnews.be/snf">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${channelLink}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <copyright>© ${editionYear()} ${escapeXml(siteConfig.name)}</copyright>
    <managingEditor>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</managingEditor>
    <webMaster>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</webMaster>
    <snf:logo><url>${absoluteUrl("/publisher-logo.png")}</url></snf:logo>
    ${items}
  </channel>
</rss>`;
}

export function renderAtom(options: FeedOptions = {}): string {
  const { stories, self, title, description, link: channelLink } = feedView(options, "/atom.xml");
  const updated = stories[0] ? publishedIso(stories[0].date) : new Date().toISOString();
  const entries = stories
    .map((story) => {
      const link = absoluteUrl(`/story/${story.slug}`);
      const category = getCategory(story.category);
      const country = story.country === "US" ? undefined : getCountry(story.country);
      const image = absoluteUrl(story.image);
      return `<entry>
      <title>${escapeXml(story.title)}</title>
      <link href="${link}" rel="alternate" type="text/html" />
      <id>${link}</id>
      <published>${publishedIso(story.date)}</published>
      <updated>${publishedIso(story.date)}</updated>
      <author><name>${escapeXml(siteConfig.editor.name)}</name></author>
      <summary>${escapeXml(`${story.dek} ${placeLabel(story)}.`)}</summary>
      <content type="html">${escapeXml(storyHtml(story))}</content>
      ${category ? `<category term="${escapeXml(category.label)}" />` : ""}
      ${country ? `<category term="${escapeXml(country.name)}" />` : ""}
      <link rel="enclosure" href="${escapeXml(image)}" type="image/webp" />
    </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link href="${channelLink}" rel="alternate" type="text/html" />
  <link href="${self}" rel="self" type="application/atom+xml" />
  <id>${self}</id>
  <updated>${updated}</updated>
  <author>
    <name>${escapeXml(siteConfig.editor.name)}</name>
    <email>${escapeXml(siteConfig.contactEmail)}</email>
  </author>
  <rights>© ${editionYear()} ${escapeXml(siteConfig.name)}</rights>
  ${entries}
</feed>`;
}
