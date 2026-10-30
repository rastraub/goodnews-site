import { renderFollowUpsRss } from "@/lib/follow-ups";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderFollowUpsRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
