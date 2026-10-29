import { renderSmartNews } from "@/lib/feed";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderSmartNews(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
