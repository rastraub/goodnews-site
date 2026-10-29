import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoodNewsEdition } from "@/components/good-news-edition";
import { indexesToPrerender } from "@/lib/good-news-index";
import { listingMeta } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ month: string }> };

export function generateStaticParams() {
  return indexesToPrerender().map((edition) => ({ month: edition.month }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  const edition = indexesToPrerender().find((item) => item.month === month);
  if (!edition) return {};
  return listingMeta({
    title: edition.title,
    description: edition.description,
    base: edition.path,
    page: 1,
    total: 1,
  });
}

export default async function GoodNewsIndexMonthPage({ params }: Props) {
  const { month } = await params;
  const editions = indexesToPrerender();
  const index = editions.findIndex((edition) => edition.month === month);
  if (index < 0) notFound();
  return (
    <GoodNewsEdition
      edition={editions[index]}
      previous={index > 0 ? editions[index - 1] : undefined}
      next={index < editions.length - 1 ? editions[index + 1] : undefined}
    />
  );
}
