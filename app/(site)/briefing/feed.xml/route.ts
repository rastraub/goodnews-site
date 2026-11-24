import { renderBriefingRss } from "@/lib/briefing";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderBriefingRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
