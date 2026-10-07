import type { Metadata } from "next";
import { StoryCard } from "@/components/story-card";
import { toCard } from "@/lib/present";
import { searchStories } from "@/lib/stories";

export const metadata: Metadata = {
  title: "Search",
  description: "Search verified good news by place, topic, or source.",
  alternates: { canonical: "/search" },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const stories = searchStories(query);

  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Search</p>
        <h1>Find a story.</h1>
        <form className="search-form" action="/search">
          <input name="q" defaultValue={query} placeholder="Try Ohio, turtles, or a source name" aria-label="Search stories" />
          <button className="btn btn-ink" type="submit">
            Search
          </button>
        </form>
        <p className="lede">
          {query ? `${stories.length} ${stories.length === 1 ? "story" : "stories"} for “${query}”.` : "Or browse everything we have published."}
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 12 }}>
        <div className="grid">
          {stories.map((story) => (
            <StoryCard key={story.slug} story={toCard(story)} />
          ))}
        </div>
      </div>
    </div>
  );
}
