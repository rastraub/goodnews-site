import type { Metadata } from "next";
import Link from "next/link";
import { LocalExplorer } from "@/components/local-explorer";
import { StoryCard } from "@/components/story-card";
import { toCard } from "@/lib/present";
import { getPublishedStories, stateCounts } from "@/lib/stories";
import { getStateByCode, stateName, STATES } from "@/lib/states";

export const metadata: Metadata = {
  title: "Good news near you",
  description: "Pick a state and read verified, uplifting stories from close to home.",
  alternates: { canonical: "/local" },
};

export default function LocalPage() {
  const stories = getPublishedStories();
  const counts = stateCounts(stories);
  const countByCode = new Map(counts.map((item) => [item.code, item.count]));
  const chips = counts.slice(0, 4).map((item) => ({
    href: `/state/${getStateByCode(item.code)?.slug ?? ""}`,
    label: stateName(item.code),
    count: item.count,
  }));

  return (
    <>
      <LocalExplorer highlighted={counts.map((item) => item.code.toLowerCase())} chips={chips} />
      <section className="page-block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="shead">
            <div>
              <h2>All 50 states</h2>
              <p>Plus Washington, D.C. States with a gold count have a story up right now.</p>
            </div>
          </div>
          <div className="state-index">
            {STATES.map((state) => {
              const count = countByCode.get(state.code) ?? 0;
              return (
                <Link key={state.code} href={`/state/${state.slug}`} className={count ? "has" : undefined}>
                  <span>{state.name}</span>
                  {count ? <span className="count">{count}</span> : null}
                </Link>
              );
            })}
          </div>
          <div className="shead" style={{ marginTop: 56 }}>
            <div>
              <h2>Latest from the states</h2>
              <p>Every story still links back to the newsroom that reported it.</p>
            </div>
          </div>
          <div className="grid">
            {stories.map((story) => (
              <StoryCard key={story.slug} story={toCard(story)} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
