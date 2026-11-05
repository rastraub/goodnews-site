import { renderNationalWireRss } from "@/lib/wire";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderNationalWireRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
