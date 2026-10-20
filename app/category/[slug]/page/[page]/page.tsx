import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CategoryBrowse, categoryPageMetadata } from "../../browse";
import { CATEGORIES } from "@/lib/categories";
import { listingPageParams, parsePageParam } from "@/lib/paging";
import { getByCategory } from "@/lib/stories";

type Props = { params: Promise<{ slug: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listingPageParams(CATEGORIES.map((category) => ({ slug: category.slug, total: getByCategory(category.slug).length })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return categoryPageMetadata(slug, parsed);
}

export default async function CategoryPaged({ params }: Props) {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/category/${slug}`);
  return <CategoryBrowse slug={slug} page={parsed} />;
}
