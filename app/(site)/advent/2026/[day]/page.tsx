import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdventPromptLine, AdventRead } from "@/components/advent-views";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import {
  ADVENT_DAY_COUNT,
  ADVENT_PATH,
  ADVENT_SHARE,
  ADVENT_TITLE,
  adventDayIndexable,
  adventDoor,
  adventLockedDescription,
  adventToday,
  formatAdventDate,
  getAdventCalendar,
  parseAdventDay,
} from "@/lib/advent";
import { listingJsonLd, listingMeta, xHandle } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

type Props = { params: Promise<{ day: string }>; searchParams: Promise<{ asOf?: string | string[] }> };

export function generateStaticParams() {
  return Array.from({ length: ADVENT_DAY_COUNT }, (_, index) => ({ day: String(index + 1) }));
}

async function loadDoor(params: Props["params"], searchParams: Props["searchParams"]) {
  const [{ day }, query] = await Promise.all([params, searchParams]);
  const number = parseAdventDay(day);
  if (!number) return undefined;
  const asOf = Array.isArray(query.asOf) ? query.asOf[0] : query.asOf;
  const today = adventToday(asOf);
  const calendar = getAdventCalendar(today);
  const door = adventDoor(calendar, number);
  if (!door) return undefined;
  return { door, today };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const loaded = await loadDoor(params, searchParams);
  if (!loaded) return { robots: { index: false, follow: false } };
  const { door } = loaded;
  const indexable = adventDayIndexable(door);
  const title = indexable && door.story ? `December ${door.day}: ${door.story.shortTitle ?? door.story.title}` : `December ${door.day} door`;
  const description = indexable && door.story?.kidSummary ? door.story.kidSummary : adventLockedDescription(door.day);
  return {
    ...listingMeta({
      title,
      description,
      base: door.path,
      page: 1,
      total: 1,
    }),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    twitter: {
      card: "summary_large_image",
      site: xHandle(),
      title,
      description,
    },
  };
}

export default async function AdventDayPage({ params, searchParams }: Props) {
  const loaded = await loadDoor(params, searchParams);
  if (!loaded) notFound();
  const { door, today } = loaded;
  const open = door.status === "open" && door.story;
  const title = open ? `December ${door.day}: ${door.story?.title}` : `Door ${door.day} opens December ${door.day}`;
  const description = open && door.story?.kidSummary ? door.story.kidSummary : adventLockedDescription(door.day);
  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: title,
          description,
          path: door.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: ADVENT_TITLE, path: ADVENT_PATH },
            { name: `December ${door.day}`, path: door.path },
          ],
          stories: open && door.story ? [{ slug: door.story.slug, title: door.story.title }] : [],
        })}
      />
      <div className="wrap page-hero print-sheet">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={ADVENT_PATH}>Advent of Good News</Link>
          <span aria-hidden="true">/</span>
          <span>December {door.day}</span>
        </p>
        {open && door.story ? (
          <>
            <AdventRead door={{ ...door, story: door.story }} listen byline />
            <p className="link-pills no-print">
              <Link href={door.printPath}>Print this card</Link>
              <Link href={ADVENT_PATH}>All 24 doors</Link>
              <Link href="/kids">For classrooms</Link>
            </p>
          </>
        ) : (
          <>
            <p className="kicker">{formatAdventDate(door.day)}</p>
            <h1>This door is still closed.</h1>
            <p className="lede">{adventLockedDescription(door.day)}</p>
            <p className="lede">
              The calendar runs from December 1 through December 24. Doors that have already opened stay on the calendar, with the story, the source, and that day&apos;s kind act. This page is a teaser until {formatAdventDate(door.day)}.
            </p>
            <p className="byline">
              By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
            </p>
            <p className="link-pills">
              <Link href={ADVENT_PATH}>Back to the calendar</Link>
              <Link href="/kids">For classrooms</Link>
            </p>
          </>
        )}
        <AdventPromptLine day={door.day} today={today} />
        <div className="no-print">
          <ShareButtons title={title} path={door.path} text={open ? ADVENT_SHARE : description} />
        </div>
      </div>
      <div className="no-print">
        <EmailSignup id={`advent-day-${door.day}`} />
      </div>
    </div>
  );
}
