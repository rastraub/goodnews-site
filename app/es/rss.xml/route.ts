import { renderSpanishRss } from "@/lib/spanish-editions";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderSpanishRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
