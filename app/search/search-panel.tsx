"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StoryCard } from "@/components/story-card";
import type { StoryCardModel } from "@/lib/present";

export function SearchPanel({ latest }: { latest: StoryCardModel[] }) {
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const [result, setResult] = useState<{
    query: string;
    status: "done" | "error";
    stories: StoryCardModel[];
    total: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!query) return;
    const current = query;
    let cancel = false;
    fetch(`/api/search?q=${encodeURIComponent(current)}`)
      .then(async (response) => {
        const data = (await response.json()) as { ok?: boolean; error?: string; total?: number; stories?: StoryCardModel[] };
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Search failed");
        }
        return data;
      })
      .then((data) => {
        if (cancel) return;
        setResult({
          query: current,
          status: "done",
          stories: data.stories ?? [],
          total: data.total ?? 0,
          message: "",
        });
      })
      .catch((error: unknown) => {
        if (cancel) return;
        setResult({
          query: current,
          status: "error",
          stories: [],
          total: 0,
          message: error instanceof Error ? error.message : "Search failed. Try again in a minute.",
        });
      });
    return () => {
      cancel = true;
    };
  }, [query]);

  const active = result && result.query === query ? result : null;
  const status = !query ? "idle" : active ? active.status : "loading";
  const stories = active?.stories ?? [];
  const total = active?.total ?? 0;
  const showing = query ? stories : latest;

  return (
    <>
      <div className="wrap page-hero">
        <p className="kicker">Search</p>
        <h1>Find a story.</h1>
        <form className="search-form" action="/search">
          <input key={query} name="q" defaultValue={query} placeholder="Try Ohio, turtles, or a source name" aria-label="Search stories" />
          <button className="btn btn-ink" type="submit">
            Search
          </button>
        </form>
        <p className="lede">
          {query
            ? status === "loading"
              ? "Searching…"
              : status === "done"
                ? `${total} ${total === 1 ? "story" : "stories"} for “${query}”.`
                : "Search did not finish."
            : <>Latest stories are below. The full archive is on <Link href="/stories">all stories</Link>.</>}
        </p>
        {query && status === "error" ? <p className="error" role="alert">{active?.message}</p> : null}
        {query && status === "done" && total > stories.length ? (
          <p className="lede">Showing the first {stories.length}. Try a more specific word to narrow it.</p>
        ) : null}
      </div>
      <div className="wrap" style={{ paddingTop: 12 }}>
        <div className="grid">
          {showing.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      </div>
    </>
  );
}
