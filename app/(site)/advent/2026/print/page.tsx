import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { EmailSignup } from "@/components/email-signup";
import {
  ADVENT_PATH,
  ADVENT_PRINT_PATH,
  ADVENT_TITLE,
  ADVENT_YEAR,
  adventToday,
  getAdventCalendar,
} from "@/lib/advent";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ asOf?: string | string[] }> };

async function resolveToday(searchParams: Props["searchParams"]): Promise<string> {
  const query = await searchParams;
  const asOf = Array.isArray(query.asOf) ? query.asOf[0] : query.asOf;
  return adventToday(asOf);
}

export function generateMetadata(): Metadata {
  const title = "Printable Advent of Good News";
  const description = `A one-page December calendar for classrooms. Open doors name the story and the kind act. Later doors stay closed until that date in America/Denver.`;
  return {
    title,
    description,
    alternates: pageAlternates(ADVENT_PRINT_PATH),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  };
}

export default async function AdventPrintPage({ searchParams }: Props) {
  const today = await resolveToday(searchParams);
  const calendar = getAdventCalendar(today);

  return (
    <div className="page-block">
      <div className="wrap page-hero advent-print-page">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={ADVENT_PATH}>{ADVENT_TITLE}</Link>
          <span aria-hidden="true">/</span>
          <span>Print</span>
        </p>
        <p className="kicker">For classrooms · December {ADVENT_YEAR}</p>
        <h1>Advent of Good News</h1>
        <p className="teacher-note">
          One door a day, December 1 through 24. A dashed door opens that morning in America/Denver. Print this page for the class. Stories come from the {siteConfig.name} archive.
        </p>
        <div className="advent-sheet">
          {calendar.doors.map((door) => {
            const open = door.status === "open" && door.story;
            return (
              <article key={door.day} className={open ? "advent-cell" : "advent-cell is-locked"}>
                <b>{door.day}</b>
                {open && door.story ? (
                  <>
                    <p className="clip">{door.story.shortTitle ?? door.story.title}</p>
                    <p>{door.act.title}</p>
                  </>
                ) : (
                  <p>Opens December {door.day}</p>
                )}
              </article>
            );
          })}
        </div>
        <p className="print-source">
          {siteConfig.url}
          {ADVENT_PATH} · America/Denver
        </p>
        <div className="print-actions no-print">
          <PrintButton label="Print this calendar" />
          <Link href={ADVENT_PATH}>Back to the doors</Link>
          <Link href="/kids">Classroom stories</Link>
        </div>
      </div>
      <div className="no-print">
        <EmailSignup id="advent-print-email" />
      </div>
    </div>
  );
}
