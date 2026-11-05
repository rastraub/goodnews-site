import { renderStateWireRss } from "@/lib/wire";
import { getStateBySlug, STATES } from "@/lib/states";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ state: string }> };

export function generateStaticParams() {
  return STATES.map((state) => ({ state: state.slug }));
}

export async function GET(_request: Request, { params }: Props) {
  const { state: slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return new Response("Not found", { status: 404 });
  return new Response(renderStateWireRss(state), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
