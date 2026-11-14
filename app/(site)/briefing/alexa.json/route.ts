import { renderAlexaFeed } from "@/lib/briefing";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderAlexaFeed(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
