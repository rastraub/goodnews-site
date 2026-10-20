import type { Metadata } from "next";
import { CategoryBrowse, categoryPageMetadata } from "./browse";
import { CATEGORIES } from "@/lib/categories";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return categoryPageMetadata(slug, 1);
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  return <CategoryBrowse slug={slug} page={1} />;
}
