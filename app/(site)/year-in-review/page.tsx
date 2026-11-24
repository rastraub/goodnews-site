import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { formatLongDate } from "@/lib/format";
import { pageAlternates } from "@/lib/seo";
import { STATES } from "@/lib/states";
import {
  getYearInReview,
  YEAR_IN_REVIEW_EDITIONS,
  YEAR_IN_REVIEW_INDEX_PATH,
  yearInReviewIndexable,
  yearInReviewIndexJsonLd,
  yearInReviewIndexPublic,
  yearInReviewPath,
  yearInReviewTitle,
} from "@/lib/year-in-review";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

const TITLE = "Good News Year in Review";
const DESCRIPTION =
  "Year-end roundups of verified good news. Each edition collects the best good news stories of that year for readers, teachers, and the newsletter.";

export function generateMetadata(): Metadata {
  const indexable = yearInReviewIndexPublic();
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: pageAlternates(YEAR_IN_REVIEW_INDEX_PATH),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
    robots: indexable
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 }
      : { index: false, follow: true },
    openGraph: {
      url: YEAR_IN_REVIEW_INDEX_PATH,
      title: TITLE,
      description: DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
    },
  };
}

export default function YearInReviewIndexPage() {
  return (
    <div className="page-block">
      <JsonLd data={yearInReviewIndexJsonLd()} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Year in Review</span>
        </p>
        <p className="kicker">Year-end roundup</p>
        <h1>Good News Year in Review</h1>
        <p className="lede">
          A shareable roundup of verified good news from the archive. Each year page keeps one story for every month
          and state the archive can match, plus the world, classrooms, first responders, and animals. Months with no
          story are left off. Nothing on these pages is invented.
        </p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
      </div>
      <div className="wrap">
        <div className="grid">
          {YEAR_IN_REVIEW_EDITIONS.map((edition) => {
            const review = getYearInReview(edition.year);
            const published = yearInReviewIndexable(edition.year);
            return (
              <article key={edition.year} className="card">
                <div className="body">
                  <div className="place">{published ? "In search" : "Preview"}</div>
                  <h2>
                    <Link href={yearInReviewPath(edition.year)}>{yearInReviewTitle(edition.year)}</Link>
                  </h2>
                  <p>
                    {review.numbers.stories} verified {review.numbers.stories === 1 ? "story" : "stories"} from{" "}
                    {edition.year}. {review.months.length} {review.months.length === 1 ? "month has" : "months have"} a
                    pick. {review.gaps.length} of {STATES.length} states and D.C. are still open.
                  </p>
                  <p>
                    {published ? (
                      <>Public since {formatLongDate(edition.publishOn)}.</>
                    ) : (
                      <>
                        Opens for search on {formatLongDate(edition.publishOn)}. You can read it now with the{" "}
                        <Link href={`${yearInReviewPath(edition.year)}?preview=1`}>preview link</Link>.
                      </>
                    )}
                  </p>
                  <Link className="btn btn-ink" href={`${yearInReviewPath(edition.year)}${published ? "" : "?preview=1"}`}>
                    Read {edition.year}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
