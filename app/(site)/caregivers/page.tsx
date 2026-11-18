import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import {
  CAREGIVER_ACTIVITY_TIPS,
  CAREGIVERS_DESCRIPTION,
  CAREGIVERS_PATH,
  CAREGIVERS_TITLE,
  LARGE_PRINT_PATH,
  LIBRARIES_PATH,
  editionsToPrerender,
  familyCaregiversMonthNote,
  largePrintEditionPath,
} from "@/lib/caregivers";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate, launchWeekStart } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const editions = editionsToPrerender();
  const newest = editions[editions.length - 1];
  const note = familyCaregiversMonthNote();
  const description = note ? `${CAREGIVERS_DESCRIPTION} ${note}` : CAREGIVERS_DESCRIPTION;
  return listingMeta({
    title: CAREGIVERS_TITLE,
    description,
    base: CAREGIVERS_PATH,
    page: 1,
    total: 1,
    image: newest ? openGraphImage(newest) : undefined,
  });
}

export default function CaregiversIndexPage() {
  const editions = editionsToPrerender();
  const newestFirst = editions.slice().reverse();
  const newest = newestFirst[0];
  const oldest = editions[0];
  const note = familyCaregiversMonthNote();
  const description = note ? `${CAREGIVERS_DESCRIPTION} ${note}` : CAREGIVERS_DESCRIPTION;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: CAREGIVERS_TITLE,
          description,
          path: CAREGIVERS_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Caregivers", path: CAREGIVERS_PATH },
          ],
          stories: [],
          items: newestFirst.map((edition) => ({ name: edition.title, path: edition.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Caregivers</span>
        </p>
        <p className="kicker">For caregivers and group reading</p>
        <h1>Good news for caregivers.</h1>
        <p className="lede">
          A calm weekly list for family caregivers, activity directors, senior centers, and waiting rooms. Each edition is for group reading: five gentle stories to read aloud or leave open. When a week is thin, recent stories fill the rest. Weeks start on Monday, the same weeks as the <Link href="/week">roundup</Link>, from {formatLongDate(launchWeekStart())}.
          {oldest ? ` The first list is ${oldest.rangeLabel}.` : ""}
        </p>
        {note ? <p className="lede">{note}</p> : null}
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href={LARGE_PRINT_PATH}>Large-print edition</Link>
          {newest ? <Link href={largePrintEditionPath(newest.start)}>This week&apos;s large-print edition</Link> : null}
          <Link href={LIBRARIES_PATH}>Libraries</Link>
          {newest ? <Link href={newest.path}>This week</Link> : null}
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 8 }}>
        <section className="pack-teacher" aria-labelledby="caregiver-note">
          <h2 id="caregiver-note">For activity directors and family caregivers</h2>
          <ul className="questions">
            {CAREGIVER_ACTIVITY_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((edition) => (
              <Link key={edition.start} href={edition.path} className="week-row">
                <span className="week-row-img">
                  <StoryImage src={edition.image} alt={edition.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                </span>
                <span>
                  <span className="kicker">{edition.inProgress ? "So far" : "Group reading"}</span>
                  <h2>{edition.rangeLabel}</h2>
                  <p>{edition.lede}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first list is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              A week appears here once it has a gentle story. Daily stories stay on the home page until then.
            </p>
          </div>
        )}
      </div>
      <div className="no-print">
        <div className="wrap prose-page">
          <h2>Morning email</h2>
          <p>The daily Top 5 is five verified stories. The same no-politics rule applies, and it is short enough to read with coffee.</p>
        </div>
        <EmailSignup id="caregivers-email" />
      </div>
    </div>
  );
}
