import { SMARTNEWS_LOGO, SMARTNEWS_LOGO_DARK } from "./brand";
import { CATEGORIES, getCategory } from "./categories";
import { getCountry } from "./countries";
import { editionYear } from "./format";
import { HELP_FEED_LINE } from "./help";
import { storyFeedImage } from "./feed-image";
import { absoluteUrl, storyModifiedIso, storyPublishedIso } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode, STATES } from "./states";
import { siteConfig } from "@/site.config";

export const FEED_LIMIT = 100;

/** SmartNews channel description. Spec: 30 characters or less. */
export const SMARTNEWS_DESCRIPTION = "Verified good news, daily";

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
  /** Declare the NewsBreak namespace. Used by the main RSS feed only. */
  newsBreak?: boolean;
};

export type FeedLink = {
  title: string;
  path: string;
  blurb: string;
};

export function feedCatalog(): { heading: string; feeds: FeedLink[] }[] {
  return [
    {
      heading: "Main",
      feeds: [
        { title: "Latest stories", path: "/rss.xml", blurb: "The main RSS feed." },
        { title: "Atom", path: "/atom.xml", blurb: "The same latest stories, as Atom." },
        { title: "SmartNews", path: "/smartnews.xml", blurb: "SmartFormat feed for the SmartNews app." },
        { title: "World", path: "/world/rss.xml", blurb: "Stories from outside the United States." },
        { title: "For classrooms", path: "/kids/rss.xml", blurb: "Stories a teacher can read with a class." },
      ],
    },
    {
      heading: "Sections",
      feeds: CATEGORIES.map((category) => ({
        title: category.label,
        path: `/category/${category.slug}/rss.xml`,
        blurb: category.description,
      })),
    },
    {
      heading: "States",
      feeds: STATES.map((state) => ({
        title: state.name,
        path: `/state/${state.slug}/rss.xml`,
        blurb: `Stories from ${state.name}.`,
      })),
    },
  ];
}

export function feedlySubscribeUrl(feedUrl: string) {
  return `https://feedly.com/i/subscription/feed/${encodeURIComponent(feedUrl)}`;
}

export function inoreaderSubscribeUrl(feedUrl: string) {
  return `https://www.inoreader.com/?add_feed=${encodeURIComponent(feedUrl)}`;
}

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

export function plainStoryText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/[*_]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dek plus body sentences, cut on a sentence boundary once the text is in the 300–400 character range. */
export function storyDescription(story: Pick<Story, "dek" | "body">): string {
  const dek = plainStoryText(story.dek);
  const body = plainStoryText(story.body);
  const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).filter(Boolean);
  let text = dek;
  for (const sentence of sentences) {
    const next = `${text} ${sentence}`.replace(/\s+/g, " ").trim();
    if (text.length >= 300 && next.length > 400) break;
    text = next;
    if (text.length >= 300) break;
  }
  return text;
}

function helpParagraph(story: Story): string {
  const parts = story.howToHelp.map((item) => {
    const line = HELP_FEED_LINE[item.kind];
    return `<a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a> — ${escapeHtml(line)}`;
  });
  return `<p><strong>How to help:</strong> ${parts.join(". ")}.</p>`;
}

export function storyHtml(story: Story): string {
  const image = storyFeedImage(story.image);
  const src = absoluteUrl(image.path);
  const size = image.width > 0 && image.height > 0 ? ` width="${image.width}" height="${image.height}"` : "";
  const paragraphs = story.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${inlineMarkdown(block)}</p>`)
    .join("");
  const caption = `${story.imageCaption} ${story.imageCredit}. ${story.imageLicense}.`;
  return [
    `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(story.imageAlt)}"${size} /><figcaption>${escapeHtml(caption)}</figcaption></figure>`,
    `<p>${escapeHtml(story.dek)}</p>`,
    paragraphs,
    helpParagraph(story),
    `<p>Read the original report: <a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(story.sourceName)}</a>.</p>`,
  ].join("");
}

function cdata(value: string) {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function keywords(story: Story): string[] {
  const category = getCategory(story.category);
  const state = getStateByCode(story.state);
  const country = story.country === "US" ? undefined : getCountry(story.country);
  return [category?.label, state?.name, country?.name, story.city].filter((value): value is string => Boolean(value));
}

function latestInstant(stories: Story[]): string {
  if (!stories.length) return new Date().toISOString();
  return stories.map((story) => storyModifiedIso(story)).sort().at(-1) ?? new Date().toISOString();
}

function rssItem(story: Story): string {
  const link = absoluteUrl(`/story/${story.slug}`);
  const image = storyFeedImage(story.image);
  const imageUrl = absoluteUrl(image.path);
  const category = getCategory(story.category);
  const state = getStateByCode(story.state);
  const country = story.country === "US" ? undefined : getCountry(story.country);
  const length = image.bytes ? ` length="${image.bytes}"` : "";
  const dimensions = image.width > 0 && image.height > 0 ? ` width="${image.width}" height="${image.height}"` : "";
  return `<item>
      <title>${escapeXml(story.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(storyPublishedIso(story)).toUTCString()}</pubDate>
      <description>${escapeXml(storyDescription(story))}</description>
      <content:encoded>${cdata(storyHtml(story))}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      ${category ? `<category>${escapeXml(category.label)}</category>` : ""}
      ${state ? `<category>${escapeXml(state.name)}</category>` : ""}
      ${country ? `<category>${escapeXml(country.name)}</category>` : ""}
      <media:content url="${escapeXml(imageUrl)}" medium="image" type="${image.mime}"${dimensions}>
        <media:title>${escapeXml(story.title)}</media:title>
        <media:description>${escapeXml(story.imageAlt)}</media:description>
        <media:credit role="photographer">${escapeXml(story.imageCredit)}</media:credit>
      </media:content>
      <media:thumbnail url="${escapeXml(imageUrl)}"${dimensions} />
      <enclosure url="${escapeXml(imageUrl)}" type="${image.mime}"${length} />
    </item>`;
}

export function renderRss(options: FeedOptions = {}): string {
  const { stories, self, title, description, link: channelLink } = feedView(options, "/rss.xml");
  const updated = new Date(latestInstant(stories)).toUTCString();
  const items = stories.map((story) => rssItem(story)).join("\n");
  const namespaces = [
    'xmlns:atom="http://www.w3.org/2005/Atom"',
    'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    'xmlns:dc="http://purl.org/dc/elements/1.1/"',
    'xmlns:media="http://search.yahoo.com/mrss/"',
    options.newsBreak ? 'xmlns:nb="https://www.newsbreak.com/"' : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" ${namespaces}>
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
    ${items}
  </channel>
</rss>`;
}

export function renderSmartNews(options: FeedOptions = {}): string {
  const { stories, self, title, link: channelLink } = feedView(
    { ...options, description: SMARTNEWS_DESCRIPTION },
    "/smartnews.xml",
  );
  const updated = new Date(latestInstant(stories)).toUTCString();
  const items = stories
    .map((story) => {
      const link = absoluteUrl(`/story/${story.slug}`);
      const image = storyFeedImage(story.image);
      const imageUrl = absoluteUrl(image.path);
      const dimensions = image.width > 0 && image.height > 0 ? ` width="${image.width}" height="${image.height}"` : "";
      const category = keywords(story).join(",");
      return `<item>
      <title>${escapeXml(story.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(storyDescription(story))}</description>
      <pubDate>${new Date(storyPublishedIso(story)).toUTCString()}</pubDate>
      <content:encoded>${cdata(storyHtml(story))}</content:encoded>
      ${category ? `<category>${escapeXml(category)}</category>` : ""}
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      <media:thumbnail url="${escapeXml(imageUrl)}"${dimensions} />
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:snf="http://www.smartnews.be/snf">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${channelLink}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SMARTNEWS_DESCRIPTION)}</description>
    <pubDate>${updated}</pubDate>
    <language>en</language>
    <copyright>© ${editionYear()} ${escapeXml(siteConfig.name)}</copyright>
    <ttl>15</ttl>
    <snf:logo><url>${absoluteUrl(SMARTNEWS_LOGO.path)}</url></snf:logo>
    <snf:darkModeLogo><url>${absoluteUrl(SMARTNEWS_LOGO_DARK.path)}</url></snf:darkModeLogo>
    ${items}
  </channel>
</rss>`;
}

export function renderAtom(options: FeedOptions = {}): string {
  const { stories, self, title, description, link: channelLink } = feedView(options, "/atom.xml");
  const updated = latestInstant(stories);
  const entries = stories
    .map((story) => {
      const link = absoluteUrl(`/story/${story.slug}`);
      const category = getCategory(story.category);
      const country = story.country === "US" ? undefined : getCountry(story.country);
      const image = storyFeedImage(story.image);
      const imageUrl = absoluteUrl(image.path);
      const length = image.bytes ? ` length="${image.bytes}"` : "";
      return `<entry>
      <title>${escapeXml(story.title)}</title>
      <link href="${link}" rel="alternate" type="text/html" />
      <id>${link}</id>
      <published>${storyPublishedIso(story)}</published>
      <updated>${storyModifiedIso(story)}</updated>
      <author><name>${escapeXml(siteConfig.editor.name)}</name></author>
      <summary>${escapeXml(storyDescription(story))}</summary>
      <content type="html">${escapeXml(storyHtml(story))}</content>
      ${category ? `<category term="${escapeXml(category.label)}" />` : ""}
      ${country ? `<category term="${escapeXml(country.name)}" />` : ""}
      <link rel="enclosure" href="${escapeXml(imageUrl)}" type="${image.mime}"${length} />
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
