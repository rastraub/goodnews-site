import { renderKidsWireRss } from "@/lib/wire";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderKidsWireRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
