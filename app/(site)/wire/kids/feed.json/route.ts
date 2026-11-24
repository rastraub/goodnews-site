import { renderKidsWireJson } from "@/lib/wire";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderKidsWireJson(), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
    },
  });
}
