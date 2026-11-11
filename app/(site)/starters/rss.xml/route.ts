import { renderStarterRss } from "@/lib/starters";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderStarterRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
