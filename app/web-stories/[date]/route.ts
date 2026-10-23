import { FEED_CACHE_CONTROL } from "@/lib/http-cache";
import { getWebStory, listWebStories, renderWebStoryDocument } from "@/lib/web-stories";

export const dynamic = "force-static";
export const dynamicParams = false;
export const runtime = "nodejs";

type Props = { params: Promise<{ date: string }> };

export function generateStaticParams() {
  return listWebStories().map((edition) => ({ date: edition.date }));
}

/** Raw AMP HTML. A page.tsx here would wrap the story in the site layout. */
export async function GET(_request: Request, { params }: Props) {
  const { date } = await params;
  const edition = getWebStory(date);
  if (!edition) return new Response("Not found", { status: 404 });
  return new Response(renderWebStoryDocument(edition), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
