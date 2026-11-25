import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryImage } from "@/components/story-image";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { openGraphImage } from "@/lib/feed-image";
import { formatStoryDate } from "@/lib/format";
import { explainerPath, getExplainer } from "@/lib/explainers";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { placeLabel } from "@/lib/present";
import { listingMeta } from "@/lib/seo";
import { STARTERS_FEED_PATH, STARTERS_INDEX_PATH } from "@/lib/starter-path";
import { getStarterWeeks, starterWeekJsonLd, type StarterPick, type StarterWeek } from "@/lib/starters";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return getStarterWeeks().map((week) => ({ start: week.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const week = getStarterWeeks().find((item) => item.start === start);
  if (!week) return {};
  const photo = week.picks.find((pick) => pick.story.image);
  return listingMeta({
    title: week.title,
    description: week.description,
    base: week.path,
    page: 1,
    total: 1,
    feedPath: STARTERS_FEED_PATH,
    image: photo?.story.image
      ? openGraphImage({ image: photo.story.image, imageAlt: photo.story.imageAlt || week.imageAlt })
      : undefined,
  });
}

export default async function StarterWeekPage({ params }: Props) {
  const { start } = await params;
  const weeks = getStarterWeeks();
  const index = weeks.findIndex((item) => item.start === start);
  if (index < 0) notFound();
  const week = weeks[index];
  if (!week) notFound();
  const previous = index > 0 ? weeks[index - 1] : undefined;
  const next = index < weeks.length - 1 ? weeks[index + 1] : undefined;
  const shareText = `${week.title}. Three free or cheap actions inspired by verified stories.`;

  return (
    <div className="page-block">
      <JsonLd data={starterWeekJsonLd(week)} />
      <div className="wrap page-hero kindness-layout no-print">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={STARTERS_INDEX_PATH}>Good News Starters</Link>
          <span aria-hidden="true">/</span>
          <span>{week.rangeLabel}</span>
        </p>
        <p className="kicker">{week.inProgress ? "This week" : "Good News Starters"}</p>
        <h1>{week.heading}</h1>
        <p className="lede">{week.description}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p>
          These are ideas to copy where you live. They do not ask you to contact anyone named in the story.
        </p>
        <p className="link-pills">
          {previous ? <Link href={previous.path}>Previous week</Link> : null}
          <Link href={STARTERS_INDEX_PATH}>All starters</Link>
          {next ? <Link href={next.path}>Next week</Link> : null}
          <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href="/explainers">Explainers</Link>
        </p>
        <div className="print-actions">
          <PrintButton label="Print this page" />
        </div>
        <div className="kind-share">
          <h2>Share this page</h2>
          <p>Copy the link or share it with an app on your device. This page does not send the link anywhere.</p>
          <ShareButtons title={week.title} path={week.path} text={shareText} />
        </div>
      </div>
      <div className="wrap kindness-layout starters-sheet print-sheet">
        <header className="print-only starters-print-head">
          <p className="kicker">Good News Starters</p>
          <h1>{week.heading}</h1>
          <p>{week.description}</p>
          <p className="byline">
            By {siteConfig.editor.name} · {siteConfig.owner.name}
          </p>
        </header>
        {week.picks.map((pick) => (
          <StarterAction key={pick.action.id} pick={pick} week={week} />
        ))}
        <nav className="pager no-print" aria-label="Good News Starters">
          {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
          <Link href={STARTERS_INDEX_PATH}>All starters</Link>
          {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
        </nav>
      </div>
      <div className="no-print">
        <EmailSignup id="starters-week-email" />
      </div>
    </div>
  );
}

function StarterAction({ pick, week }: { pick: StarterPick<Story>; week: StarterWeek<Story> }) {
  const { action, story } = pick;
  const explainer = action.explainerSlug ? getExplainer(action.explainerSlug) : undefined;
  const fromArchive = story.date < week.start || story.date > week.end;
  return (
    <article id={action.id} className="starter-action" aria-labelledby={`${action.id}-title`}>
      {story.image ? (
        <div className="week-row-img starter-thumb no-print">
          <StoryImage src={story.image} alt={story.imageAlt} sizes="220px" treatment={story.imageTreatment} />
        </div>
      ) : null}
      <h2 id={`${action.id}-title`}>{action.title}</h2>
      <p className="starter-credit">
        Inspired by <Link href={`/story/${story.slug}`}>{story.title}</Link>
        {" · "}
        {placeLabel(story)}
        {" · "}
        Reported by{" "}
        <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
          {story.sourceName}
        </a>
        {fromArchive ? ` · From the archive, ${formatStoryDate(story.date)}` : null}
      </p>
      <p>{action.why}</p>
      <h3>How to do it</h3>
      <ol>
        {action.steps.map((step, index) => (
          <li key={step.name} id={`${action.id}-step-${index + 1}`}>
            <strong>{step.name}. </strong>
            {step.text}
          </li>
        ))}
      </ol>
      <p className="starter-meta">
        <strong>Time and cost. </strong>
        {action.estimate}
      </p>
      {action.kidsNote ? (
        <p>
          <strong>Do it with kids. </strong>
          {action.kidsNote}
        </p>
      ) : null}
      {action.safetyNote ? (
        <p>
          <strong>Safety. </strong>
          {action.safetyNote}
        </p>
      ) : null}
      {explainer ? (
        <p className="starter-guide">
          <Link href={explainerPath(explainer.slug)}>Guide: {explainer.title}</Link>
        </p>
      ) : null}
    </article>
  );
}
