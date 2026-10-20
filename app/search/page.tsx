import type { Metadata } from "next";
import { Suspense } from "react";
import { pageAlternates } from "@/lib/seo";
import { STORY_PAGE_SIZE } from "@/lib/paging";
import { toCard } from "@/lib/present";
import { getPublishedStories } from "@/lib/stories";
import { SearchPanel } from "./search-panel";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Search",
  description: "Search verified good news by place, topic, or source.",
  alternates: pageAlternates("/search"),
  robots: { index: false, follow: true },
};

function SearchFallback() {
  return (
    <div className="wrap page-hero">
      <p className="kicker">Search</p>
      <h1>Find a story.</h1>
      <form className="search-form" action="/search">
        <input name="q" placeholder="Try Ohio, turtles, or a source name" aria-label="Search stories" />
        <button className="btn btn-ink" type="submit">
          Search
        </button>
      </form>
    </div>
  );
}

export default function SearchPage() {
  const latest = getPublishedStories().slice(0, STORY_PAGE_SIZE).map(toCard);
  return (
    <div className="page-block">
      <Suspense fallback={<SearchFallback />}>
        <SearchPanel latest={latest} />
      </Suspense>
    </div>
  );
}
