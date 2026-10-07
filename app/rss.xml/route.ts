import { getPublishedStories } from "@/lib/stories";
import { placeLabel } from "@/lib/present";
import { siteConfig } from "@/site.config";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GET() {
  const stories = getPublishedStories();
  const items = stories
    .map((story) => {
      const link = `${siteConfig.url}/story/${story.slug}`;
      return `<item>
        <title>${escapeXml(story.title)}</title>
        <link>${link}</link>
        <guid>${link}</guid>
        <pubDate>${new Date(`${story.date}T12:00:00Z`).toUTCString()}</pubDate>
        <description>${escapeXml(`${story.dek} Source: ${story.sourceName} (${story.sourceUrl}). ${placeLabel(story)}.`)}</description>
      </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en-us</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
