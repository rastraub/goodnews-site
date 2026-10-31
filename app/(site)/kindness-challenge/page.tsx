import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { openGraphImage } from "@/lib/feed-image";
import {
  KINDNESS_INDEX_PATH,
  getKindnessChallenges,
  thisWeeksChallenge,
  type ResolvedKindnessChallenge,
} from "@/lib/kindness";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { WORLD_KINDNESS_PATH } from "@/lib/world-kindness-day";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Kindness Challenge";
const DESCRIPTION =
  "One small, free act of kindness each week for classrooms and families. Each challenge is tied to a real good-news story, and kids can do it with people they already know.";

export function generateMetadata(): Metadata {
  const current = thisWeeksChallenge();
  return listingMeta({
    title: TITLE,
    description: DESCRIPTION,
    base: KINDNESS_INDEX_PATH,
    page: 1,
    total: 1,
    image: current ? openGraphImage(current.story) : undefined,
  });
}

function statusLabel(challenge: ResolvedKindnessChallenge): string {
  if (challenge.status === "this-week") return "This week";
  if (challenge.status === "upcoming") return "Coming up";
  return "Week";
}

export default function KindnessIndexPage() {
  const challenges = getKindnessChallenges();
  const newestFirst = challenges.slice().reverse();
  const current = thisWeeksChallenge(challenges);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: KINDNESS_INDEX_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Kindness Challenge", path: KINDNESS_INDEX_PATH },
          ],
          stories: [],
          items: newestFirst.map((challenge) => ({ name: challenge.title, path: challenge.path })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Kindness Challenge</span>
        </p>
        <p className="kicker">For classrooms and families</p>
        <h1>Kindness Challenge.</h1>
        <p className="lede">
          Every week, one small act of kindness a class or a family can do for free. It stays with people a child already knows, and it starts from a real story on {siteConfig.name}.
        </p>
        {current ? (
          <p className="link-pills">
            <Link href={current.path}>This week&apos;s challenge</Link>
            <Link href="/kids">Classroom stories</Link>
            <Link href={WORLD_KINDNESS_PATH}>World Kindness Day</Link>
            <Link href="/submit">Tell us how it went</Link>
          </p>
        ) : null}
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {current ? (
          <Link href={current.path} className="week-row kind-now">
            <span className="week-row-img">
              <StoryImage src={current.story.image} alt={current.story.imageAlt} sizes="(max-width: 700px) 100vw, 180px" treatment={current.story.imageTreatment} />
            </span>
            <span>
              <span className="kicker">This week&apos;s challenge</span>
              <h2>{current.rangeLabel}</h2>
              <p>{current.challenge}</p>
            </span>
          </Link>
        ) : null}
        {newestFirst.length ? (
          <div className="week-index" style={{ marginTop: current ? 16 : 0 }}>
            {newestFirst.map((challenge) => (
              <Link key={challenge.week} href={challenge.path} className="week-row">
                <span className="week-row-img">
                  <StoryImage src={challenge.story.image} alt={challenge.story.imageAlt} sizes="(max-width: 700px) 100vw, 180px" treatment={challenge.story.imageTreatment} />
                </span>
                <span>
                  <span className="kicker">{statusLabel(challenge)}</span>
                  <h2>{challenge.rangeLabel}</h2>
                  <p>{challenge.challenge}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first challenge is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>A week appears here once a classroom story is ready to inspire it.</p>
          </div>
        )}
      </div>
      <div className="no-print">
        <EmailSignup id="kindness-email" />
      </div>
    </div>
  );
}
