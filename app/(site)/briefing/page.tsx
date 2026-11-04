import type { Metadata } from "next";
import Link from "next/link";
import { BriefingScript } from "@/components/briefing-script";
import { JsonLd } from "@/components/json-ld";
import { BRIEFING_PATH, BRIEFING_RSS_PATH, latestBriefing, loadBriefings } from "@/lib/briefing";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Daily briefing";

function description(): string {
  return `The daily Top 5 from ${siteConfig.name}, written as a short script you can read aloud.`;
}

export function generateMetadata(): Metadata {
  const briefing = latestBriefing();
  const image = briefing?.stories.find((story) => story.image);
  return listingMeta({
    title: TITLE,
    description: description(),
    base: BRIEFING_PATH,
    page: 1,
    total: 1,
    feedPath: BRIEFING_RSS_PATH,
    image: image?.image ? openGraphImage({ image: image.image, imageAlt: image.imageAlt || image.title }) : undefined,
  });
}

export default function BriefingIndex() {
  const briefings = loadBriefings();
  const latest = briefings[briefings.length - 1];
  const recent = briefings.slice().reverse();
  const text = description();

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: text,
          path: BRIEFING_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Daily briefing", path: BRIEFING_PATH },
          ],
          stories: [],
          listLimit: Math.max(recent.length, 1),
          items: recent.map((briefing) => ({
            name: briefing.titleText,
            path: briefing.path,
          })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Daily briefing</span>
        </p>
        <p className="kicker">Spoken Top 5</p>
        <h1>Today&apos;s good news, ready to read aloud.</h1>
        <p className="lede">{text}</p>
        <p className="link-pills">
          <Link href="/">Today&apos;s Top 5</Link>
          <Link href="/subscribe">Daily email</Link>
          <Link href="/feeds">All feeds</Link>
        </p>
        {latest ? (
          <div style={{ marginTop: 8 }}>
            <p className="kicker">
              {latest.weekday}, {formatLongDate(latest.date)}
            </p>
            <BriefingScript briefing={latest} />
          </div>
        ) : (
          <div className="empty">
            <h2>No briefing yet</h2>
            <p>A script appears when the day has five stories.</p>
          </div>
        )}
      </div>
      {recent.length > 1 ? (
        <div className="wrap" style={{ paddingTop: 8, paddingBottom: 36 }}>
          <h2 className="announce-subhead">Earlier briefings</h2>
          <ul className="announce-list">
            {recent.slice(1).map((briefing) => (
              <li key={briefing.date}>
                <Link href={briefing.path}>
                  <span className="kicker">{briefing.weekday}</span>
                  <strong>{formatLongDate(briefing.date)}</strong>
                  <span>
                    {briefing.wordCount} words · {briefing.readLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
