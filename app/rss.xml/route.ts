import { renderRss } from "@/lib/feed";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
