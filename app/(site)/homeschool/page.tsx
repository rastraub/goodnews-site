import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import { openGraphImage } from "@/lib/feed-image";
import {
  HOMESCHOOL_INDEX_DESCRIPTION,
  HOMESCHOOL_INDEX_PATH,
  HOMESCHOOL_INDEX_TITLE,
  homeschoolToPrerender,
} from "@/lib/homeschool";
import { classroomJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate, launchWeekStart } from "@/lib/weeks";
import { WORD_SEARCH_INDEX_PATH } from "@/lib/word-search";
import { AMBASSADORS_PATH } from "@/lib/ambassador-tip";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { MORNING_ANNOUNCEMENTS_PATH } from "@/lib/morning-announcements";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const packs = homeschoolToPrerender();
  const newest = packs[packs.length - 1];
  return listingMeta({
    title: HOMESCHOOL_INDEX_TITLE,
    description: HOMESCHOOL_INDEX_DESCRIPTION,
    base: HOMESCHOOL_INDEX_PATH,
    page: 1,
    total: 1,
    image: newest ? openGraphImage(newest) : undefined,
  });
}

export default function HomeschoolIndexPage() {
  const packs = homeschoolToPrerender();
  const newestFirst = packs.slice().reverse();
  const oldest = packs[0];
  const launch = launchWeekStart();

  return (
    <div className="page-block">
      <JsonLd
        data={classroomJsonLd({
          name: HOMESCHOOL_INDEX_TITLE,
          description: HOMESCHOOL_INDEX_DESCRIPTION,
          path: HOMESCHOOL_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Homeschool", path: HOMESCHOOL_INDEX_PATH },
          ],
          resources: newestFirst.map((pack) => ({ name: pack.title, path: pack.path })),
          learningResourceType: "collection of activities",
          audienceRoles: ["parent"],
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Homeschool</span>
        </p>
        <p className="kicker">For parents and co-ops</p>
        <h1>Good news for homeschool.</h1>
        <p className="lede">
          A free weekly current-events pack for families and co-ops, one page for each week since {formatLongDate(launch)}. Weeks start on Monday, the same weeks as the{" "}
          <Link href="/week">roundup</Link>. This is separate from the teacher packs on <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>. A week is listed once it has a story a parent can read aloud.
          {oldest ? ` The first pack is ${oldest.rangeLabel}.` : ""}
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href="/kids">Stories for kids</Link>
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday for teachers</Link>
          <Link href={WORD_SEARCH_INDEX_PATH}>Word search</Link>
          <Link href={MORNING_ANNOUNCEMENTS_PATH}>Morning announcements</Link>
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href={AMBASSADORS_PATH}>Kindness Ambassadors</Link>
          <Link href="/subscribe">Subscribe</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((pack) => (
              <Link key={pack.start} href={pack.path} className="week-row">
                <span className="week-row-img">
                  <StoryImage src={pack.image} alt={pack.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                </span>
                <span>
                  <span className="kicker">{pack.inProgress ? "So far" : "At home"}</span>
                  <h2>{pack.rangeLabel}</h2>
                  <p>{pack.intro}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first pack is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              A week appears here once it has a kid-friendly story with a read-aloud summary. Daily stories stay on the kids page until then.
            </p>
          </div>
        )}
      </div>
      <section className="page-block no-print" id="families" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>Email for families</h2>
          <p>
            The morning Top 5 comes to an adult address. We do not ask for a child&apos;s name, age, or school. Co-op leaders who want the classroom note can use the teacher list on{" "}
            <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>.
          </p>
          <EmailSignup variant="inline" interest="daily" id="homeschool-index-email" />
        </div>
      </section>
    </div>
  );
}
