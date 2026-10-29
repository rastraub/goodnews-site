import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { formatLongDate, SITE_LAUNCH } from "@/lib/weeks";
import { latestQuiz, quizIndexJsonLd, quizzesToPrerender } from "@/lib/quiz";
import { listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Good News Quiz";

function indexDescription(count: number): string {
  if (!count) {
    return `A weekly multiple-choice quiz on verified good news, starting with the week of ${formatLongDate(SITE_LAUNCH)}.`;
  }
  const quizzes = count === 1 ? "1 weekly quiz" : `${count} weekly quizzes`;
  return `${quizzes} on verified good news since ${formatLongDate(SITE_LAUNCH)}. Five to seven questions, a score you can share, a kid mode, and a printable copy for class. No account and no tracking.`;
}

export function generateMetadata(): Metadata {
  const quizzes = quizzesToPrerender();
  const newest = quizzes[quizzes.length - 1];
  return listingMeta({
    title: TITLE,
    description: indexDescription(quizzes.length),
    base: "/quiz",
    page: 1,
    total: 1,
    image: newest?.image ? { url: newest.image, alt: newest.imageAlt } : undefined,
  });
}

export default function QuizIndexPage() {
  const quizzes = quizzesToPrerender();
  const description = indexDescription(quizzes.length);
  const newestFirst = quizzes.slice().reverse();
  const current = latestQuiz(quizzes);

  return (
    <div className="page-block">
      <JsonLd data={quizIndexJsonLd(quizzes, description)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Good News Quiz</span>
        </p>
        <p className="kicker">Weekly quiz</p>
        <h1>Good News Quiz.</h1>
        <p className="lede">{description}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          {current ? <Link href={current.path}>Play this week</Link> : null}
          <Link href="/week">This week in good news</Link>
          <Link href="/kids">For classrooms</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((quiz) => (
              <Link key={quiz.start} href={quiz.path} className="week-row">
                <span className="week-row-img">
                  <StoryImage src={quiz.image} alt={quiz.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                </span>
                <span>
                  <span className="kicker">{quiz.inProgress ? "This week" : "Quiz"}</span>
                  <h2>{quiz.title}</h2>
                  <p>
                    {quiz.questions.length} questions
                    {quiz.kidQuestions.length ? " · kid mode" : ""} · {quiz.rangeLabel}
                  </p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>The first quiz is not up yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              A quiz appears here once a week of stories can fill five questions. Daily stories stay on the homepage until then.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
