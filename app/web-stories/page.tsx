import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate } from "@/lib/weeks";
import { listWebStories, WEB_STORIES_INDEX } from "@/lib/web-stories";

export const dynamic = "force-static";

const TITLE = "Web stories";

function indexDescription(count: number): string {
  if (!count) return "Daily good news as a web story. Each day is a short set of checked stories.";
  const days = count === 1 ? "1 day" : `${count} days`;
  return `${days} of good news as web stories. Each page is one story, with the photo credit on the page and a link to the full article.`;
}

export function generateMetadata(): Metadata {
  const editions = listWebStories();
  const newest = editions[0];
  const lead = newest?.stories[0];
  return listingMeta({
    title: TITLE,
    description: indexDescription(editions.length),
    base: WEB_STORIES_INDEX,
    page: 1,
    total: 1,
    image: lead ? { url: lead.image, alt: lead.imageAlt } : undefined,
  });
}

export default function WebStoriesPage() {
  const editions = listWebStories();
  const description = indexDescription(editions.length);
  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description,
          path: WEB_STORIES_INDEX,
          crumbs: [
            { name: "Today", path: "/" },
            { name: TITLE, path: WEB_STORIES_INDEX },
          ],
          stories: [],
          items: editions.map((edition) => ({ name: edition.title, path: edition.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Web stories</span>
        </p>
        <p className="kicker">Daily</p>
        <h1>Good news, one story at a time.</h1>
        <p className="lede">
          Each day becomes a short web story from that day&apos;s top stories. Open one for the photos, then read the full article.
        </p>
        <p className="link-pills">
          <Link href="/">Today</Link>
          <Link href="/subscribe">Daily Top 5 email</Link>
          <Link href="/stories">All stories</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {editions.length ? (
          <div className="week-index">
            {editions.map((edition) => {
              const lead = edition.stories[0];
              if (!lead) return null;
              const more = edition.stories.length - 1;
              return (
                <a key={edition.date} href={edition.path} className="week-row">
                  <span className="week-row-img">
                    <StoryImage src={lead.image} alt={lead.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                  </span>
                  <span>
                    <span className="kicker">Web story</span>
                    <h2>{formatLongDate(edition.date)}</h2>
                    <p>
                      {lead.shortTitle ?? lead.title}
                      {more > 0 ? ` and ${more} more` : ""}
                    </p>
                  </span>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <h2>The first web story is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>It appears here when the day&apos;s stories publish.</p>
          </div>
        )}
      </div>
    </div>
  );
}
