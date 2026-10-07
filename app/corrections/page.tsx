import type { Metadata } from "next";
import Link from "next/link";
import { formatStoryDate } from "@/lib/format";
import { getPublishedStories } from "@/lib/stories";

export const metadata: Metadata = {
  title: "Corrections",
  description: "When we get something wrong, we say so here and on the story.",
  alternates: { canonical: "/corrections" },
};

export default function CorrectionsPage() {
  const corrections = getPublishedStories().filter((story) => story.correction);
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Our promise</p>
        <h1>Corrections</h1>
        <p className="lede">
          If a summary is wrong, we correct the story in public and list it here. We do not quietly rewrite the past.
        </p>
        {corrections.length ? (
          <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
            {corrections.map((story) => (
              <article key={story.slug} className="side-card">
                <h2>
                  <Link href={`/story/${story.slug}`}>{story.title}</Link>
                </h2>
                <p className="time">{formatStoryDate(story.date)}</p>
                <p style={{ marginTop: 8 }}>{story.correction}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 24 }}>
            <h2>No corrections yet.</h2>
            <p>When we get something wrong, it will be listed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
