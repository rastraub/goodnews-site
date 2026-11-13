import Link from "next/link";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { KindnessBingo } from "@/components/kindness-bingo";
import { ListenControls } from "@/components/listen-controls";
import { StoryImage } from "@/components/story-image";
import { cardSeed, type BingoAct } from "@/lib/bingo-card";
import { packQuestions, whereInTheWorld } from "@/lib/classroom-pack";
import { formatStoryDate } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import {
  BREAK_INDEX_PATH,
  BREAK_PARENT_NOTE,
  type BreakDirectoryEntry,
  type BreakPack,
} from "@/lib/break-pack";
import { kidListSegments } from "@/lib/listen-text";
import { siteConfig } from "@/site.config";

function statusLabel(status: BreakDirectoryEntry["status"]): string {
  if (status === "current") return "This break";
  if (status === "upcoming") return "Coming up";
  return "Past pack";
}

export function BreakEditionView({
  pack,
  acts,
  others,
  nested = false,
}: {
  pack: BreakPack;
  acts: BingoAct[];
  others: BreakDirectoryEntry[];
  nested?: boolean;
}) {
  const Title = nested ? "h2" : "h1";
  const Section = nested ? "h3" : "h2";
  const StoryTitle = nested ? "h4" : "h3";
  const seed = cardSeed(pack.edition.slug);

  return (
    <article className="break-pack pack print-sheet">
      <p className="kicker">{pack.edition.kicker}</p>
      <Title>{pack.edition.heading}</Title>
      <p className="lede">{pack.edition.lede}</p>
      <p className="byline">
        By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        {" · "}
        {pack.rangeLabel}
        {" · "}
        {statusLabel(pack.status)}
      </p>
      <div className="pack-actions no-print">
        <PrintButton label="Print this pack" />
      </div>
      <section className="pack-teacher" aria-labelledby={`${pack.edition.slug}-note`}>
        <Section id={`${pack.edition.slug}-note`}>A note for parents</Section>
        <p>{BREAK_PARENT_NOTE}</p>
      </section>
      <ListenControls
        className="listen-bar no-print"
        label="Read the stories aloud"
        groupLabel={`Read ${pack.stories.length} break-pack stories aloud`}
        segments={kidListSegments(pack.stories)}
      />
      <section aria-labelledby={`${pack.edition.slug}-contents`}>
        <Section id={`${pack.edition.slug}-contents`}>In this pack</Section>
        <ol className="questions">
          {pack.stories.map((story) => (
            <li key={story.slug}>
              <a href={`#story-${story.slug}`}>{story.title}</a>
              <span className="where-inline"> · {whereInTheWorld(story)}</span>
            </li>
          ))}
        </ol>
      </section>
      {pack.stories.map((story, index) => {
        const category = getCategory(story.category);
        const questions = packQuestions(story);
        return (
          <section className="break-story" id={`story-${story.slug}`} key={story.slug} aria-labelledby={`story-title-${story.slug}`}>
            <p className="kicker">
              {category?.label ?? story.category}
              <span className="dot" />
              Story {index + 1} of {pack.stories.length}
            </p>
            <StoryTitle id={`story-title-${story.slug}`}>{story.title}</StoryTitle>
            <p className="where">
              <svg className="ico" aria-hidden="true">
                <use href="#i-pin" />
              </svg>
              Where in the world: {whereInTheWorld(story)}
            </p>
            <p className="teacher-note">{formatStoryDate(story.date)}</p>
            <figure className="print-figure">
              <StoryImage
                src={story.image}
                alt={story.imageAlt}
                sizes="(max-width: 700px) 100vw, 720px"
                priority={index === 0 && !nested}
                treatment={story.imageTreatment}
              />
              <figcaption className="caption">{story.imageCaption}</figcaption>
            </figure>
            {story.kidSummary ? (
              <>
                <p className="kicker">Read aloud</p>
                <p className="teacher-note">Ages 6 to 12. An adult reads this.</p>
                <p className="read-aloud">{story.kidSummary}</p>
              </>
            ) : null}
            {questions.length ? (
              <>
                <p className="kicker">Talk about it</p>
                <ol className="questions">
                  {questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ol>
              </>
            ) : null}
            <p className="print-source">
              Source: <a href={story.sourceUrl}>{story.sourceName}</a>
              {" · "}
              <a href={`/story/${story.slug}`}>Full story</a>
            </p>
          </section>
        );
      })}
      <section className="break-bingo" id="kindness-bingo" aria-labelledby={`${pack.edition.slug}-bingo`}>
        <Section id={`${pack.edition.slug}-bingo`}>Kindness Bingo</Section>
        <p className="lede">
          A 5 by 5 card of small free kind acts. The center is free. Mark a square when you do it. New card shuffles a different set, and the link keeps that card.
        </p>
        <KindnessBingo acts={acts} defaultSeed={seed} />
      </section>
      <section className="break-activities" aria-labelledby={`${pack.edition.slug}-activities`}>
        <Section id={`${pack.edition.slug}-activities`}>Family good-news activities</Section>
        <p>These are pages already on {siteConfig.name}. Nothing here asks you to sign in.</p>
        <ul className="break-activity-list">
          {pack.activities.map((activity) => (
            <li key={activity.id}>
              <Link href={activity.href}>
                <strong>{activity.label}</strong>
                <span>{activity.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {others.length ? (
        <nav className="break-others no-print" aria-label="Other break packs">
          <Section>Other break packs</Section>
          <ul>
            <li>
              <Link href={BREAK_INDEX_PATH}>All break packs</Link>
            </li>
            {others.map((edition) => (
              <li key={edition.slug}>
                <Link href={edition.path}>
                  {edition.name}
                  <span>
                    {" "}
                    · {statusLabel(edition.status)} · {edition.rangeLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <p className="print-source">
        {siteConfig.name} · {pack.edition.heading} · {pack.rangeLabel}
      </p>
    </article>
  );
}
