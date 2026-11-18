import Link from "next/link";
import { starterForStory } from "@/lib/starters";
import type { Story } from "@/lib/stories";

/** A small server-rendered prompt under a story. Renders nothing when the match is weak or excluded. */
export function StarterBox({ story }: { story: Story }) {
  const match = starterForStory(story);
  if (!match) return null;
  const titleId = `starter-${story.slug}`;
  return (
    <aside className="starter-box" aria-labelledby={titleId}>
      <p className="kicker">Do this where you live</p>
      <h2 id={titleId}>{match.action.title}</h2>
      <ol>
        {match.action.shortSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>
        <Link href={match.href}>See the full starter</Link>
        {` for ${match.rangeLabel}.`}
      </p>
    </aside>
  );
}
