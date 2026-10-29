import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { FIRST_INDEX_MONTH, formatMonthLabel, indexesToPrerender } from "@/lib/good-news-index";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Good News Index";

function indexDescription(count: number): string {
  const first = formatMonthLabel(FIRST_INDEX_MONTH);
  if (!count) {
    return `A monthly count of stories ${siteConfig.name} published, starting with ${first}. It is not a measure of how good a state is.`;
  }
  const editions = count === 1 ? "1 monthly edition" : `${count} monthly editions`;
  return `${editions} counting stories ${siteConfig.name} published since ${first}. State totals, per person, topics, classrooms, and How to help links. Not a measure of how good a state is.`;
}

export function generateMetadata(): Metadata {
  const editions = indexesToPrerender();
  return listingMeta({
    title: TITLE,
    description: indexDescription(editions.length),
    base: "/good-news-index",
    page: 1,
    total: 1,
  });
}

export default function GoodNewsIndexPage() {
  const editions = indexesToPrerender();
  const description = indexDescription(editions.length);
  const newestFirst = editions.slice().reverse();
  const first = formatMonthLabel(FIRST_INDEX_MONTH);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description,
          path: "/good-news-index",
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Good News Index", path: "/good-news-index" },
          ],
          stories: [],
          items: newestFirst.map((edition) => ({ name: edition.title, path: edition.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Good News Index</span>
        </p>
        <p className="kicker">Monthly index</p>
        <h1>Good News Index.</h1>
        <p className="lede">
          One page for each month of stories {siteConfig.name} published, starting with {first}. The open month stays marked month to date until the month is over.
          The count is our archive, not a score for how good a state is.
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          {newestFirst[0] ? <Link href={`${newestFirst[0].path}#methodology`}>Methodology</Link> : null}
          {newestFirst[0] ? <a href={newestFirst[0].csvPath}>Latest CSV</a> : null}
          <Link href="/stories">All stories</Link>
          <Link href="/local">States</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((edition) => (
              <Link key={edition.month} href={edition.path} className="week-row">
                {edition.image ? (
                  <span className="week-row-img">
                    <StoryImage src={edition.image} alt={edition.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                  </span>
                ) : null}
                <span>
                  <span className="kicker">{edition.inProgress ? "Month to date" : "Edition"}</span>
                  <h2>{edition.title}</h2>
                  <p>{edition.description}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first edition is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              {first} is the first month. It appears here once that month has a published story.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
