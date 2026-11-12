import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import {
  SERVICE_HOURS_PATH,
  TEENS_INDEX_DESCRIPTION,
  TEENS_INDEX_PATH,
  TEENS_INDEX_TITLE,
  teensToPrerender,
} from "@/lib/teens";
import { formatLongDate, launchWeekStart } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const editions = teensToPrerender();
  const newest = editions[editions.length - 1];
  return listingMeta({
    title: TEENS_INDEX_TITLE,
    description: TEENS_INDEX_DESCRIPTION,
    base: TEENS_INDEX_PATH,
    page: 1,
    total: 1,
    image: newest?.image ? openGraphImage({ image: newest.image, imageAlt: newest.imageAlt ?? TEENS_INDEX_TITLE }) : undefined,
  });
}

export default function TeensIndexPage() {
  const editions = teensToPrerender();
  const newestFirst = editions.slice().reverse();
  const launch = launchWeekStart();

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TEENS_INDEX_TITLE,
          description: TEENS_INDEX_DESCRIPTION,
          path: TEENS_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Good News for Teens", path: TEENS_INDEX_PATH },
          ],
          stories: [],
          items: newestFirst.map((edition) => ({ name: edition.title, path: edition.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Good News for Teens</span>
        </p>
        <p className="kicker">For teens and youth clubs</p>
        <h1>Good news for teens.</h1>
        <p className="lede">
          A weekly page of verified stories about teens, students, and young adults making a difference, for readers about 13 to 18, student councils, Key Club, NHS, and teachers of older students. Weeks start on Monday, the same weeks as the{" "}
          <Link href="/week">roundup</Link>, beginning {formatLongDate(launch)}. This page is written peer to peer. Younger classes stay on the kids pages.
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p className="link-pills">
          {newestFirst[0] ? <Link href={newestFirst[0].path}>This week</Link> : null}
          <Link href="/kids">For younger students</Link>
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href={SERVICE_HOURS_PATH}>Service hours reflection</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((edition) => (
              <Link key={edition.start} href={edition.path} className="week-row">
                {edition.image ? (
                  <span className="week-row-img">
                    <StoryImage src={edition.image} alt={edition.imageAlt ?? ""} sizes="(max-width: 700px) 100vw, 180px" />
                  </span>
                ) : null}
                <span>
                  <span className="kicker">{edition.inProgress ? "So far" : edition.shortPage ? "Short week" : "Week"}</span>
                  <h2>{edition.rangeLabel}</h2>
                  <p>{edition.intro}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first week is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>A week appears here once a story fits teens and students. Nothing on this page is invented.</p>
          </div>
        )}
      </div>
    </div>
  );
}
