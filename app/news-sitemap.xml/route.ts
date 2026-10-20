import { getCategory } from "@/lib/categories";
import { countryName } from "@/lib/countries";
import { absoluteUrl, isWithinHours, storyPublishedIso } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { stateName } from "@/lib/states";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GET() {
  const stories = getPublishedStories().filter((story) => isWithinHours(story.date, 48));
  const urls = stories
    .map((story) => {
      const place = story.country === "US" ? stateName(story.state) : countryName(story.country);
      const keywords = [getCategory(story.category)?.label, story.city, place].filter(Boolean).join(", ");
      return `<url>
    <loc>${absoluteUrl(`/story/${story.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteConfig.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${storyPublishedIso(story)}</news:publication_date>
      <news:title>${escapeXml(story.title)}</news:title>
      ${keywords ? `<news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`;
    })
    .join("\n");

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
