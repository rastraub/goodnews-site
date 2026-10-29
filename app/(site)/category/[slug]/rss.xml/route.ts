import { CATEGORIES, getCategory } from "@/lib/categories";
import { renderRss } from "@/lib/feed";
import { getByCategory } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return new Response("Not found", { status: 404 });
  const xml = renderRss({
    stories: getByCategory(category.slug),
    selfPath: `/category/${category.slug}/rss.xml`,
    title: `${siteConfig.name}: ${category.label}`,
    description: category.description,
    link: `/category/${category.slug}`,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
