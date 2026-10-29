import { renderRss } from "@/lib/feed";
import { getKidStories } from "@/lib/kids";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function GET() {
  const xml = renderRss({
    stories: getKidStories(),
    selfPath: "/kids/rss.xml",
    title: `${siteConfig.name}: For classrooms`,
    description: "Verified good news a teacher can read with a class.",
    link: "/kids",
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
