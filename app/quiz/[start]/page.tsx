import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { QuizPlayer } from "@/components/quiz-player";
import { quizJsonLd, quizzesToPrerender } from "@/lib/quiz";
import { listingMeta } from "@/lib/seo";
import { weeksToPrerender } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return quizzesToPrerender().map((quiz) => ({ start: quiz.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const quiz = quizzesToPrerender().find((item) => item.start === start);
  if (!quiz) return {};
  return listingMeta({
    title: quiz.title,
    description: quiz.description,
    base: quiz.path,
    page: 1,
    total: 1,
    image: quiz.image ? { url: quiz.image, alt: quiz.imageAlt } : undefined,
  });
}

export default async function QuizWeekPage({ params }: Props) {
  const { start } = await params;
  const quizzes = quizzesToPrerender();
  const index = quizzes.findIndex((quiz) => quiz.start === start);
  if (index < 0) notFound();
  const quiz = quizzes[index];
  const previous = index > 0 ? quizzes[index - 1] : undefined;
  const next = index < quizzes.length - 1 ? quizzes[index + 1] : undefined;
  const week = weeksToPrerender().find((item) => item.start === quiz.start);

  return (
    <div className="page-block">
      <JsonLd data={quizJsonLd(quiz)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/quiz">Good News Quiz</Link>
          <span aria-hidden="true">/</span>
          <span>{quiz.rangeLabel}</span>
        </p>
        <p className="kicker">{quiz.inProgress ? "This week" : "Quiz"}</p>
        <h1>{quiz.heading}</h1>
        <p className="lede">{quiz.description}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          {previous ? <Link href={previous.path}>Previous quiz</Link> : null}
          <Link href="/quiz">All quizzes</Link>
          {next ? <Link href={next.path}>Next quiz</Link> : null}
          {week ? <Link href={week.path}>This week&apos;s stories</Link> : null}
          {quiz.kidQuestions.length ? <Link href="/kids">Classroom section</Link> : null}
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 12, paddingBottom: 48 }}>
        <QuizPlayer
          path={quiz.path}
          title={quiz.title}
          rangeLabel={quiz.rangeLabel}
          questions={quiz.questions}
          kidQuestions={quiz.kidQuestions}
        />
      </div>
    </div>
  );
}
