import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { openGraphImage } from "@/lib/feed-image";
import { EXPLAINER_INDEX_PATH } from "@/lib/explainers";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { STARTERS_FEED_PATH, STARTERS_INDEX_PATH } from "@/lib/starter-path";
import { getStarterWeeks, latestStarterWeek, STARTERS_INDEX_DESCRIPTION, STARTERS_INDEX_TITLE, type StarterWeek } from "@/lib/starters";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const current = latestStarterWeek();
  const photo = current?.picks.find((pick) => pick.story.image);
  return listingMeta({
    title: STARTERS_INDEX_TITLE,
    description: STARTERS_INDEX_DESCRIPTION,
    base: STARTERS_INDEX_PATH,
    page: 1,
    total: 1,
    feedPath: STARTERS_FEED_PATH,
    image: photo ? openGraphImage({ image: photo.story.image ?? "", imageAlt: photo.story.imageAlt ?? current?.title ?? STARTERS_INDEX_TITLE }) : undefined,
  });
}

function statusLabel(week: StarterWeek<Story>): string {
  return week.inProgress ? "This week" : "Week";
}

export default function StartersIndexPage() {
  const weeks = getStarterWeeks();
  const newestFirst = weeks.slice().reverse();
  const current = latestStarterWeek(weeks);
  const archive = current ? newestFirst.filter((week) => week.start !== current.start) : newestFirst;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: STARTERS_INDEX_TITLE,
          description: STARTERS_INDEX_DESCRIPTION,
          path: STARTERS_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Good News Starters", path: STARTERS_INDEX_PATH },
          ],
          stories: [],
          items: newestFirst.map((week) => ({ name: week.title, path: week.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Good News Starters</span>
        </p>
        <p className="kicker">Copy it where you live</p>
        <h1>Good News Starters.</h1>
        <p className="lede">
          Each week, three small actions a reader can try at home. They are free or cheap, they stay local, and each one starts from a verified story on {siteConfig.name}.
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p className="link-pills">
          {current ? <Link href={current.path}>This week&apos;s starters</Link> : null}
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href={EXPLAINER_INDEX_PATH}>Explainers</Link>
          <Link href={STARTERS_FEED_PATH}>Starters RSS</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {current ? (
          <Link href={current.path} className="week-row kind-now">
            <StarterRowImage week={current} priority />
            <span>
              <span className="kicker">This week</span>
              <h2>{current.rangeLabel}</h2>
              <p>{current.description}</p>
            </span>
          </Link>
        ) : null}
        {archive.length ? (
          <div className="week-index" style={{ marginTop: current ? 16 : 0 }}>
            {archive.map((week) => (
              <Link key={week.start} href={week.path} className="week-row">
                <StarterRowImage week={week} />
                <span>
                  <span className="kicker">{statusLabel(week)}</span>
                  <h2>{week.rangeLabel}</h2>
                  <p>{week.description}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first week is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>A week appears here once a story can inspire a local action.</p>
          </div>
        )}
      </div>
      <div className="no-print">
        <EmailSignup id="starters-email" />
      </div>
    </div>
  );
}

function StarterRowImage({ week, priority = false }: { week: StarterWeek<Story>; priority?: boolean }) {
  if (!week.image) return null;
  return (
    <span className="week-row-img">
      <StoryImage src={week.image} alt={week.imageAlt} sizes="(max-width: 700px) 100vw, 180px" priority={priority} />
    </span>
  );
}
