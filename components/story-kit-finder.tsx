"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type KitStory = {
  slug: string;
  title: string;
  place: string;
  sourceName: string;
};

export function StoryKitFinder({ stories }: { stories: KitStory[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const pool = needle
      ? stories.filter((story) => `${story.title} ${story.place} ${story.sourceName}`.toLowerCase().includes(needle))
      : stories;
    return pool.slice(0, needle ? 30 : 8);
  }, [needle, stories]);

  return (
    <div className="kit-finder">
      <label className="field" htmlFor="kit-find">
        Find your story
        <input
          id="kit-find"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Headline, city, or newsroom"
          autoComplete="off"
        />
      </label>
      <p className="empty-note" aria-live="polite">
        {matches.length === 0
          ? "No story matches that. Try the newsroom's name or a word from the headline."
          : needle
            ? `${matches.length} matching ${matches.length === 1 ? "story" : "stories"}.`
            : "Showing the latest stories. Search to find an older one."}
      </p>
      {matches.length ? (
        <ul className="kit-list">
          {matches.map((story) => (
            <li key={story.slug}>
              <Link href={`/featured/${story.slug}`}>
                <span>{story.title}</span>
                <small>
                  {story.sourceName} · {story.place}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
