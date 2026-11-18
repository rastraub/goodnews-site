import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import { openGraphImage } from "@/lib/feed-image";
import { HOMESCHOOL_INDEX_PATH } from "@/lib/homeschool";
import { classroomJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate, launchWeekStart } from "@/lib/weeks";
import {
  WORD_SEARCH_INDEX_DESCRIPTION,
  WORD_SEARCH_INDEX_PATH,
  WORD_SEARCH_INDEX_TITLE,
  wordSearchesToPrerender,
} from "@/lib/word-search";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const puzzles = wordSearchesToPrerender();
  const newest = puzzles[puzzles.length - 1];
  return listingMeta({
    title: WORD_SEARCH_INDEX_TITLE,
    description: WORD_SEARCH_INDEX_DESCRIPTION,
    base: WORD_SEARCH_INDEX_PATH,
    page: 1,
    total: 1,
    image: newest ? openGraphImage(newest) : undefined,
  });
}

export default function WordSearchIndexPage() {
  const puzzles = wordSearchesToPrerender();
  const newestFirst = puzzles.slice().reverse();
  const oldest = puzzles[0];
  const launch = launchWeekStart();

  return (
    <div className="page-block">
      <JsonLd
        data={classroomJsonLd({
          name: WORD_SEARCH_INDEX_TITLE,
          description: WORD_SEARCH_INDEX_DESCRIPTION,
          path: WORD_SEARCH_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Word search", path: WORD_SEARCH_INDEX_PATH },
          ],
          resources: newestFirst.map((puzzle) => ({ name: puzzle.title, path: puzzle.path })),
          learningResourceType: "collection of activities",
          audienceRoles: ["teacher", "parent"],
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Word search</span>
        </p>
        <p className="kicker">Printable puzzle</p>
        <h1>Weekly word search.</h1>
        <p className="lede">
          A free puzzle for classrooms and homeschool, one page for each week since {formatLongDate(launch)}. Weeks start on Monday, the same weeks as the{" "}
          <Link href="/week">roundup</Link>. Every word is a vocabulary word, a place, or a section already on that week&apos;s kid-friendly stories.
          {oldest ? ` The first puzzle is ${oldest.rangeLabel}.` : ""}
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href={HOMESCHOOL_INDEX_PATH}>Homeschool packs</Link>
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>
          <Link href="/kids">Stories for kids</Link>
          <Link href="/subscribe">Subscribe</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((puzzle) => (
              <Link key={puzzle.start} href={puzzle.path} className="week-row">
                <span className="week-row-img">
                  <StoryImage src={puzzle.image} alt={puzzle.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                </span>
                <span>
                  <span className="kicker">{puzzle.inProgress ? "So far" : puzzle.short ? "Short list" : "Word search"}</span>
                  <h2>{puzzle.rangeLabel}</h2>
                  <p>{puzzle.intro}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first puzzle is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              A week appears here once it has a kid-friendly story. Words are taken from those stories. None are added to fill the grid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
