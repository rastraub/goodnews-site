import type { Metadata } from "next";
import Link from "next/link";
import { HELP_KIND_LABEL } from "@/lib/help";
import { getPublishedStories } from "@/lib/stories";

export const metadata: Metadata = {
  title: "Ways to help",
  description: "Donate, volunteer, or say thank you. One practical action beside each story.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  const stories = getPublishedStories();
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">How to help</p>
        <h1>Turn a smile into action.</h1>
        <p className="lede">Each story includes a practical next step. The links below go to the organizations named in the reporting, not to us.</p>
      </div>
      <div className="wrap" style={{ paddingTop: 12, display: "grid", gap: 18 }}>
        {stories.map((story) => (
          <section key={story.slug} className="side-card">
            <h2>
              <Link href={`/story/${story.slug}`}>{story.title}</Link>
            </h2>
            <div className="help-list">
              {story.howToHelp.map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                  <span>{item.label}</span>
                  <small>{HELP_KIND_LABEL[item.kind]}</small>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
