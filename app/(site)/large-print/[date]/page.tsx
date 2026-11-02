import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { LargePrintSheet } from "@/components/large-print-sheet";
import { openGraphImage } from "@/lib/feed-image";
import {
  LARGE_PRINT_PATH,
  largePrintEdition,
  largePrintEditionTitle,
  listLargePrintEditions,
} from "@/lib/large-print";
import { listingJsonLd, listingMeta, pageAlternates } from "@/lib/seo";
import { formatLongDate, mountainDay, parseIsoDate } from "@/lib/weeks";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ date: string }> };

export function generateStaticParams() {
  return listLargePrintEditions().map((edition) => ({ date: edition.date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!parseIsoDate(date)) return {};
  const edition = largePrintEdition(date);
  if (!edition) return {};
  const title = largePrintEditionTitle(date);
  const description = edition.stories.length
    ? `${edition.stories.length} verified good-news ${edition.stories.length === 1 ? "story" : "stories"} for ${formatLongDate(date)}, set in large print. Free to print and read aloud.`
    : `${formatLongDate(date)} does not have stories ready for a large-print sheet.`;
  if (!edition.indexable) {
    return {
      title,
      description,
      alternates: pageAlternates(edition.path),
      robots: { index: false, follow: true },
    };
  }
  const image = edition.stories[0];
  return listingMeta({
    title,
    description,
    base: edition.path,
    page: 1,
    total: 1,
    image: image ? openGraphImage(image) : undefined,
  });
}

export default async function LargePrintDatePage({ params }: Props) {
  const { date } = await params;
  if (!parseIsoDate(date)) notFound();
  const editions = listLargePrintEditions();
  const edition = editions.find((item) => item.date === date);
  if (!edition) notFound();
  const title = largePrintEditionTitle(date);
  const description = `${edition.stories.length} verified good-news stories for ${formatLongDate(date)}, in large print.`;

  return (
    <div className="page-block">
      {edition.stories.length ? (
        <JsonLd
          data={listingJsonLd({
            name: title,
            description,
            path: edition.path,
            crumbs: [
              { name: "Today", path: "/" },
              { name: "Large print", path: LARGE_PRINT_PATH },
              { name: formatLongDate(date), path: edition.path },
            ],
            stories: edition.stories,
          })}
        />
      ) : null}
      <LargePrintSheet edition={edition} today={mountainDay()} landing={false} editions={editions} />
    </div>
  );
}
