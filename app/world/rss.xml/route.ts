import { renderRss } from "@/lib/feed";
import { getWorldStories } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function GET() {
  const xml = renderRss({
    stories: getWorldStories(),
    selfPath: "/world/rss.xml",
    title: `${siteConfig.name}: World`,
    description: "Verified good news from outside the United States.",
    link: "/world",
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
