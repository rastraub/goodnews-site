import Link from "next/link";
import { ListenControls } from "@/components/listen-controls";
import { StoryImage } from "@/components/story-image";
import {
  adventNextPrompt,
  formatAdventDate,
  type AdventDoor,
  type AdventPrompt,
} from "@/lib/advent";
import { formatStoryDate } from "@/lib/format";
import { kidListenSegments, type ListenSegment } from "@/lib/listen-text";
import { placeLabel } from "@/lib/present";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export function adventListenSegments(story: Story, actTitle: string, actDetail: string): ListenSegment[] {
  const segments = kidListenSegments(story);
  if (!segments.length) return segments;
  segments.push({ id: "speak-act", text: `${actTitle}. ${actDetail}` });
  return segments;
}

export function AdventDoorGrid({ doors, today }: { doors: AdventDoor<Story>[]; today: string }) {
  return (
    <nav className="advent-grid" aria-label="24 doors">
      {doors.map((door) => {
        const open = door.status === "open" && door.story;
        const label = open
          ? `December ${door.day}: ${door.story?.title ?? ""}`
          : `December ${door.day}, locked until December ${door.day}`;
        return (
          <Link
            key={door.day}
            href={door.path}
            className={open ? (door.date === today ? "advent-door is-today" : "advent-door") : "advent-door is-locked"}
            aria-label={label}
            aria-current={door.date === today ? "date" : undefined}
          >
            <span className="num">{door.day}</span>
            {open && door.story ? (
              <>
                <span className="door-kicker">{door.date === today ? "Today" : "Open"}</span>
                <span className="door-title">{door.story.shortTitle ?? door.story.title}</span>
                <span className="door-act">{door.act.title}</span>
              </>
            ) : (
              <>
                <span className="door-kicker">Locked</span>
                <span className="door-title">Opens December {door.day}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdventRead({
  door,
  listen = false,
  heading = "h1",
  byline = false,
}: {
  door: AdventDoor<Story> & { story: Story };
  listen?: boolean;
  heading?: "h1" | "h2";
  byline?: boolean;
}) {
  const { story, act } = door;
  const Title = heading;
  return (
    <article className="advent-read">
      <p className="kicker">Door {door.day} · {formatAdventDate(door.day)}</p>
      <Title id="speak-title">{story.title}</Title>
      <p className="teacher-note">
        {placeLabel(story)} · {formatStoryDate(story.date)}
        {door.pinned ? " · Pinned" : ""}
      </p>
      {byline ? (
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
      ) : null}
      <figure className="print-figure">
        <StoryImage src={story.image} alt={story.imageAlt} sizes="(max-width: 700px) 100vw, 720px" priority treatment={story.imageTreatment} />
        {story.imageCaption ? <figcaption className="caption">{story.imageCaption}</figcaption> : null}
      </figure>
      {listen ? (
        <ListenControls className="listen-bar no-print" label="Listen to this door" segments={adventListenSegments(story, act.title, act.detail)} />
      ) : null}
      <p className="gn-kid read-aloud" id="speak-kid">
        <span>Read aloud</span>
        {story.kidSummary}
      </p>
      <div className="advent-act" id="speak-act">
        <span>Today&apos;s kind act</span>
        <strong>{act.title}</strong>
        <p>{act.detail}</p>
      </div>
      {story.kidQuestions?.length ? (
        <>
          <h2>Discussion questions</h2>
          <ol className="questions">
            {story.kidQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </>
      ) : null}
      <p className="print-source">
        Source: <a href={story.sourceUrl}>{story.sourceName}</a>
        {" · "}
        <Link href={`/story/${story.slug}`}>Read the full story</Link>
      </p>
    </article>
  );
}

export function AdventPromptLine({ day, today }: { day: number; today: string }) {
  const prompt: AdventPrompt = adventNextPrompt(day, today);
  return (
    <p className="advent-next">
      {prompt.text} <Link href={prompt.href}>{prompt.link}</Link>
    </p>
  );
}
