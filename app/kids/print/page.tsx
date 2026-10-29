import type { Metadata } from "next";
import Link from "next/link";
import { StoryImage } from "@/components/story-image";
import { editionLabel, formatStoryDate } from "@/lib/format";
import { kidPlaceForStory, storyOfTheDay } from "@/lib/kids";
import { latestQuiz } from "@/lib/quiz";
import { placeLabel } from "@/lib/present";
import { pageAlternates } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { siteConfig } from "@/site.config";
import { KindnessLinks } from "@/components/kindness-links";
import { ListenControls } from "@/components/listen-controls";
import { kidListenSegments } from "@/lib/listen-text";
import { PrintButton } from "../print-button";

export function generateMetadata(): Metadata {
  const story = storyOfTheDay(getPublishedStories());
  const title = story ? `Story of the Day: ${story.shortTitle ?? story.title}` : "Story of the Day for classrooms";
  const description =
    story?.kidSummary ??
    "A printable good-news story for teachers, with a short summary and discussion questions. For adults to read with a class.";
  return {
    title,
    description,
    alternates: pageAlternates("/kids/print"),
  };
}

export default function KidsPrintPage() {
  const story = storyOfTheDay(getPublishedStories());
  const placePath = story ? kidPlaceForStory(story) : undefined;
  const quiz = latestQuiz();

  return (
    <div className="page-block">
      <div className="wrap page-hero print-sheet">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/kids">For classrooms</Link>
          <span aria-hidden="true">/</span>
          <span>Story of the Day</span>
        </p>
        <p className="kicker">For teachers · {editionLabel()}</p>
        <h1>Story of the Day</h1>
        {story && story.kidSummary && story.kidQuestions?.length ? (
          <>
            <p className="teacher-note">
              Print this sheet and read it with your class. It is a verified news story, shortened for children. The questions are for you to lead.
            </p>
            <ListenControls className="listen-bar no-print" label="Listen to this story" segments={kidListenSegments(story)} />
            <h2 id="speak-title">{story.title}</h2>
            <p className="teacher-note">
              {placeLabel(story)} · {formatStoryDate(story.date)}
            </p>
            <figure className="print-figure">
              <StoryImage src={story.image} alt={story.imageAlt} sizes="(max-width: 700px) 100vw, 720px" priority treatment={story.imageTreatment} />
              <figcaption className="caption">{story.imageCaption}</figcaption>
            </figure>
            <p className="read-aloud" id="speak-kid">
              {story.kidSummary}
            </p>
            <h2>Discussion questions</h2>
            <ol className="questions">
              {story.kidQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <p className="print-source">
              Source:{" "}
              <a href={story.sourceUrl}>{story.sourceName}</a>
              {" · "}
              <a href={`${siteConfig.url}/story/${story.slug}`}>Full story</a>
            </p>
            <div className="no-print">
              <KindnessLinks />
            </div>
            <div className="print-actions no-print">
              <PrintButton />
              {quiz ? (
                <Link href={quiz.kidQuestions.length ? `${quiz.path}?kids=1` : quiz.path}>This week&apos;s quiz</Link>
              ) : null}
              <Link href="/morning-announcements">Morning announcements</Link>
              <Link href={`/story/${story.slug}`}>Read the full story</Link>
              {placePath ? <Link href={placePath}>More classroom stories from this place</Link> : null}
              <Link href="/kids">All classroom stories</Link>
              <Link href="/classroom">Good News Friday packs</Link>
            </div>
          </>
        ) : (
          <>
            <p className="lede">
              No classroom story is ready for this date. A story appears here after it is checked and marked for classrooms.
            </p>
            <p className="link-pills no-print">
              <Link href="/kids">Classroom stories</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
