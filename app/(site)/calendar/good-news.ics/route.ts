import { FEED_CACHE_CONTROL } from "@/lib/http-cache";
import { buildIcs } from "@/lib/good-news-calendar";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildIcs(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="good-news-calendar.ics"',
      "Cache-Control": FEED_CACHE_CONTROL,
      "X-Robots-Tag": "noindex",
    },
  });
}
