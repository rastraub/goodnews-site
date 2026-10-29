import { renderWeekRss } from "@/lib/weeks";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderWeekRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
