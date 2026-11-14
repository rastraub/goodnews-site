import { renderNationalWireJson } from "@/lib/wire";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderNationalWireJson(), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
    },
  });
}
