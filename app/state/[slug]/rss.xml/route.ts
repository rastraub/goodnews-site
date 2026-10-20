import { renderRss } from "@/lib/feed";
import { getByState } from "@/lib/stories";
import { getStateBySlug, STATES } from "@/lib/states";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STATES.map((state) => ({ slug: state.slug }));
}

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return new Response("Not found", { status: 404 });
  const xml = renderRss({
    stories: getByState(state.code),
    selfPath: `/state/${state.slug}/rss.xml`,
    title: `${siteConfig.name}: ${state.name}`,
    description: `Verified good news from ${state.name}.`,
    link: `/state/${state.slug}`,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
