import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/copy-link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryImage } from "@/components/story-image";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { openGraphImage } from "@/lib/feed-image";
import { formatStoryDate } from "@/lib/format";
import {
  KINDNESS_DAYS,
  KINDNESS_INDEX_PATH,
  formatChallengeDay,
  getKindnessChallenges,
  kindnessJsonLd,
} from "@/lib/kindness";
import { placeLabel } from "@/lib/present";
import { listingMeta } from "@/lib/seo";
import { addDays } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return getKindnessChallenges().map((challenge) => ({ start: challenge.week }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const challenge = getKindnessChallenges().find((item) => item.week === start);
  if (!challenge) return {};
  return listingMeta({
    title: challenge.title,
    description: challenge.description,
    base: challenge.path,
    page: 1,
    total: 1,
    image: openGraphImage(challenge.story),
  });
}

export default async function KindnessChallengePage({ params }: Props) {
  const { start } = await params;
  const challenges = getKindnessChallenges();
  const index = challenges.findIndex((item) => item.week === start);
  if (index < 0) notFound();
  const challenge = challenges[index];
  const previous = index > 0 ? challenges[index - 1] : undefined;
  const next = index < challenges.length - 1 ? challenges[index + 1] : undefined;
  const story = challenge.story;
  const shareText = `${challenge.shareText} — ${siteConfig.name}`;

  return (
    <div className="page-block">
      <JsonLd data={kindnessJsonLd(challenge)} />
      <div className="wrap page-hero kindness-layout">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <span aria-hidden="true">/</span>
          <span>{challenge.rangeLabel}</span>
        </p>
        <p className="kicker">{challenge.status === "this-week" ? "This week" : challenge.status === "upcoming" ? "Coming up" : "Kindness Challenge"}</p>
        <h1>{challenge.heading}</h1>
        <p className="lede">{challenge.challenge}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p className="link-pills no-print">
          {previous ? <Link href={previous.path}>Previous week</Link> : null}
          <Link href={KINDNESS_INDEX_PATH}>All challenges</Link>
          {next ? <Link href={next.path}>Next week</Link> : null}
          <Link href="/kids">Classroom stories</Link>
        </p>
      </div>
      <div className="wrap kindness-layout">
        <p className="why">{challenge.why}</p>
        <section aria-labelledby="ways">
          <h2 id="ways">Three easy ways</h2>
          <div className="kind-ways">
            <article className="kind-way">
              <h3>At school</h3>
              <p>{challenge.school}</p>
            </article>
            <article className="kind-way">
              <h3>At home</h3>
              <p>{challenge.home}</p>
            </article>
            <article className="kind-way">
              <h3>In the neighborhood</h3>
              <p>{challenge.neighborhood}</p>
            </article>
          </div>
        </section>
        <section className="kind-tracker print-sheet" id="tracker" aria-labelledby="tracker-title">
          <h2 id="tracker-title">Printable tracker</h2>
          <p>Check a box each day you try the challenge. A class can write its total in the tally box.</p>
          <ol className="kind-days">
            {KINDNESS_DAYS.map((day, dayIndex) => {
              const iso = addDays(challenge.week, dayIndex);
              return (
                <li key={day}>
                  <label>
                    <input type="checkbox" />
                    <span>
                      {day}, {formatChallengeDay(iso)}
                    </span>
                  </label>
                  <span className="kind-line" aria-hidden="true" />
                </li>
              );
            })}
          </ol>
          <label className="kind-tally">
            <span>
              <strong>Class tally.</strong> How many students joined in this week?
            </span>
            <input type="text" inputMode="numeric" aria-label="How many students joined in this week?" />
          </label>
          <div className="print-actions">
            <PrintButton label="Print the tracker" />
          </div>
        </section>
        <section aria-labelledby="story">
          <h2 id="story">The story that inspired it</h2>
          <figure className="print-figure">
            <StoryImage src={story.image} alt={story.imageAlt} sizes="(max-width: 700px) 100vw, 760px" priority treatment={story.imageTreatment} />
            <figcaption className="caption">
              {story.imageCaption}{" "}
              <a href={story.imageCreditUrl} rel="noopener noreferrer">
                {story.imageCredit}
              </a>
              {" · "}
              <a href={story.imageLicenseUrl} rel="noopener noreferrer">
                {story.imageLicense}
              </a>
            </figcaption>
          </figure>
          <h3>
            <Link href={`/story/${story.slug}`}>{story.title}</Link>
          </h3>
          <p className="teacher-note">
            {placeLabel(story)} · {formatStoryDate(story.date)}
          </p>
          <p>{story.dek}</p>
          <p className="print-source">
            Reported by{" "}
            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
              {story.sourceName}
            </a>
            . The summary on {siteConfig.name} is checked against that report.
          </p>
          <p className="link-pills no-print">
            <Link href={`/story/${story.slug}`}>Read the story</Link>
            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
              Original report
            </a>
          </p>
        </section>
        <section className="classroom-box" aria-labelledby="teacher">
          <h2 id="teacher">Teacher note</h2>
          <p>{challenge.teacherNote}</p>
          <p>
            This page is for an adult to lead. The <Link href="/kids">classroom section</Link> has more stories to read aloud.
          </p>
        </section>
        <section className="kind-share" aria-labelledby="share">
          <h2 id="share">Share this challenge</h2>
          <p>The share text does not give away the story.</p>
          <p className="kind-share-text">{challenge.shareText}</p>
          <div className="no-print">
            <ShareButtons title={challenge.title} path={challenge.path} text={shareText} />
            <p className="print-actions">
              <CopyLink value={`${shareText} ${siteConfig.url}${challenge.path}`} label="Copy share text" />
            </p>
          </div>
        </section>
        <p className="print-source">
          <Link href="/submit">Tell us how it went</Link>
          . Your note uses the same tip form as every other story, and it is emailed to {siteConfig.contactEmail}.
        </p>
        <nav className="pager no-print" aria-label="Kindness challenges">
          {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
          <Link href={KINDNESS_INDEX_PATH}>All challenges</Link>
          {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
        </nav>
      </div>
      <div className="no-print">
        <EmailSignup id="kindness-challenge-email" />
      </div>
    </div>
  );
}
