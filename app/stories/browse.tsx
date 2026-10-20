import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { pageCount, pageSlice } from "@/lib/paging";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";

const TITLE = "All stories";
const DESCRIPTION = "Every verified story on the site, newest first.";

export function storiesPageMetadata(page: number): Metadata {
  const total = getPublishedStories().length;
  if (page > pageCount(total)) return {};
  return listingMeta({
    title: TITLE,
    description: DESCRIPTION,
    base: "/stories",
    page,
    total,
  });
}

export function StoriesBrowse({ page }: { page: number }) {
  const stories = getPublishedStories();
  const path = page <= 1 ? "/stories" : `/stories/page/${page}`;
  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "All stories", path: "/stories" },
          ],
          stories: pageSlice(stories, page),
        })}
      />
      <div className="wrap page-hero">
        <p className="kicker">Today</p>
        <h1>All the good news.</h1>
        <p className="lede">Newest first. Each card links to a summary and to the original report.</p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <StoryGrid stories={stories} page={page} base="/stories" />
      </div>
    </div>
  );
}
