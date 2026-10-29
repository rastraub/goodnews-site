import { getCategory } from "@/lib/categories";
import { countryName } from "@/lib/countries";
import { absoluteUrl, isWithinHours, storyPublishedIso } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { stateName } from "@/lib/states";
import { listWebStories } from "@/lib/web-stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function newsUrl(loc: string, date: string, title: string, keywords: string) {
  return `<url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteConfig.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${date}</news:publication_date>
      <news:title>${escapeXml(title)}</news:title>
      ${keywords ? `<news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`;
}

export function GET() {
  const stories = getPublishedStories().filter((story) => isWithinHours(story.date, 48));
  const editions = listWebStories().filter((edition) => isWithinHours(edition.date, 48));
  const urls = [
    ...stories.map((story) => {
      const place = story.country === "US" ? stateName(story.state) : countryName(story.country);
      const keywords = [getCategory(story.category)?.label, story.city, place].filter(Boolean).join(", ");
      return newsUrl(absoluteUrl(`/story/${story.slug}`), storyPublishedIso(story), story.title, keywords);
    }),
    ...editions.map((edition) => newsUrl(absoluteUrl(edition.path), edition.published, edition.title, "good news")),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
