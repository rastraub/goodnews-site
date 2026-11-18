import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { openGraphImage } from "@/lib/feed-image";
import {
  FAITH_FEED_PATH,
  FAITH_INDEX_DESCRIPTION,
  FAITH_INDEX_PATH,
  FAITH_INDEX_TITLE,
  bulletinsToPrerender,
  faithGratitudeSeason,
  faithSeasonLinks,
} from "@/lib/faith";
import { GIFT_PATH } from "@/lib/gift";
import { faithJsonLd, listingMeta } from "@/lib/seo";
import { formatLongDate, launchWeekStart } from "@/lib/weeks";
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const bulletins = bulletinsToPrerender();
  const newest = bulletins[bulletins.length - 1];
  return listingMeta({
    title: FAITH_INDEX_TITLE,
    description: FAITH_INDEX_DESCRIPTION,
    base: FAITH_INDEX_PATH,
    page: 1,
    total: 1,
    feedPath: FAITH_FEED_PATH,
    image: newest ? openGraphImage(newest) : undefined,
  });
}

export default function FaithIndexPage() {
  const bulletins = bulletinsToPrerender();
  const newestFirst = bulletins.slice().reverse();
  const launch = launchWeekStart();
  const season = faithGratitudeSeason();
  const seasonLinks = faithSeasonLinks();

  return (
    <div className="page-block">
      <JsonLd
        data={faithJsonLd({
          name: FAITH_INDEX_TITLE,
          description: FAITH_INDEX_DESCRIPTION,
          path: FAITH_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Faith communities", path: FAITH_INDEX_PATH },
          ],
          items: newestFirst.map((bulletin) => ({ name: bulletin.title, path: bulletin.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Faith communities</span>
        </p>
        <p className="kicker">For bulletins</p>
        <h1>Good news for faith communities.</h1>
        <p className="lede">
          A free weekly pack for people who edit a church, synagogue, mosque, temple, or other congregation newsletter, and for small-group and youth leaders. The tone is interfaith and non-sectarian. There is no scripture, no theology, and no endorsement of a tradition. Nothing here is about politics, crime, or a disaster.
        </p>
        <p className="lede">
          Weeks start on Monday, the same weeks as the <Link href="/week">roundup</Link>, beginning {formatLongDate(launch)}. A week appears once it has at least three gentle stories about kindness, community, service, volunteers, animals, or neighbors.
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          {newestFirst[0] ? <Link href={newestFirst[0].path}>This week&apos;s bulletin</Link> : null}
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>
          <Link href="/morning-announcements">Morning announcements</Link>
          <Link href={GIFT_PATH}>Gift the daily email</Link>
          <a href="#how-to-use">How to use this</a>
        </p>
        {season ? (
          <aside className="faith-season" aria-label="Gratitude and service season">
            <p className="kicker">Gratitude and service season</p>
            <p>
              From Thanksgiving through the end of December, a bulletin can point readers toward thanks and service. These are the same hubs already on the site.
            </p>
            <p className="link-pills">
              {seasonLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </p>
          </aside>
        ) : null}
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((bulletin) => (
              <Link key={bulletin.start} href={bulletin.path} className="week-row">
                <span className="week-row-img">
                  <StoryImage src={bulletin.image} alt={bulletin.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                </span>
                <span>
                  <span className="kicker">{bulletin.inProgress ? "So far" : "Bulletin pack"}</span>
                  <h2>{bulletin.rangeLabel}</h2>
                  <p>{bulletin.intro}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first bulletin is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              A week appears here once it has three gentle stories. Daily stories stay on the homepage until then.
            </p>
          </div>
        )}
      </div>
      <section className="page-block" id="how-to-use" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>How to use a pack</h2>
          <p>
            Open the week, copy the plain text or the simple HTML, and paste it into the bulletin. Each line credits {siteConfig.name} and the newsroom that reported the story. The half-page insert is for a printed newsletter. The service idea is a free or volunteer act tied to one story. It never asks readers to send money to {siteConfig.name}.
          </p>
          <p>
            The discussion prompts are written so any tradition can use them with a small group or a youth circle. Skip any line that does not fit your readers. Questions about a credit: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
