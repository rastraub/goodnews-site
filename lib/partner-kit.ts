import { formatStoryDate } from "./format";
import { absoluteUrl } from "./seo";
import { placeLabel } from "./present";
import { getByState, getPublishedStories, type Story } from "./stories";
import { getStateBySlug, type StateInfo } from "./states";
import { badgeAlt, badgePath, type BadgeFormat, type BadgeVariant } from "./badges";
import { escapeHtml } from "./tip-mail";
import { siteConfig } from "@/site.config";

/** Headlines inside the embed. Enough to be useful, small enough to stay light. */
export const WIDGET_STORY_COUNT = 5;

export type ShareLine = {
  id: string;
  label: string;
  text: string;
  note?: string;
};

export type EmbedItem = {
  href: string;
  title: string;
  meta: string;
};

function flat(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
}

export function storyPermalink(slug: string): string {
  return absoluteUrl(`/story/${slug}`);
}

export function badgeEmbedHtml(options: { variant: BadgeVariant; href: string; format: BadgeFormat }): string {
  const src = absoluteUrl(badgePath(options.variant, options.format));
  const href = absoluteUrl(options.href);
  const { width, height } = options.variant;
  return `<a href="${escapeHtml(href)}">\n  <img src="${escapeHtml(src)}" width="${width}" height="${height}" alt="${escapeHtml(badgeAlt())}">\n</a>`;
}

export function storyShareLines(story: { title: string; slug: string }): ShareLine[] {
  const url = storyPermalink(story.slug);
  const title = flat(story.title);
  const name = siteConfig.name;
  const lines: ShareLine[] = [
    {
      id: "featured",
      label: "Copy share text",
      text: `${title} — featured on ${name}. ${url}`,
    },
    {
      id: "part",
      label: "Copy another version",
      text: `A story we were part of is on ${name}: ${title} ${url}`,
    },
  ];
  const handle = siteConfig.social.x.trim();
  if (handle) {
    lines.push({
      id: "x",
      label: "Copy X post",
      text: `${title} ${url} (@${handle})`,
      note: `@${handle} is the only social account ${name} runs. Leave every other network untagged.`,
    });
  }
  return lines;
}

export function generalShareLines(): ShareLine[] {
  const url = siteConfig.url;
  const name = siteConfig.name;
  return [
    {
      id: "site",
      label: "Copy share text",
      text: `Verified good news, featured on ${name}. ${url}`,
    },
    {
      id: "credit",
      label: "Copy another version",
      text: `${name} covered a story from our community. The original reporting is linked from the story. ${url}`,
    },
  ];
}

export function widgetTitle(state?: StateInfo): string {
  return state ? `More good news from ${state.name}` : "More good news";
}

export function iframeSnippet(options: { place: string; title: string }): string {
  const src = absoluteUrl(`/embed/${options.place}`);
  return `<iframe src="${escapeHtml(src)}" title="${escapeHtml(options.title)}" width="100%" height="340" style="border:0;max-width:420px" loading="lazy"></iframe>`;
}

export function scriptSnippet(options: { place: string; title: string }): string {
  const src = absoluteUrl("/embed.js");
  return `<script async src="${escapeHtml(src)}" data-place="${escapeHtml(options.place)}" data-title="${escapeHtml(options.title)}"></script>`;
}

/**
 * Inserts the headline iframe. No network calls, no cookies, no host-page reads
 * beyond the script tag that loaded this file.
 */
export function embedScriptSource(): string {
  const origin = JSON.stringify(siteConfig.url);
  return `(function () {
  function mount(script) {
    if (!script || script.getAttribute("data-mounted") === "1") return;
    script.setAttribute("data-mounted", "1");
    var place = (script.getAttribute("data-place") || "latest").toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(place)) place = "latest";
    var title = script.getAttribute("data-title") || "More good news";
    var frame = document.createElement("iframe");
    frame.src = ${origin} + "/embed/" + place;
    frame.title = title;
    frame.loading = "lazy";
    frame.width = "100%";
    frame.height = "340";
    frame.style.border = "0";
    frame.style.maxWidth = "420px";
    frame.style.width = "100%";
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    script.insertAdjacentElement("afterend", frame);
  }
  if (document.currentScript) {
    mount(document.currentScript);
    return;
  }
  var pending = document.querySelectorAll('script[src*="/embed.js"]');
  for (var i = 0; i < pending.length; i++) mount(pending[i]);
})();
`;
}

export function toEmbedItem(story: Story): EmbedItem {
  return {
    href: storyPermalink(story.slug),
    title: flat(story.title),
    meta: `${placeLabel(story)} · ${formatStoryDate(story.date)}`,
  };
}

export function renderEmbedDocument(options: {
  heading: string;
  moreHref: string;
  moreLabel: string;
  items: EmbedItem[];
}): string {
  const heading = escapeHtml(options.heading);
  const items = options.items
    .map(
      (item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer"><span class="title">${escapeHtml(item.title)}</span><span class="meta">${escapeHtml(item.meta)}</span></a></li>`,
    )
    .join("");
  const list = items
    ? `<ol>${items}</ol>`
    : `<p class="empty">New stories will show up here.</p>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>${heading}</title>
<style>
  :root { color-scheme: light; }
  html, body { margin: 0; background: #fff; color: #1C2733; }
  body { font: 15px/1.4 system-ui, sans-serif; }
  .box { padding: 14px 16px 12px; }
  h1 { font-size: 13px; line-height: 1.3; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 12px; color: #8F5E00; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  a { color: #1C2733; text-decoration: none; }
  a:hover { color: #24537F; }
  ol a { display: block; }
  .title { display: block; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; overflow-wrap: anywhere; }
  .meta { display: block; margin-top: 2px; color: #5C6772; font-size: 12.5px; font-weight: 500; }
  .empty { margin: 0; color: #5C6772; }
  footer { margin-top: 12px; padding-top: 10px; border-top: 1px solid #EFE7DA; font-size: 13px; }
  footer a { color: #24537F; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
  a:focus-visible { outline: 2px solid #24537F; outline-offset: 2px; }
</style>
</head>
<body>
<section class="box">
  <h1>${heading}</h1>
  ${list}
  <footer><a href="${escapeHtml(options.moreHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(options.moreLabel)}</a></footer>
</section>
</body>
</html>
`;
}

export function embedDocumentForSlug(slug: string): string | undefined {
  if (slug === "latest") {
    const stories = getPublishedStories().slice(0, WIDGET_STORY_COUNT);
    return renderEmbedDocument({
      heading: widgetTitle(),
      moreHref: absoluteUrl("/"),
      moreLabel: `Latest on ${siteConfig.name}`,
      items: stories.map(toEmbedItem),
    });
  }
  const state = getStateBySlug(slug);
  if (!state) return undefined;
  const stories = getByState(state.code).slice(0, WIDGET_STORY_COUNT);
  return renderEmbedDocument({
    heading: widgetTitle(state),
    moreHref: absoluteUrl(`/state/${state.slug}`),
    moreLabel: `All ${state.name} stories on ${siteConfig.name}`,
    items: stories.map(toEmbedItem),
  });
}
