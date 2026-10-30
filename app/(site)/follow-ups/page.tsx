import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { FOLLOW_UPS_FEED_PATH, FOLLOW_UPS_PATH, latestUpdate, storiesWithFollowUps } from "@/lib/follow-ups";
import { formatStoryDate } from "@/lib/format";
import { placeLabel } from "@/lib/present";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

const TITLE = "Follow-ups";
const DESCRIPTION = `Where are they now? Dated updates on stories ${siteConfig.name} already published. Each follow-up stays on the original story URL.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates(FOLLOW_UPS_PATH, FOLLOW_UPS_FEED_PATH),
};

export default function FollowUpsPage() {
  const stories = storiesWithFollowUps();
  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: FOLLOW_UPS_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: TITLE, path: FOLLOW_UPS_PATH },
          ],
          stories,
        })}
      />
      <div className="wrap page-hero prose-page">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Follow-ups</span>
        </p>
        <p className="kicker">What happened next</p>
        <h1>Follow-ups</h1>
        <p className="lede">{DESCRIPTION}</p>
        <p className="follow-intro">
          <Link href="/submit">Have an update on a story we covered?</Link> Send the story link and what changed. We check it before it goes up.
        </p>
        <p className="follow-intro">
          <a href={FOLLOW_UPS_FEED_PATH}>Follow-ups RSS</a>
        </p>
        {stories.length ? null : (
          <div className="empty">
            <h2>No follow-ups yet.</h2>
            <p>When we check back on a story, the update will be listed here. The story keeps its original address.</p>
          </div>
        )}
      </div>
      {stories.length ? (
        <div className="wrap follow-list">
          {stories.map((story) => {
            const update = latestUpdate(story);
            if (!update) return null;
            const earlier = story.updates.length - 1;
            return (
              <article key={story.slug} className="side-card">
                <h2>
                  <Link href={`/story/${story.slug}#updates`}>{story.title}</Link>
                </h2>
                <p className="time">
                  <time dateTime={update.date}>Update, {formatStoryDate(update.date)}</time>
                  {" · "}
                  {placeLabel(story)}
                  {" · "}
                  Published {formatStoryDate(story.date)}
                </p>
                <p>{update.text}</p>
                {update.sourceName && update.sourceUrl ? (
                  <p className="follow-source">
                    Source:{" "}
                    <a href={update.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {update.sourceName}
                    </a>
                  </p>
                ) : null}
                {earlier > 0 ? (
                  <p className="time">
                    {earlier === 1 ? "1 earlier update" : `${earlier} earlier updates`} on this story.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
