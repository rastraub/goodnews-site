import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { CopyLink } from "@/components/copy-link";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { getCategory } from "@/lib/categories";
import { CLASSROOM_INDEX_PATH, packQuestions, packVocabulary, whereInTheWorld } from "@/lib/classroom-pack";
import { openGraphImage } from "@/lib/feed-image";
import { formatStoryDate } from "@/lib/format";
import {
  HOMESCHOOL_INDEX_PATH,
  homeschoolToPrerender,
  type HomeschoolPack,
} from "@/lib/homeschool";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { MORNING_ANNOUNCEMENTS_PATH } from "@/lib/morning-announcements";
import { classroomJsonLd, listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import { AMBASSADORS_PATH } from "@/lib/ambassador-tip";
import { wordSearchByStart, WORD_SEARCH_INDEX_PATH } from "@/lib/word-search";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return homeschoolToPrerender().map((pack) => ({ start: pack.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const pack = homeschoolToPrerender().find((item) => item.start === start);
  if (!pack) return {};
  return listingMeta({
    title: pack.title,
    description: pack.description,
    base: pack.path,
    page: 1,
    total: 1,
    image: openGraphImage(pack),
  });
}

function PackNav({ previous, next }: { previous?: HomeschoolPack<Story>; next?: HomeschoolPack<Story> }) {
  return (
    <nav className="pager no-print" aria-label="Homeschool packs">
      {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
      <Link href={HOMESCHOOL_INDEX_PATH}>All weeks</Link>
      {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
    </nav>
  );
}

export default async function HomeschoolPackPage({ params }: Props) {
  const { start } = await params;
  const packs = homeschoolToPrerender();
  const index = packs.findIndex((pack) => pack.start === start);
  if (index < 0) notFound();
  const pack = packs[index];
  if (!pack) notFound();
  const previous = index > 0 ? packs[index - 1] : undefined;
  const next = index < packs.length - 1 ? packs[index + 1] : undefined;
  const puzzle = wordSearchByStart(pack.start);

  return (
    <div className="page-block">
      <JsonLd
        data={classroomJsonLd({
          name: pack.title,
          description: pack.description,
          path: pack.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Homeschool", path: HOMESCHOOL_INDEX_PATH },
            { name: pack.rangeLabel, path: pack.path },
          ],
          resources: pack.stories.map((story) => ({ name: story.title, path: `/story/${story.slug}` })),
          learningResourceType: "activity",
          itemLearningResourceType: "reading passage",
          timeRequired: "PT15M",
          audienceRoles: ["parent"],
        })}
      />
      <article className="wrap page-hero print-sheet pack">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={HOMESCHOOL_INDEX_PATH}>Homeschool</Link>
          <span aria-hidden="true">/</span>
          <span>{pack.rangeLabel}</span>
        </p>
        <p className="kicker">{pack.inProgress ? "At home · So far" : "At home"}</p>
        <h1>{pack.heading}</h1>
        <p className="lede">{pack.intro}</p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          Week of {pack.rangeLabel}
        </p>
        <p className="link-pills no-print">
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday for teachers</Link>
          <Link href="/kids">Stories for kids</Link>
          <Link href={MORNING_ANNOUNCEMENTS_PATH}>Morning announcements</Link>
          <Link href={pack.challengePath ?? KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
          <Link href={AMBASSADORS_PATH}>Kindness Ambassadors</Link>
          <Link href={puzzle?.path ?? WORD_SEARCH_INDEX_PATH}>Word search</Link>
          <Link href="/subscribe">Subscribe</Link>
        </p>
        <div className="pack-actions no-print">
          <PrintButton label="Print this pack" pdfLabel="Download PDF" />
          <p className="hint" id="pdf-hint">
            Download PDF opens the print dialog. Choose Save as PDF. Nothing is sent to a print service.
          </p>
        </div>
        <section className="pack-teacher" aria-labelledby="parent-note">
          <h2 id="parent-note">For parents and co-ops</h2>
          <p>{pack.parentNote}</p>
          {pack.readyCount > pack.stories.length ? (
            <p className="teacher-note no-print">
              <Link href="/kids">More stories for home are in the kids section.</Link>
            </p>
          ) : null}
        </section>
        <section className="pack-teacher" aria-labelledby="morning-circle">
          <h2 id="morning-circle">Morning circle / co-op share</h2>
          <p className="read-aloud">{pack.circle}</p>
          <div className="no-print" style={{ marginTop: 12 }}>
            <CopyLink value={pack.circle} label="Copy the morning circle" />
          </div>
        </section>
        <section className="pack-contents" aria-labelledby="in-this-pack">
          <h2 id="in-this-pack">In this pack</h2>
          <ol className="questions">
            {pack.stories.map((story) => (
              <li key={story.slug}>
                <a href={`#story-${story.slug}`}>{story.title}</a>
                <span className="where-inline"> · {whereInTheWorld(story)}</span>
              </li>
            ))}
          </ol>
        </section>
        {pack.stories.map((story, storyIndex) => {
          const vocab = packVocabulary(story);
          const questions = packQuestions(story);
          const category = getCategory(story.category);
          return (
            <section className="pack-story" id={`story-${story.slug}`} key={story.slug} aria-labelledby={`story-title-${story.slug}`}>
              <p className="kicker">
                {category?.label ?? story.category}
                <span className="dot" />
                Story {storyIndex + 1} of {pack.stories.length}
              </p>
              <h2 id={`story-title-${story.slug}`}>{story.title}</h2>
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
                  priority={storyIndex === 0}
                  treatment={story.imageTreatment}
                />
                <figcaption className="caption">{story.imageCaption}</figcaption>
              </figure>
              {story.kidSummary ? (
                <>
                  <h3>Read together</h3>
                  <p className="teacher-note">Ages 6 to 11. A parent or co-op leader reads this.</p>
                  <p className="read-aloud">{story.kidSummary}</p>
                </>
              ) : null}
              {vocab ? (
                <div className="vocab">
                  <h3>Vocabulary</h3>
                  <p>
                    <strong>{vocab.word}.</strong> {vocab.definition}
                  </p>
                </div>
              ) : null}
              {questions.length ? (
                <>
                  <h3>Discussion prompts</h3>
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
                <a href={`${siteConfig.url}/story/${story.slug}`}>Full story</a>
              </p>
              {(story.kidQuestions?.length ?? 0) > questions.length ? (
                <p className="teacher-note no-print">
                  <Link href={`/story/${story.slug}#classroom`}>One more question is on the full story.</Link>
                </p>
              ) : null}
            </section>
          );
        })}
        <section className="pack-challenge" aria-labelledby="kindness-challenge">
          <h2 id="kindness-challenge">At-home kindness challenge</h2>
          <p>{pack.challenge}</p>
          <p>
            <Link href={pack.challengePath ?? KINDNESS_INDEX_PATH}>This week&apos;s kindness challenge</Link>
            {" · "}
            <Link href={AMBASSADORS_PATH}>Kindness Ambassadors</Link>
          </p>
          <p className="print-source">
            {siteConfig.name} · Good news for homeschool · {pack.rangeLabel}
          </p>
        </section>
        <PackNav previous={previous} next={next} />
      </article>
      <section className="page-block no-print" id="families" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>Email for families</h2>
          <p>
            The morning Top 5 comes to an adult address. We do not ask for a child&apos;s name, age, or school.
          </p>
          <EmailSignup variant="inline" interest="daily" id="homeschool-pack-email" />
        </div>
      </section>
    </div>
  );
}
