"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { EmailSignup } from "@/components/email-signup";
import { StoryImage } from "@/components/story-image";
import { quizShareText, quizShareUrl } from "@/lib/quiz-copy";
import type { QuizQuestion } from "@/lib/quiz";
import { siteConfig } from "@/site.config";

export type QuizPlayerProps = {
  path: string;
  title: string;
  rangeLabel: string;
  questions: QuizQuestion[];
  kidQuestions: QuizQuestion[];
};

function useKidParam(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("kids") === "1",
    () => false,
  );
}

function answerChoice(question: QuizQuestion) {
  return question.choices.find((choice) => choice.id === question.answerId);
}

function QuizSheet({
  title,
  rangeLabel,
  questions,
  kid,
  open,
  sheetRef,
}: {
  title: string;
  rangeLabel: string;
  questions: QuizQuestion[];
  kid: boolean;
  open: boolean;
  sheetRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={sheetRef}
      className={`quiz-sheet ${kid ? "quiz-sheet-kid" : "quiz-sheet-standard"}${open ? " is-open" : ""}`}
      aria-label={kid ? "Printable quiz, kid mode" : "Printable quiz"}
      tabIndex={open ? -1 : undefined}
    >
      <p className="kicker">{kid ? "Kid mode" : "Printable quiz"}</p>
      <h2>{title}</h2>
      <p className="teacher-note">
        By {siteConfig.editor.name}. {rangeLabel}. Circle one answer for each question. The answer key is closed until a teacher opens it.
      </p>
      <ol className="quiz-print-list">
        {questions.map((question, index) => (
          <li key={question.id} className="quiz-q">
            <h3>
              {index + 1}. {question.prompt}
            </h3>
            {question.image ? (
              <span className="quiz-prompt-photo quiz-prompt-photo-print">
                <StoryImage src={question.image} alt={question.imageAlt ?? ""} sizes="(max-width: 700px) 100vw, 640px" />
              </span>
            ) : null}
            <ol type="A" className={question.kind === "photo" ? "quiz-print-photos" : undefined}>
              {question.choices.map((choice) => (
                <li key={choice.id}>
                  {choice.image ? (
                    <span className="quiz-print-photo">
                      <StoryImage src={choice.image} alt={choice.imageAlt ?? choice.label} sizes="180px" thumb />
                    </span>
                  ) : (
                    choice.label
                  )}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      <details className="quiz-key">
        <summary>Answer key</summary>
        <p className="teacher-note">For the teacher. Leave this closed when you print a student copy.</p>
        <ol>
          {questions.map((question) => {
            const answer = answerChoice(question);
            return (
              <li key={question.id}>
                {(answer?.id ?? "").toUpperCase()}. {answer?.label}{" "}
                <Link href={question.storyPath}>{question.storyTitle}</Link>
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}

function ChoiceGroup({
  question,
  picked,
  revealed,
  onCommit,
}: {
  question: QuizQuestion;
  picked?: string;
  revealed: boolean;
  onCommit: (choiceId: string) => void;
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const photos = question.kind === "photo";

  function move(next: number) {
    const count = question.choices.length;
    const index = (next + count) % count;
    setFocusIndex(index);
    refs.current[index]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      if (!revealed) move(index + 1);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      if (!revealed) move(index - 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      if (!revealed) move(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      if (!revealed) move(question.choices.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!revealed) onCommit(question.choices[index]?.id ?? "");
    }
  }

  return (
    <div
      className={photos ? "quiz-choices photos" : "quiz-choices"}
      role="radiogroup"
      aria-labelledby="quiz-prompt"
      aria-describedby="quiz-keys"
    >
      {question.choices.map((choice, index) => {
        const selected = picked === choice.id;
        const isAnswer = choice.id === question.answerId;
        const result = revealed && isAnswer ? "correct" : revealed && selected ? "wrong" : undefined;
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={revealed ? selected : false}
            aria-disabled={revealed || undefined}
            tabIndex={revealed ? 0 : focusIndex === index ? 0 : -1}
            ref={(element) => {
              refs.current[index] = element;
            }}
            className="quiz-choice"
            data-result={result}
            onClick={() => {
              if (!revealed) onCommit(choice.id);
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <span className="quiz-letter" aria-hidden="true">
              {choice.id.toUpperCase()}
            </span>
            <span className="sr">Choice {choice.id.toUpperCase()}.</span>
            {choice.image ? (
              <span className="quiz-photo">
                <StoryImage src={choice.image} alt={choice.imageAlt ?? choice.label} sizes="(max-width: 700px) 45vw, 280px" />
              </span>
            ) : (
              <span className="quiz-choice-label">{choice.label}</span>
            )}
            {revealed && isAnswer ? <span className="quiz-mark">Correct</span> : null}
            {revealed && selected && !isAnswer ? <span className="quiz-mark">Not this one</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function QuizPlayer({ path, title, rangeLabel, questions, kidQuestions }: QuizPlayerProps) {
  const kidParam = useKidParam();
  const kidAvailable = kidQuestions.length > 0;
  const [kidChoice, setKidChoice] = useState<boolean | null>(null);
  const kidMode = kidAvailable && (kidChoice ?? kidParam);
  const [printable, setPrintable] = useState(false);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"ask" | "reveal" | "score">("ask");
  const [kidNote, setKidNote] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareFallback, setShareFallback] = useState("");
  const promptRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const scoreRef = useRef<HTMLHeadingElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const mounted = useRef(false);
  const kidStatus =
    kidNote || (kidMode && kidChoice === null ? "Kid mode is on. Questions use classroom stories only." : "");

  const active = kidMode ? kidQuestions : questions;
  const mode = kidMode ? "kid" : "all";
  const [playedMode, setPlayedMode] = useState(mode);
  if (playedMode !== mode) {
    setPlayedMode(mode);
    setStep(0);
    setPicks({});
    setPhase("ask");
    setShareMessage("");
    setShareFallback("");
  }
  const question = active[playedMode === mode ? step : 0];
  const score = active.reduce((sum, item) => sum + (picks[item.id] === item.answerId ? 1 : 0), 0);

  useEffect(() => {
    document.body.classList.toggle("quiz-print-kid", kidMode && kidAvailable);
    return () => document.body.classList.remove("quiz-print-kid");
  }, [kidMode, kidAvailable]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (printable) {
      sheetRef.current?.focus();
      return;
    }
    if (phase === "reveal") feedbackRef.current?.focus();
    else if (phase === "score") scoreRef.current?.focus();
    else promptRef.current?.focus();
  }, [phase, step, kidMode, printable]);

  function resetPlay() {
    setStep(0);
    setPicks({});
    setPhase("ask");
    setShareMessage("");
    setShareFallback("");
  }

  function toggleKid() {
    if (!kidAvailable) return;
    const next = !kidMode;
    setKidChoice(next);
    resetPlay();
    setKidNote(
      next
        ? "Kid mode is on. Questions use classroom stories only. The quiz started over."
        : "Kid mode is off. The quiz started over.",
    );
  }

  function commit(choiceId: string) {
    if (phase !== "ask" || !question || !choiceId) return;
    setPicks((current) => ({ ...current, [question.id]: choiceId }));
    setPhase("reveal");
  }

  function next() {
    if (step + 1 >= active.length) {
      setPhase("score");
      return;
    }
    setStep((current) => current + 1);
    setPhase("ask");
  }

  async function shareScore() {
    const text = quizShareText(score, active.length);
    const url = quizShareUrl(path, kidMode && kidAvailable);
    const full = `${text}\n${url}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${siteConfig.name} Good News Quiz`,
          text,
          url,
        });
        setShareMessage("Shared.");
        setShareFallback("");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(full);
      setShareMessage("Copied. Paste it anywhere.");
      setShareFallback("");
    } catch {
      setShareFallback(full);
      setShareMessage("Copy this score line.");
    }
  }

  const picked = question ? picks[question.id] : undefined;
  const answer = question ? answerChoice(question) : undefined;
  const feedback =
    question && picked
      ? picked === question.answerId
        ? "Correct."
        : question.kind === "photo"
          ? `Not quite. The answer is choice ${(answer?.id ?? "").toUpperCase()}.`
          : `Not quite. The answer is ${answer?.label ?? ""}.`
      : "";

  return (
    <div className="quiz-player">
      <div className="quiz-controls no-print">
        {kidAvailable ? (
          <button
            type="button"
            role="switch"
            aria-checked={kidMode}
            className={kidMode ? "quiz-switch on" : "quiz-switch"}
            onClick={toggleKid}
            aria-describedby="kid-mode-hint"
          >
            Kid mode
          </button>
        ) : null}
        <button
          type="button"
          className="quiz-switch"
          aria-pressed={printable}
          onClick={() => setPrintable((current) => !current)}
        >
          {printable ? "Play the quiz" : "Printable view"}
        </button>
        <button type="button" className="btn btn-ink" onClick={() => window.print()}>
          Print
        </button>
        <p id="kid-mode-hint" className="quiz-hint">
          {kidAvailable
            ? "Kid mode uses classroom stories only. Arrow keys move between answers. Enter locks one in."
            : "Arrow keys move between answers. Enter locks one in."}
        </p>
        <p className="sr" role="status">
          {kidStatus}
        </p>
      </div>

      <div className="quiz-play no-print" hidden={printable}>
        {phase === "score" ? (
          <div className="quiz-card">
            <p className="kicker">Your score</p>
            <h2 tabIndex={-1} ref={scoreRef}>
              You got {score} out of {active.length}.
            </h2>
            <p className="quiz-share-preview">{quizShareText(score, active.length)}</p>
            <div className="quiz-actions">
              <button type="button" className="btn btn-gold" onClick={shareScore}>
                Share your score
              </button>
              <button type="button" className="btn btn-ink" onClick={resetPlay}>
                Play again
              </button>
            </div>
            {shareMessage ? (
              <p className="quiz-hint" role="status">
                {shareMessage}
              </p>
            ) : null}
            {shareFallback ? (
              <label className="field">
                Score text
                <textarea
                  className="quiz-share-fallback"
                  readOnly
                  rows={2}
                  value={shareFallback}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            ) : null}
            <ol className="quiz-review" aria-label="Stories in this quiz">
              {active.map((item, index) => {
                const right = picks[item.id] === item.answerId;
                return (
                  <li key={item.id}>
                    <span>{right ? "Correct" : "Missed"}</span>
                    <span aria-hidden="true"> · </span>
                    <Link href={item.storyPath}>
                      Question {index + 1}: {item.storyTitle}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : question ? (
          <div className="quiz-card">
            <p className="quiz-progress">
              Question {step + 1} of {active.length}
            </p>
            <h2 id="quiz-prompt" tabIndex={-1} ref={promptRef}>
              {question.prompt}
            </h2>
            <p id="quiz-keys" className="sr">
              Choose an answer. Arrow keys move. Enter or Space locks it in.
            </p>
            {question.image ? (
              <span className="quiz-prompt-photo">
                <StoryImage
                  src={question.image}
                  alt={question.imageAlt ?? ""}
                  sizes="(max-width: 700px) 100vw, 640px"
                />
              </span>
            ) : null}
            <ChoiceGroup
              key={`${kidMode ? "kid" : "all"}-${question.id}`}
              question={question}
              picked={picked}
              revealed={phase === "reveal"}
              onCommit={commit}
            />
            {phase === "reveal" ? (
              <div className="quiz-after">
                <p tabIndex={-1} ref={feedbackRef} className="quiz-feedback">
                  {feedback}
                </p>
                <p>
                  <Link href={question.storyPath}>Read the story: {question.storyTitle}</Link>
                </p>
                <button type="button" className="btn btn-ink" onClick={next}>
                  {step + 1 === active.length ? "See your score" : "Next question"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "score" ? (
          <div className="quiz-signup">
            <h2>Get the morning Top 5.</h2>
            <p>
              This list is for adults. Do not enter a child&apos;s email address. We don&apos;t ask for a name, age, or school on this quiz.
            </p>
            <EmailSignup variant="inline" id="quiz-signup" />
          </div>
        ) : null}
      </div>

      <QuizSheet
        title={title}
        rangeLabel={rangeLabel}
        questions={questions}
        kid={false}
        open={printable && !kidMode}
        sheetRef={!kidMode ? sheetRef : undefined}
      />
      {kidAvailable ? (
        <QuizSheet
          title={title}
          rangeLabel={rangeLabel}
          questions={kidQuestions}
          kid
          open={printable && kidMode}
          sheetRef={kidMode ? sheetRef : undefined}
        />
      ) : null}
    </div>
  );
}
