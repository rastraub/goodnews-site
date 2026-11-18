import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailSignup } from "@/components/email-signup";
import { HuddlePrintButton } from "@/components/huddle-print-button";
import { JsonLd } from "@/components/json-ld";
import { CopyBlock } from "@/components/copy-block";
import { StoryImage } from "@/components/story-image";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { getCategory } from "@/lib/categories";
import {
  COACHES_INDEX_PATH,
  COACHES_LEVEL,
  coachPacksToPrerender,
  type CoachPack,
} from "@/lib/coaches-pack";
import { whereInTheWorld } from "@/lib/classroom-pack";
import { formatStoryDate } from "@/lib/format";
import { openGraphImage } from "@/lib/feed-image";
import { classroomJsonLd, listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return coachPacksToPrerender().map((pack) => ({ start: pack.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const pack = coachPacksToPrerender().find((item) => item.start === start);
  if (!pack) return {};
  return listingMeta({
    title: pack.title,
    description: pack.description,
    base: pack.path,
    page: 1,
    total: 1,
    image: pack.image && pack.imageAlt ? openGraphImage({ image: pack.image, imageAlt: pack.imageAlt }) : undefined,
  });
}

function PackNav({ previous, next }: { previous?: CoachPack<Story>; next?: CoachPack<Story> }) {
  return (
    <nav className="pager no-print" aria-label="Coach weeks">
      {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
      <Link href={COACHES_INDEX_PATH}>All weeks</Link>
      {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
    </nav>
  );
}

export default async function CoachesWeekPage({ params }: Props) {
  const { start } = await params;
  const packs = coachPacksToPrerender();
  const index = packs.findIndex((pack) => pack.start === start);
  if (index < 0) notFound();
  const pack = packs[index];
  const previous = index > 0 ? packs[index - 1] : undefined;
  const next = index < packs.length - 1 ? packs[index + 1] : undefined;
  const huddle = pack.stories[0];

  return (
    <div className="page-block">
      <JsonLd
        data={classroomJsonLd({
          name: pack.title,
          description: pack.description,
          path: pack.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "For coaches", path: COACHES_INDEX_PATH },
            { name: pack.rangeLabel, path: pack.path },
          ],
          resources: pack.stories.map((card) => ({ name: card.story.title, path: `/story/${card.story.slug}` })),
          learningResourceType: "lesson plan",
          educationalLevel: COACHES_LEVEL,
          educationalRole: "coach",
          timeRequired: "PT5M",
        })}
      />
      <article className="wrap page-hero print-sheet pack coaches-pack">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={COACHES_INDEX_PATH}>For coaches</Link>
          <span aria-hidden="true">/</span>
          <span>{pack.rangeLabel}</span>
        </p>
        <p className="kicker">{pack.inProgress ? "Team Huddle · So far" : "Team Huddle"}</p>
        <h1>{pack.heading}</h1>
        <p className="lede">{pack.intro}</p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          Week of {pack.rangeLabel}
        </p>
        <p className="link-pills no-print">
          <Link href="/kids">Classroom stories</Link>
          <Link href="/classroom">Good News Friday</Link>
          <Link href="/subscribe">Daily email</Link>
        </p>
        <div className="pack-actions no-print">
          <PrintButton label="Print this week" pdfLabel="Download PDF" />
          {huddle ? <HuddlePrintButton /> : null}
          <p className="hint" id="pdf-hint">
            Download PDF opens the print dialog. Choose Save as PDF. The huddle card button prints that card on half a page. Nothing is sent to a print service.
          </p>
        </div>
        <section className="pack-teacher" aria-labelledby="coach-note">
          <h2 id="coach-note">For coaches and parent volunteers</h2>
          <p>{pack.coachNote}</p>
        </section>
        {huddle ? (
          <section className="huddle-card" id="huddle-card" aria-labelledby="huddle-card-title">
            <p className="kicker">Team Huddle · {huddle.readAloudLabel}</p>
            <h2 id="huddle-card-title">{huddle.story.title}</h2>
            <p className="where">{whereInTheWorld(huddle.story)}</p>
            <p className="read-aloud">{huddle.summary}</p>
            {huddle.questions[0] ? (
              <p>
                <strong>Ask the team. </strong>
                {huddle.questions[0]}
              </p>
            ) : null}
            <p>
              <strong>Team kindness challenge. </strong>
              {huddle.challenge}
            </p>
            <p className="print-source">
              {siteConfig.name} · {pack.rangeLabel}
              {" · "}
              Source: {huddle.story.sourceName}
            </p>
          </section>
        ) : (
          <section className="pack-teacher" aria-labelledby="no-huddle">
            <h2 id="no-huddle">No huddle this week</h2>
            <p>
              Nothing published through {pack.rangeLabel} cleared the coaches filter. Injuries, deaths, violence, use of force, politics, gambling, and scandals stay off this page.
            </p>
          </section>
        )}
        {pack.stories.length ? (
          <section className="pack-contents" aria-labelledby="in-this-week">
            <h2 id="in-this-week">In this week</h2>
            <ol className="questions">
              {pack.stories.map((card) => (
                <li key={card.story.slug}>
                  <a href={`#story-${card.story.slug}`}>{card.story.title}</a>
                  <span className="where-inline"> · {whereInTheWorld(card.story)}</span>
                  {card.fromArchive ? <span className="where-inline"> · From the archive</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {pack.stories.map((card, storyIndex) => {
          const story = card.story;
          const category = getCategory(story.category);
          return (
            <section className="pack-story" id={`story-${story.slug}`} key={story.slug} aria-labelledby={`story-title-${story.slug}`}>
              <p className="kicker">
                {card.role === "huddle" ? "Team Huddle" : (category?.label ?? story.category)}
                <span className="dot" />
                Story {storyIndex + 1} of {pack.stories.length}
                {card.fromArchive ? " · From the archive" : ""}
              </p>
              <h2 id={`story-title-${story.slug}`}>{story.title}</h2>
              <p className="where">
                <svg className="ico" aria-hidden="true">
                  <use href="#i-pin" />
                </svg>
                {whereInTheWorld(story)}
              </p>
              <p className="teacher-note">
                {formatStoryDate(story.date)}
                {" · "}
                {card.readAloudLabel}
              </p>
              {card.fromArchive ? (
                <p className="teacher-note">This story ran before this week. It is here because the week had fewer new matches.</p>
              ) : null}
              <figure className="print-figure">
                <StoryImage
                  src={story.image}
                  alt={story.imageAlt}
                  sizes="(max-width: 700px) 100vw, 720px"
                  priority={storyIndex === 0}
                  treatment={story.imageTreatment}
                />
                {story.imageCaption ? <figcaption className="caption">{story.imageCaption}</figcaption> : null}
              </figure>
              <h3>Huddle summary</h3>
              <p className="teacher-note">
                {card.summarySource === "kidSummary"
                  ? "This is the classroom summary already on the story."
                  : "This story has no classroom summary. The deck is the read-aloud. It is not a new summary."}
              </p>
              <p className="read-aloud">{card.summary}</p>
              <h3>Discussion</h3>
              {card.questionSource === "prompts" ? (
                <p className="teacher-note">This story has no discussion questions on file. These prompts do not add facts.</p>
              ) : (
                <p className="teacher-note">These questions are the ones already on the story.</p>
              )}
              <ol className="questions">
                {card.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
              <h3>Team kindness challenge</h3>
              <p>{card.challenge}</p>
              <p className="print-source">
                Source: <a href={story.sourceUrl}>{story.sourceName}</a>
                {" · "}
                <a href={`${siteConfig.url}/story/${story.slug}`}>Full story on {siteConfig.name}</a>
              </p>
            </section>
          );
        })}
        {pack.stories.length ? (
          <section className="pack-challenge no-print" aria-labelledby="share-block">
            <h2 id="share-block">Copy for a newsletter or a group chat</h2>
            <p>
              Paste the plain text into a team chat. Paste the HTML into a league newsletter. Both credit {siteConfig.name} and the original outlet.
            </p>
            <h3>Plain text</h3>
            <CopyBlock value={pack.plainText} label="Copy plain text" />
            <h3>HTML</h3>
            <CopyBlock value={pack.html} label="Copy HTML" />
          </section>
        ) : null}
        <PackNav previous={previous} next={next} />
      </article>
      <section className="page-block no-print" id="daily-email" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>Daily email</h2>
          <p>Five verified stories, in the morning. The note goes to the adult who signs up.</p>
          <EmailSignup variant="inline" id={`coaches-week-email-${pack.start}`} />
        </div>
      </section>
    </div>
  );
}
