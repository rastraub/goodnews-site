import type { Metadata } from "next";
import Link from "next/link";
import { getHubIndex } from "@/lib/hubs";
import { pageAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Good news by topic",
  description: "Browse verified good news by topic, from animal rescue and libraries to schools, veterans, and wildlife.",
  alternates: pageAlternates("/topics"),
};

export default function TopicsPage() {
  const topics = getHubIndex().topics.slice().sort((a, b) => a.linkLabel.localeCompare(b.linkLabel));

  return (
    <section className="page-block">
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Topics</span>
        </p>
        <p className="kicker">Browse</p>
        <h1>Good news by topic.</h1>
        <p className="lede">
          {topics.length
            ? `${topics.length} topics with at least three verified stories each. Every story still links to the newsroom that reported it.`
            : "Topic pages appear here once three stories share a tag."}
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 8 }}>
        {topics.length ? (
          <div className="state-index">
            {topics.map((topic) => (
              <Link key={topic.path} href={topic.path} className="has">
                <span>{topic.linkLabel}</span>
                <span className="count">{topic.count}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
