import { toCard } from "@/lib/present";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { searchStories } from "@/lib/stories";

const RESULT_CAP = 48;

export async function GET(request: Request) {
  if (!rateLimit(clientKey(request, "search"), 30)) {
    return Response.json({ ok: false, error: "Too many searches. Wait a minute and try again." }, { status: 429 });
  }
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return Response.json({ ok: true, total: 0, stories: [] });
  }
  const matches = searchStories(query);
  return Response.json(
    { ok: true, total: matches.length, stories: matches.slice(0, RESULT_CAP).map(toCard) },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
