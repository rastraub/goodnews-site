import { COUNTRIES, getCountryBySlug } from "@/lib/countries";
import { renderRss } from "@/lib/feed";
import { getByCountry } from "@/lib/stories";
import { siteConfig } from "@/site.config";

/**
 * Feeds for countries with no stories render on request instead of being
 * written during the build. Known country slugs still resolve. This route
 * is not force-static, so a country missing from generateStaticParams can
 * still answer.
 */
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COUNTRIES.filter((country) => getByCountry(country.code).length > 0).map((country) => ({
    slug: country.slug,
  }));
}

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
    },
  });
}
