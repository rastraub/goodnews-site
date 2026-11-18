import type { Metadata } from "next";
import Link from "next/link";
import { AdventDoorGrid, AdventRead } from "@/components/advent-views";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import {
  ADVENT_DESCRIPTION,
  ADVENT_PATH,
  ADVENT_PRINT_PATH,
  ADVENT_TITLE,
  ADVENT_YEAR,
  adventDoor,
  adventToday,
  getAdventCalendar,
} from "@/lib/advent";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { CALENDAR_PATH } from "@/lib/calendar-path";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ asOf?: string | string[] }> };

async function resolveToday(searchParams: Props["searchParams"]): Promise<string> {
  const query = await searchParams;
  const asOf = Array.isArray(query.asOf) ? query.asOf[0] : query.asOf;
  return adventToday(asOf);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const today = await resolveToday(searchParams);
  const calendar = getAdventCalendar(today);
  const todayDoor = calendar.doors.find((door) => door.date === today && door.story);
  const description = todayDoor?.story?.kidSummary
    ? `Door ${todayDoor.day} is open. ${ADVENT_DESCRIPTION}`
    : ADVENT_DESCRIPTION;
  return {
    ...listingMeta({
      title: ADVENT_TITLE,
      description,
      base: ADVENT_PATH,
      page: 1,
      total: 1,
    }),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  };
}

export default async function AdventPage({ searchParams }: Props) {
  const today = await resolveToday(searchParams);
  const calendar = getAdventCalendar(today);
  const todayDoor = adventDoor(calendar, Number(today.slice(8, 10)));
  const showToday = todayDoor?.status === "open" && todayDoor.story ? todayDoor : undefined;
  const openCount = calendar.doors.filter((door) => door.status === "open").length;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: ADVENT_TITLE,
          description: ADVENT_DESCRIPTION,
          path: ADVENT_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: ADVENT_TITLE, path: ADVENT_PATH },
          ],
          stories: [],
          items: calendar.doors.map((door) => ({
            name: door.status === "open" && door.story ? `December ${door.day}: ${door.story.title}` : `December ${door.day}`,
            path: door.path,
          })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Advent of Good News</span>
        </p>
        <p className="kicker">December 1–24, {ADVENT_YEAR}</p>
        <h1>Advent of Good News.</h1>
        <p className="lede">
          One door a day for families and classrooms. Each open door pairs a real story from the archive with one small, free act of kindness. Doors stay closed until that date in America/Denver. Nothing on this calendar is invented.
        </p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href={ADVENT_PRINT_PATH}>Print the calendar</Link>
          <Link href="/kids">For classrooms</Link>
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href={CALENDAR_PATH}>Good News Calendar</Link>
          {showToday ? <Link href={showToday.path}>Today&apos;s door</Link> : null}
        </p>
      </div>

      <div className="wrap">
        {showToday?.story ? (
          <AdventRead door={{ ...showToday, story: showToday.story }} listen heading="h2" />
        ) : openCount === 0 ? (
          <p className="lede">The first door opens December 1. Until then, every door is a teaser.</p>
        ) : (
          <p className="lede">All 24 doors are open. Pick any day below.</p>
        )}
        <h2 className="side-title">24 doors</h2>
        <p className="teacher-note">A gold outline is today. A dashed door opens on its own date. The clock is America/Denver.</p>
        <AdventDoorGrid doors={calendar.doors} today={today} />
        <p className="link-pills">
          <Link href={ADVENT_PRINT_PATH}>Printable one-page calendar</Link>
        </p>
      </div>
      <div className="no-print">
        <EmailSignup id="advent-email" />
      </div>
    </div>
  );
}
