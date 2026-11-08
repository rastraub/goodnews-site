import { renderFaithRss } from "@/lib/faith";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderFaithRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
