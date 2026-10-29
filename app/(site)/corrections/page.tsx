import type { Metadata } from "next";
import Link from "next/link";
import { formatStoryDate } from "@/lib/format";
import { pageAlternates } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Corrections",
  description: `How to ask ${siteConfig.name} for a correction, and the public list of fixes already made.`,
  alternates: pageAlternates("/corrections"),
};

export default function CorrectionsPage() {
  const corrections = getPublishedStories().filter((story) => story.correction);
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="crumbs">
          <Link href="/about">About</Link>
          <span aria-hidden="true">/</span>
          <span>Corrections</span>
        </p>
        <p className="kicker">Our promise</p>
        <h1>Corrections</h1>
        <p className="lede">
          If a summary is wrong, we correct the story in public and list it here. We do not quietly rewrite the past.
        </p>
        <h2>How to request a correction</h2>
        <p>
          Email <a href={`mailto:${siteConfig.contactEmail}?subject=Correction`}>{siteConfig.contactEmail}</a> with three things: the link to the story, the sentence you believe is wrong, and a source that shows the right fact. You can also start from the <Link href="/contact">contact page</Link>.
        </p>
        <p>
          The {siteConfig.editor.name} reads correction requests. When we agree, we change the summary, leave a note on the story, and add that note to the list below. The note stays up. The standards behind that promise are on the <Link href="/editorial-standards">editorial standards</Link> page.
        </p>
        <p>
          If the mistake is in the original report and we repeated it accurately, tell us anyway. Once the record is clear, we correct our summary and say so.
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
