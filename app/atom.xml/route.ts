import { renderAtom } from "@/lib/feed";

export function GET() {
  return new Response(renderAtom(), {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
