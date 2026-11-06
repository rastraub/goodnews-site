import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { CopyLink } from "@/components/copy-link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { getCategory } from "@/lib/categories";
import {
  CAREGIVER_ACTIVITY_TIPS,
  CAREGIVERS_PATH,
  LARGE_PRINT_PATH,
  LIBRARIES_PATH,
  caregiverEditionText,
  editionsToPrerender,
  familyCaregiversMonthNote,
  largePrintEditionPath,
  type CaregiverEdition,
} from "@/lib/caregivers";
import { openGraphImage } from "@/lib/feed-image";
import { formatStoryDate } from "@/lib/format";
import { placeLabel } from "@/lib/present";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return editionsToPrerender().map((edition) => ({ start: edition.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const edition = editionsToPrerender().find((item) => item.start === start);
  if (!edition) return {};
  const note = familyCaregiversMonthNote();
  const description = note ? `${edition.description} ${note}` : edition.description;
  return listingMeta({
    title: edition.title,
    description,
    base: edition.path,
    page: 1,
    total: 1,
    image: openGraphImage(edition),
  });
}

function EditionNav({ previous, next }: { previous?: CaregiverEdition<Story>; next?: CaregiverEdition<Story> }) {
  return (
    <nav className="pager no-print" aria-label="Caregiver editions">
      {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
      <Link href={CAREGIVERS_PATH}>All weeks</Link>
      {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
    </nav>
  );
}

export default async function CaregiverEditionPage({ params }: Props) {
  const { start } = await params;
  const editions = editionsToPrerender();
  const index = editions.findIndex((edition) => edition.start === start);
  if (index < 0) notFound();
  const edition = editions[index];
  const previous = index > 0 ? editions[index - 1] : undefined;
  const next = index < editions.length - 1 ? editions[index + 1] : undefined;
  const note = familyCaregiversMonthNote();

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: edition.title,
          description: note ? `${edition.description} ${note}` : edition.description,
          path: edition.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Caregivers", path: CAREGIVERS_PATH },
            { name: edition.rangeLabel, path: edition.path },
          ],
          stories: edition.stories,
        })}
      />
      <article className="wrap page-hero print-sheet">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={CAREGIVERS_PATH}>Caregivers</Link>
          <span aria-hidden="true">/</span>
          <span>{edition.rangeLabel}</span>
        </p>
        <p className="kicker">{edition.inProgress ? "For caregivers · So far" : "For caregivers · Group reading"}</p>
        <h1>{edition.heading}</h1>
        <p className="lede">{edition.lede}</p>
        {note ? <p className="lede">{note}</p> : null}
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          Week of {edition.rangeLabel}
        </p>
        <div className="pack-actions no-print">
          <CopyLink value={caregiverEditionText(edition)} label="Copy this week's list" />
          <PrintButton label="Print this list" />
        </div>
        <section className="pack-teacher" aria-labelledby="caregiver-note">
          <h2 id="caregiver-note">For activity directors and family caregivers</h2>
          <ul className="questions">
            {CAREGIVER_ACTIVITY_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          <p className="print-source">
            <Link href={LARGE_PRINT_PATH}>Large-print edition</Link>
            {" · "}
            <Link href={largePrintEditionPath(edition.start)}>This week&apos;s large-print edition</Link>
            {" · "}
            <Link href={LIBRARIES_PATH}>Libraries</Link>
          </p>
        </section>
        <ol className="caregiver-list">
          {edition.stories.map((story, storyIndex) => {
            const category = getCategory(story.category);
            return (
              <li key={story.slug} id={`story-${story.slug}`}>
                <p className="kicker">
                  {category?.label ?? story.category}
                  <span className="dot" />
                  Story {storyIndex + 1} of {edition.stories.length}
                  <span className="dot" />
                  {placeLabel(story)}
                </p>
                <h2>
                  <Link href={`/story/${story.slug}`}>{story.title}</Link>
                </h2>
                <p>{story.dek}</p>
                <p className="print-source">
                  {formatStoryDate(story.date)}
                  {story.sourceName ? ` · ${story.sourceName}` : ""}
                  {" · "}
                  <Link href={`/story/${story.slug}`}>Read the story</Link>
                </p>
              </li>
            );
          })}
        </ol>
        <EditionNav previous={previous} next={next} />
      </article>
      <div className="no-print">
        <div className="wrap prose-page">
          <h2>Morning email</h2>
          <p>The daily Top 5 is five verified stories. The same no-politics rule applies, and it is short enough to read with coffee.</p>
        </div>
        <EmailSignup id="caregivers-week-email" />
      </div>
    </div>
  );
}
