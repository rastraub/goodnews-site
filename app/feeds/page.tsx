import type { Metadata } from "next";
import { CopyLink } from "@/components/copy-link";
import { feedCatalog, feedlySubscribeUrl, inoreaderSubscribeUrl } from "@/lib/feed";
import { absoluteUrl, pageAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Feeds",
  description: "RSS, Atom, and section feeds. Copy a URL or open it in Feedly or Inoreader.",
  alternates: pageAlternates("/feeds"),
};

export default function FeedsPage() {
  const groups = feedCatalog();
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">Subscribe</p>
        <h1>Feeds</h1>
        <p className="lede">
          Copy a feed, or add it to Feedly or Inoreader. Each address stays the same when new stories publish.
        </p>
      </div>
      <div className="wrap feed-groups">
        {groups.map((group) => (
          <section key={group.heading}>
            <h2>{group.heading}</h2>
            {group.feeds.map((feed) => {
              const url = absoluteUrl(feed.path);
              return (
                <div className="feed-row" key={feed.path}>
                  <div className="name">
                    <a href={url}>{feed.title}</a>
                    <span className="blurb">{feed.blurb}</span>
                  </div>
                  <div className="feed-actions">
                    <CopyLink value={url} />
                    <a className="btn btn-outline" href={feedlySubscribeUrl(url)} target="_blank" rel="noopener noreferrer">
                      Feedly
                    </a>
                    <a className="btn btn-outline" href={inoreaderSubscribeUrl(url)} target="_blank" rel="noopener noreferrer">
                      Inoreader
                    </a>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
