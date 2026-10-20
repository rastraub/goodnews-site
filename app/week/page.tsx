import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { SITE_LAUNCH, formatLongDate, launchWeekStart, weeksToPrerender } from "@/lib/weeks";

export const dynamic = "force-static";

const TITLE = "This week in good news";

function indexDescription(count: number): string {
  if (!count) {
    return `Weekly roundups of verified good news. A week is published once it has at least 10 stories, starting with the week of ${formatLongDate(SITE_LAUNCH)}.`;
  }
  const rounds = count === 1 ? "1 weekly roundup" : `${count} weekly roundups`;
  return `${rounds} of verified good news since ${formatLongDate(SITE_LAUNCH)}. A week is published once it has at least 10 stories. The current week updates with each morning edition.`;
}

export function generateMetadata(): Metadata {
  const weeks = weeksToPrerender();
  const newest = weeks[weeks.length - 1];
  return listingMeta({
    title: TITLE,
    description: indexDescription(weeks.length),
    base: "/week",
    page: 1,
    total: 1,
    feedPath: "/week/rss.xml",
    image: newest ? { url: newest.image, alt: newest.imageAlt } : undefined,
  });
}

export default function WeekIndexPage() {
  const weeks = weeksToPrerender();
  const description = indexDescription(weeks.length);
  const newestFirst = weeks.slice().reverse();

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description,
          path: "/week",
          crumbs: [
            { name: "Today", path: "/" },
            { name: "This week", path: "/week" },
          ],
          stories: [],
          items: newestFirst.map((week) => ({ name: week.title, path: week.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>This week</span>
        </p>
        <p className="kicker">Weekly roundup</p>
        <h1>This week in good news.</h1>
        <p className="lede">
          One page for each week since {formatLongDate(SITE_LAUNCH)}. Weeks start on Monday, and the first one is the week of{" "}
          {formatLongDate(launchWeekStart())}. A page is added once the week has at least 10 stories. The current week stays marked so far until Sunday
          is over.
        </p>
        <p className="link-pills">
          <Link href="/week/rss.xml">Week RSS</Link>
          <Link href="/stories">All stories</Link>
          <Link href="/kids">For classrooms</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((week) => (
              <Link key={week.start} href={week.path} className="week-row">
                <span className="week-row-img">
                  <StoryImage src={week.image} alt={week.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                </span>
                <span>
                  <span className="kicker">{week.inProgress ? "So far" : "Week"}</span>
                  <h2>{week.title}</h2>
                  <p>{week.intro}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first roundup is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              A week appears here once it has at least 10 stories. Daily stories stay on the homepage until then.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
