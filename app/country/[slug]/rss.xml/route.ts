import { getCountryBySlug } from "@/lib/countries";
import { renderRss } from "@/lib/feed";
import { getByCountry } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const country = getCountryBySlug(slug);
  if (!country) return new Response("Not found", { status: 404 });
  const xml = renderRss({
    stories: getByCountry(country.code).slice(0, 50),
    selfPath: `/country/${country.slug}/rss.xml`,
    title: `${siteConfig.name}: ${country.name}`,
    description: `Verified good news from ${country.name}.`,
    link: `/country/${country.slug}`,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
