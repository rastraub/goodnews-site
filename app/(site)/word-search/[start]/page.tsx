import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { WordGrid, answerKeyList } from "@/components/word-grid";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import { openGraphImage } from "@/lib/feed-image";
import { homeschoolByStart, HOMESCHOOL_INDEX_PATH } from "@/lib/homeschool";
import { classroomJsonLd, listingMeta } from "@/lib/seo";
import { answerCells, WORD_SEARCH_INDEX_PATH, wordSearchesToPrerender, type WordSearchPuzzle } from "@/lib/word-search";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return wordSearchesToPrerender().map((puzzle) => ({ start: puzzle.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const puzzle = wordSearchesToPrerender().find((item) => item.start === start);
  if (!puzzle) return {};
  return listingMeta({
    title: puzzle.title,
    description: puzzle.description,
    base: puzzle.path,
    page: 1,
    total: 1,
    image: puzzle.image ? openGraphImage(puzzle) : undefined,
  });
}

function PuzzleNav({ previous, next }: { previous?: WordSearchPuzzle<Story>; next?: WordSearchPuzzle<Story> }) {
  return (
    <nav className="pager no-print" aria-label="Word searches">
      {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
      <Link href={WORD_SEARCH_INDEX_PATH}>All puzzles</Link>
      {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
    </nav>
  );
}

function AnswerKey({ puzzle }: { puzzle: WordSearchPuzzle<Story> }) {
  const marked = answerCells(puzzle.placements);
  const lines = answerKeyList(puzzle.placements);
  return (
    <>
      <WordGrid grid={puzzle.grid} marked={marked} label={`Answer key grid for the week of ${puzzle.rangeLabel}.`} />
      {lines.length ? (
        <ol className="word-key-list">
          {lines.map((placement) => (
            <li key={`${placement.letters}-${placement.row}-${placement.col}`}>
              {placement.letters}: row {placement.row + 1}, column {placement.col + 1}, {placement.direction}
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
}

export default async function WordSearchPage({ params }: Props) {
  const { start } = await params;
  const puzzles = wordSearchesToPrerender();
  const index = puzzles.findIndex((puzzle) => puzzle.start === start);
  if (index < 0) notFound();
  const puzzle = puzzles[index];
  if (!puzzle) notFound();
  const previous = index > 0 ? puzzles[index - 1] : undefined;
  const next = index < puzzles.length - 1 ? puzzles[index + 1] : undefined;
  const home = homeschoolByStart(puzzle.start);
  const listed = puzzle.words.slice().sort((a, b) => a.letters.localeCompare(b.letters));

  return (
    <div className="page-block">
      <JsonLd
        data={classroomJsonLd({
          name: puzzle.title,
          description: puzzle.description,
          path: puzzle.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Word search", path: WORD_SEARCH_INDEX_PATH },
            { name: puzzle.rangeLabel, path: puzzle.path },
          ],
          resources: puzzle.stories.map((story) => ({ name: story.title, path: `/story/${story.slug}` })),
          learningResourceType: "activity",
          itemLearningResourceType: "worksheet",
          timeRequired: "PT20M",
          audienceRoles: ["teacher", "parent"],
        })}
      />
      <article className="wrap page-hero print-sheet word-sheet">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={WORD_SEARCH_INDEX_PATH}>Word search</Link>
          <span aria-hidden="true">/</span>
          <span>{puzzle.rangeLabel}</span>
        </p>
        <p className="kicker">{puzzle.inProgress ? "Word search · So far" : "Word search"}</p>
        <h1>{puzzle.heading}</h1>
        <p className="lede">{puzzle.intro}</p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          Week of {puzzle.rangeLabel}
        </p>
        <p className="link-pills no-print">
          <Link href={home?.path ?? HOMESCHOOL_INDEX_PATH}>Homeschool pack</Link>
          <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>
          <Link href="/kids">Stories for kids</Link>
          <Link href="/subscribe">Subscribe</Link>
        </p>
        <div className="pack-actions no-print">
          <PrintButton label="Print this puzzle" pdfLabel="Download PDF" />
          <p className="hint" id="pdf-hint">
            Download PDF opens the print dialog. Choose Save as PDF. The answer key prints on the next page. Nothing is sent to a print service.
          </p>
        </div>
        {puzzle.short ? (
          <div className="word-note">
            <p>
              <Link href={CLASSROOM_INDEX_PATH}>Good News Friday</Link>
              {" and "}
              <Link href="/kids">stories for kids</Link>
              {" are ready when you want a longer activity."}
            </p>
          </div>
        ) : null}
        {listed.length ? <p>Find each word in the grid. The list under the grid is the same words, written out.</p> : null}
        {listed.length ? (
          <>
            <h2>Grid</h2>
            <WordGrid grid={puzzle.grid} label={`Word search grid for the week of ${puzzle.rangeLabel}. The words are in the list below.`} />
            <h2>Words</h2>
            <ul className="word-list">
              {listed.map((word) => (
                <li key={word.letters}>{word.letters}</li>
              ))}
            </ul>
          </>
        ) : null}
        {puzzle.words.length ? (
          <>
            <details className="quiz-key word-key-screen no-print">
              <summary>Answer key</summary>
              <AnswerKey puzzle={puzzle} />
            </details>
            <section className="word-key-print" aria-hidden="true">
              <h2>Answer key</h2>
              <p>The letters that belong to a word are outlined.</p>
              <AnswerKey puzzle={puzzle} />
            </section>
          </>
        ) : null}
        {puzzle.stories.length ? (
          <section className="no-print" aria-labelledby="puzzle-stories">
            <h2 id="puzzle-stories">Stories these words come from</h2>
            <ul className="questions">
              {puzzle.stories.map((story) => (
                <li key={story.slug}>
                  <Link href={`/story/${story.slug}`}>{story.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="print-source">
          {siteConfig.name} · Word search · {puzzle.rangeLabel}
        </p>
        <PuzzleNav previous={previous} next={next} />
      </article>
    </div>
  );
}
