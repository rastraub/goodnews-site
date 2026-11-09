import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import {
  COACHES_INDEX_DESCRIPTION,
  COACHES_INDEX_PATH,
  COACHES_INDEX_TITLE,
  COACHES_LEVEL,
  coachPacksToPrerender,
} from "@/lib/coaches-pack";
import { openGraphImage } from "@/lib/feed-image";
import { classroomJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate, launchWeekStart } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const packs = coachPacksToPrerender();
  const newest = packs[packs.length - 1];
  return listingMeta({
    title: COACHES_INDEX_TITLE,
    description: COACHES_INDEX_DESCRIPTION,
    base: COACHES_INDEX_PATH,
    page: 1,
    total: 1,
    image: newest?.image && newest.imageAlt ? openGraphImage({ image: newest.image, imageAlt: newest.imageAlt }) : undefined,
  });
}

export default function CoachesIndexPage() {
  const packs = coachPacksToPrerender();
  const newestFirst = packs.slice().reverse();
  const launch = launchWeekStart();

  return (
    <div className="page-block">
      <JsonLd
        data={classroomJsonLd({
          name: COACHES_INDEX_TITLE,
          description: COACHES_INDEX_DESCRIPTION,
          path: COACHES_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "For coaches", path: COACHES_INDEX_PATH },
          ],
          resources: newestFirst.map((pack) => ({ name: pack.title, path: pack.path })),
          learningResourceType: "collection of lesson plans",
          educationalLevel: COACHES_LEVEL,
          educationalRole: "coach",
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>For coaches</span>
        </p>
        <p className="kicker">For coaches and parent volunteers</p>
        <h1>Good news for coaches.</h1>
        <p className="lede">
          A Team Huddle for youth sports, one page for each week since {formatLongDate(launch)}. Weeks start on Monday, the same weeks as the{" "}
          <Link href="/week">roundup</Link>. Each page has a short read-aloud, discussion questions, and a free kindness challenge a team can do together.
          A week with few new matches borrows earlier stories so the archive does not skip a Monday.
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href="/kids">Classroom stories</Link>
          <Link href="/classroom">Good News Friday</Link>
          <Link href="/subscribe">Daily email</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((pack) => (
              <Link key={pack.start} href={pack.path} className="week-row">
                {pack.image ? (
                  <span className="week-row-img">
                    <StoryImage src={pack.image} alt={pack.imageAlt ?? ""} sizes="(max-width: 700px) 100vw, 180px" />
                  </span>
                ) : null}
                <span>
                  <span className="kicker">{pack.inProgress ? "So far" : pack.stories.length ? "Team Huddle" : "Open week"}</span>
                  <h2>{pack.rangeLabel}</h2>
                  <p>{pack.intro}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first huddle is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>A week appears here once the archive reaches launch week.</p>
          </div>
        )}
      </div>
      <section className="page-block no-print" id="daily-email" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>Daily email</h2>
          <p>The morning note is five verified stories. It goes to the adult who signs up. It does not ask for a player&apos;s name.</p>
          <EmailSignup variant="inline" id="coaches-index-email" />
        </div>
      </section>
    </div>
  );
}
