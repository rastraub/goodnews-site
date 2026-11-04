import Link from "next/link";
import { CopyLink } from "./copy-link";
import { ListenControls } from "./listen-controls";
import { smartSpeakerNote, type DailyBriefing } from "@/lib/briefing";

export function BriefingScript({ briefing }: { briefing: DailyBriefing }) {
  const note = smartSpeakerNote();
  const segments = [
    { id: "briefing-intro", text: briefing.intro },
    ...briefing.stories.map((story) => ({ id: story.segmentId, text: story.line })),
    { id: "briefing-signoff", text: briefing.signoff },
  ];

  return (
    <>
      <p className="announce-meta">
        {briefing.readLabel} · {briefing.wordCount} words. Written to be read aloud.
      </p>
      <div className="no-print">
        <ListenControls label="Listen" groupLabel="Listen to this briefing" segments={segments} />
        <div className="announce-actions">
          <CopyLink value={briefing.mainText} label="Copy script" />
        </div>
      </div>
      <p className="teacher-note">For a radio station, a school announcement, or a short podcast.</p>
      <article className="announce-script">
        <p id="briefing-intro">{briefing.intro}</p>
        {briefing.stories.map((story) => (
          <p key={story.slug} id={story.segmentId}>
            {story.lead}, in {story.place}: <Link href={`/story/${story.slug}`}>{story.blurb}</Link> Reported by{" "}
            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
              {story.sourceName}
            </a>
            .
          </p>
        ))}
        <p id="briefing-signoff" className="announce-signoff">
          {briefing.signoff}
        </p>
      </article>
      <p className="teacher-note" id="smart-speakers">
        {note.text}
        {note.href ? (
          <>
            {" "}
            <a href={note.href}>Open the skill</a>.
          </>
        ) : null}
      </p>
    </>
  );
}
