import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import {
  CLASSROOM_INDEX_DESCRIPTION,
  CLASSROOM_INDEX_PATH,
  CLASSROOM_INDEX_TITLE,
  packsToPrerender,
} from "@/lib/classroom-pack";
import { openGraphImage } from "@/lib/feed-image";
import { classroomJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate, launchWeekStart } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const packs = packsToPrerender();
  const newest = packs[packs.length - 1];
  return listingMeta({
    title: CLASSROOM_INDEX_TITLE,
    description: CLASSROOM_INDEX_DESCRIPTION,
    base: CLASSROOM_INDEX_PATH,
    page: 1,
    total: 1,
    image: newest ? openGraphImage(newest) : undefined,
  });
}

export default function ClassroomIndexPage() {
  const packs = packsToPrerender();
  const newestFirst = packs.slice().reverse();
  const oldest = packs[0];
  const launch = launchWeekStart();

  return (
    <div className="page-block">
      <JsonLd
        data={classroomJsonLd({
          name: CLASSROOM_INDEX_TITLE,
          description: CLASSROOM_INDEX_DESCRIPTION,
          path: CLASSROOM_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Good News Friday", path: CLASSROOM_INDEX_PATH },
          ],
          resources: newestFirst.map((pack) => ({ name: pack.title, path: pack.path })),
          learningResourceType: "collection of lesson plans",
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Good News Friday</span>
        </p>
        <p className="kicker">For teachers</p>
        <h1>Good News Friday.</h1>
        <p className="lede">
          A free printable pack of good news for kids, one page for each week since {formatLongDate(launch)}. Weeks start on Monday, the same weeks as the{" "}
          <Link href="/week">roundup</Link>, and the pack is meant for Friday. A week is listed once it has a story a teacher can read aloud.
          {oldest ? ` The first pack is ${oldest.rangeLabel}.` : ""}
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href="/kids">Classroom stories</Link>
          <Link href="/kids/print">Story of the day</Link>
          <a href="#teachers">Teacher email</a>
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
                  <span className="kicker">{pack.inProgress ? "So far" : "Good News Friday"}</span>
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
              A week appears here once it has a classroom story. Daily stories stay on the kids page until then.
            </p>
          </div>
        )}
      </div>
      <section className="page-block no-print" id="teachers" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>Teacher email</h2>
          <p>
            This list is for adults and educators. It sends a classroom note to your own email. Do not enter a student&apos;s address. We do not ask for a child&apos;s name, age, or school.
          </p>
          <EmailSignup variant="inline" interest="teachers" id="friday-index-teachers" />
        </div>
      </section>
    </div>
  );
}
