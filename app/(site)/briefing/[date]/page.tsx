import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefingScript } from "@/components/briefing-script";
import { JsonLd } from "@/components/json-ld";
import { BRIEFING_PATH, BRIEFING_RSS_PATH, loadBriefings, type DailyBriefing } from "@/lib/briefing";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate, parseIsoDate } from "@/lib/weeks";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ date: string }> };

export function generateStaticParams() {
  return loadBriefings().map((briefing) => ({ date: briefing.date }));
}

function lookup(date: string): DailyBriefing | undefined {
  return loadBriefings().find((briefing) => briefing.date === date);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!parseIsoDate(date)) return {};
  const briefing = lookup(date);
  if (!briefing) return {};
  const image = briefing.stories.find((story) => story.image);
  return listingMeta({
    title: briefing.titleText,
    description: briefing.description,
    base: briefing.path,
    page: 1,
    total: 1,
    feedPath: BRIEFING_RSS_PATH,
    image: image?.image ? openGraphImage({ image: image.image, imageAlt: image.imageAlt || image.title }) : undefined,
  });
}

export default async function BriefingDatePage({ params }: Props) {
  const { date } = await params;
  if (!parseIsoDate(date)) notFound();
  const briefings = loadBriefings();
  const index = briefings.findIndex((briefing) => briefing.date === date);
  if (index < 0) notFound();
  const briefing = briefings[index];
  const previous = index > 0 ? briefings[index - 1] : undefined;
  const next = index < briefings.length - 1 ? briefings[index + 1] : undefined;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: briefing.titleText,
          description: briefing.description,
          path: briefing.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Daily briefing", path: BRIEFING_PATH },
            { name: formatLongDate(date), path: briefing.path },
          ],
          stories: briefing.stories.map((story) => ({ slug: story.slug, title: story.title })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={BRIEFING_PATH}>Daily briefing</Link>
          <span aria-hidden="true">/</span>
          <span>{formatLongDate(date)}</span>
        </p>
        <p className="kicker">{briefing.weekday}</p>
        <h1>{briefing.titleText}.</h1>
        <BriefingScript briefing={briefing} />
        <nav className="pager no-print" aria-label="Briefings">
          {previous ? <Link href={previous.path}>Previous briefing</Link> : <span className="muted">Previous briefing</span>}
          <Link href={BRIEFING_PATH}>Latest briefing</Link>
          {next ? <Link href={next.path}>Next briefing</Link> : <span className="muted">Next briefing</span>}
        </nav>
      </div>
    </div>
  );
}
