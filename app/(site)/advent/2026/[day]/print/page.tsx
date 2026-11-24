import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { AdventPromptLine, AdventRead } from "@/components/advent-views";
import {
  ADVENT_DAY_COUNT,
  ADVENT_PATH,
  adventDoor,
  adventLockedDescription,
  adventToday,
  formatAdventDate,
  getAdventCalendar,
  parseAdventDay,
} from "@/lib/advent";
import { pageAlternates } from "@/lib/seo";
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
  const open = door.status === "open" && door.story;
  const title = open ? `Print door ${door.day}` : `Door ${door.day} is closed`;
  const description = open && door.story?.kidSummary ? door.story.kidSummary : adventLockedDescription(door.day);
  return {
    title,
    description,
    alternates: pageAlternates(door.path),
    robots: { index: false, follow: true },
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  };
}

export default async function AdventDayPrintPage({ params, searchParams }: Props) {
  const loaded = await loadDoor(params, searchParams);
  if (!loaded) notFound();
  const { door, today } = loaded;
  const open = door.status === "open" && door.story;

  return (
    <div className="page-block">
      <div className="wrap page-hero print-sheet">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={ADVENT_PATH}>Advent of Good News</Link>
          <span aria-hidden="true">/</span>
          <Link href={door.path}>December {door.day}</Link>
          <span aria-hidden="true">/</span>
          <span>Print</span>
        </p>
        <p className="kicker">For classrooms · {siteConfig.name}</p>
        {open && door.story ? (
          <>
            <AdventRead door={{ ...door, story: door.story }} listen byline />
            <AdventPromptLine day={door.day} today={today} />
            <div className="print-actions no-print">
              <PrintButton label="Print this card" />
              <Link href={door.path}>Back to this door</Link>
              <Link href={`${ADVENT_PATH}/print`}>Print the whole calendar</Link>
            </div>
          </>
        ) : (
          <>
            <h1>This card opens {formatAdventDate(door.day)}.</h1>
            <p className="lede">{adventLockedDescription(door.day)}</p>
            <p className="link-pills no-print">
              <Link href={ADVENT_PATH}>Back to the calendar</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
