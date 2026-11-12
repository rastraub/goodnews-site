import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { CopyLink } from "@/components/copy-link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { getCategory } from "@/lib/categories";
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import { openGraphImage } from "@/lib/feed-image";
import { formatStoryDate } from "@/lib/format";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import {
  SERVICE_HOURS_PATH,
  TEENS_INDEX_PATH,
  serviceHoursHref,
  teensToPrerender,
  type TeenEdition,
} from "@/lib/teens";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return teensToPrerender().map((edition) => ({ start: edition.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const edition = teensToPrerender().find((item) => item.start === start);
  if (!edition) return {};
  return listingMeta({
    title: edition.title,
    description: edition.description,
    base: edition.path,
    page: 1,
    total: 1,
    image: edition.image ? openGraphImage({ image: edition.image, imageAlt: edition.imageAlt ?? edition.title }) : undefined,
  });
}

function WeekNav({ previous, next }: { previous?: TeenEdition<Story>; next?: TeenEdition<Story> }) {
  return (
    <nav className="pager no-print" aria-label="Teen weeks">
      {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
      <Link href={TEENS_INDEX_PATH}>All weeks</Link>
      {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
    </nav>
  );
}

export default async function TeenWeekPage({ params }: Props) {
  const { start } = await params;
  const editions = teensToPrerender();
  const index = editions.findIndex((edition) => edition.start === start);
  if (index < 0) notFound();
  const edition = editions[index];
  const previous = index > 0 ? editions[index - 1] : undefined;
  const next = index < editions.length - 1 ? editions[index + 1] : undefined;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: edition.title,
          description: edition.description,
          path: edition.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Good News for Teens", path: TEENS_INDEX_PATH },
            { name: edition.rangeLabel, path: edition.path },
          ],
          stories: edition.stories.map((pick) => pick.story),
        })}
      />
      <article className="wrap page-hero print-sheet pack">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={TEENS_INDEX_PATH}>Good News for Teens</Link>
          <span aria-hidden="true">/</span>
          <span>{edition.rangeLabel}</span>
        </p>
        <p className="kicker">{edition.inProgress ? "Good News for Teens · So far" : "Good News for Teens"}</p>
        <h1>{edition.heading}</h1>
        <p className="lede">{edition.intro}</p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
          {" · "}
          Week of {edition.rangeLabel}
        </p>
        <p className="link-pills no-print">
          <Link href="/kids">For younger students</Link>
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href={serviceHoursHref(edition.start)}>Service hours reflection</Link>
        </p>
        <div className="pack-actions no-print">
          <PrintButton label="Print this page" />
        </div>
        {edition.stories.length ? (
          <section className="pack-contents" aria-labelledby="in-this-week">
            <h2 id="in-this-week">In this week</h2>
            <ol className="questions">
              {edition.stories.map((pick) => (
                <li key={pick.story.slug}>
                  <a href={`#story-${pick.story.slug}`}>{pick.story.title}</a>
                  {pick.fromArchive ? <span className="where-inline"> · From the recent archive</span> : null}
                  {pick.pinned ? <span className="where-inline"> · Pinned by editors</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="pack-teacher" aria-labelledby="short-week">
            <h2 id="short-week">A short week</h2>
            <p>No story this week matched the filter for teens and students. This page does not invent one. The ideas below are a standing list, not a report of something that happened.</p>
          </section>
        )}
        {edition.stories.map((pick, storyIndex) => {
          const story = pick.story;
          const category = getCategory(story.category);
          return (
            <section className="pack-story" id={`story-${story.slug}`} key={story.slug} aria-labelledby={`story-title-${story.slug}`}>
              <p className="kicker">
                {category?.label ?? story.category}
                <span className="dot" />
                Story {storyIndex + 1} of {edition.stories.length}
                {pick.fromArchive ? " · From the recent archive" : ""}
                {pick.pinned ? " · Pinned by editors" : ""}
              </p>
              <h2 id={`story-title-${story.slug}`}>{story.title}</h2>
              <p className="where">{pick.roleLabel}</p>
              <p className="teacher-note">{formatStoryDate(story.date)}</p>
              <figure className="print-figure">
                <StoryImage src={story.image} alt={story.imageAlt} sizes="(max-width: 700px) 100vw, 720px" priority={storyIndex === 0} treatment={story.imageTreatment} />
              </figure>
              <p className="read-aloud">{story.dek}</p>
              <p className="print-source">
                Source: <a href={story.sourceUrl}>{story.sourceName}</a>
                {" · "}
                <Link href={`/story/${story.slug}`}>Full story</Link>
              </p>
            </section>
          );
        })}
        <section className="pack-challenge" aria-labelledby="your-move">
          <h2 id="your-move">Your move</h2>
          <p>Two or three ideas a club can run for free or close to it. They are matched to this week&apos;s stories when a story fits. They are not new facts about those stories.</p>
          <ol className="questions">
            {edition.moves.map((move) => (
              <li key={move.id}>
                <strong>{move.title}.</strong> {move.detail} {move.permission}
              </li>
            ))}
          </ol>
        </section>
        <section className="pack-teacher" aria-labelledby="advisory">
          <h2 id="advisory">Advisory prompts</h2>
          <p className="teacher-note">For homeroom or a club meeting. Stay with what the stories actually say. Do not ask anyone to share a medical or personal story.</p>
          <ol className="questions">
            {edition.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ol>
          <p>
            <Link href={serviceHoursHref(edition.start)}>Service hours reflection</Link>
            {" for this week. "}
            Your school or club decides what counts. {siteConfig.name} does not certify hours.
          </p>
        </section>
        <section className="pack-teacher no-print" aria-labelledby="newsletter">
          <h2 id="newsletter">Student council / club newsletter</h2>
          <p>Copy either version. It credits {siteConfig.name} and the original outlet, and it links back. It uses the public headline and summary. It does not add a name.</p>
          <div className="cite-actions">
            <CopyLink value={edition.newsletterText} label="Copy plain text" />
            <CopyLink value={edition.newsletterHtml} label="Copy HTML" />
          </div>
          <label className="field" htmlFor="teen-newsletter-text">
            Plain text
            <textarea id="teen-newsletter-text" readOnly value={edition.newsletterText} rows={12} />
          </label>
          <label className="field" htmlFor="teen-newsletter-html">
            HTML
            <textarea id="teen-newsletter-html" readOnly value={edition.newsletterHtml} rows={8} />
          </label>
        </section>
        <p className="print-source">
          {siteConfig.name} · Good News for Teens · {edition.rangeLabel} · <Link href={SERVICE_HOURS_PATH}>Service hours reflection</Link>
        </p>
        <WeekNav previous={previous} next={next} />
      </article>
    </div>
  );
}
