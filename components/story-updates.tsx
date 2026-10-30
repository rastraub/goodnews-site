import Link from "next/link";
import { FOLLOW_UPS_PATH, sortedUpdates } from "@/lib/follow-ups";
import { formatStoryDate } from "@/lib/format";
import { HELP_KIND_LABEL } from "@/lib/help";
import type { Story } from "@/lib/stories";

export function StoryUpdates({ story }: { story: Story }) {
  const updates = sortedUpdates(story);
  if (!updates.length) return null;

  return (
    <section className="story-updates" id="updates" aria-label="Updates">
      {updates.map((update) => (
        <div className="story-update" key={update.date}>
          <h2 className="story-update-label">
            <time dateTime={update.date}>Update, {formatStoryDate(update.date)}</time>
          </h2>
          <p>{update.text}</p>
          {update.sourceName && update.sourceUrl ? (
            <p className="story-update-source">
              Source:{" "}
              <a href={update.sourceUrl} target="_blank" rel="noopener noreferrer">
                {update.sourceName}
              </a>
            </p>
          ) : null}
          {update.howToHelp?.length ? (
            <div className="story-update-help">
              <p>
                <strong>How to help now</strong>
              </p>
              <ul>
                {update.howToHelp.map((item) => (
                  <li key={item.url}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.label}
                    </a>
                    <span>{HELP_KIND_LABEL[item.kind]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ))}
      <p className="story-update-more">
        <Link href={FOLLOW_UPS_PATH}>All follow-ups</Link>
      </p>
    </section>
  );
}
