import type { Metadata } from "next";
import { StoryCard } from "@/components/story-card";
import { toCard } from "@/lib/present";
import { getPublishedStories } from "@/lib/stories";

export const metadata: Metadata = {
  title: "All stories",
  description: "Every verified story on the site, newest first.",
  alternates: { canonical: "/stories" },
};

export default function StoriesPage() {
  const stories = getPublishedStories();
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Today</p>
        <h1>All the good news.</h1>
        <p className="lede">Newest first. Each card links to a summary and to the original report.</p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="grid">
          {stories.map((story) => (
            <StoryCard key={story.slug} story={toCard(story)} />
          ))}
        </div>
      </div>
    </div>
  );
}
