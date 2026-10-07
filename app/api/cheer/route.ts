import { getStory } from "@/lib/stories";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * Light cheer log. The number on the page is the story's base count plus
 * one if this browser has already cheered. A database can replace this later.
 */
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "cheer"), 30)) {
    return Response.json({ ok: false }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const slug = body && typeof body === "object" && "slug" in body ? String((body as { slug: unknown }).slug) : "";
  if (!slug || !getStory(slug)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  console.log(`[cheer] ${slug}`);
  return Response.json({ ok: true });
}
