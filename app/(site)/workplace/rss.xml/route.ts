import { renderWorkplaceRss } from "@/lib/workplace";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderWorkplaceRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
