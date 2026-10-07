import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryCard } from "@/components/story-card";
import { StateJump } from "@/components/local-explorer";
import { UsMap } from "@/components/us-map";
import { toCard } from "@/lib/present";
import { getByState, stateCounts } from "@/lib/stories";
import { getStateBySlug, STATES } from "@/lib/states";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STATES.map((state) => ({ slug: state.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return {};
  return {
    title: `Good news from ${state.name}`,
    description: `Verified, uplifting stories from ${state.name}. Every story links to its original source.`,
    alternates: { canonical: `/state/${state.slug}` },
  };
}

export default async function StatePage({ params }: Props) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) notFound();
  const stories = getByState(state.code);
  const highlighted = stateCounts().map((item) => item.code.toLowerCase());

  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Local</p>
        <h1>Good news from {state.name}.</h1>
        <p className="lede">
          {stories.length
            ? `${stories.length} verified ${stories.length === 1 ? "story" : "stories"} connected to ${state.name}.`
            : `We have not published a story from ${state.name} yet. If you know one, send it in.`}
        </p>
      </div>
      <div className="wrap state-layout" style={{ paddingTop: 24 }}>
        <div>
          {stories.length ? (
            <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
              {stories.map((story) => (
                <StoryCard key={story.slug} story={toCard(story)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>{state.name} is due for some good news.</h2>
              <p style={{ margin: "8px 0 18px", color: "var(--ink2)" }}>
                Kindness is happening here. It just has not crossed our desk yet.
              </p>
              <Link className="btn btn-ink" href="/submit">
                Submit a {state.name} story
              </Link>
            </div>
          )}
        </div>
        <aside className="state-side">
          <UsMap home={state.code.toLowerCase()} highlighted={highlighted} />
          <StateJump code={state.code} />
          <p style={{ marginTop: 14 }}>
            <Link className="more" href="/local">
              See all 50 states
              <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
