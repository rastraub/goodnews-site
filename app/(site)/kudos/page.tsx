import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { KUDOS_SHARE } from "@/lib/kudos-card-text";
import {
  KUDOS_CLASSROOM_NOTE,
  KUDOS_DESCRIPTION,
  KUDOS_PATH,
  KUDOS_RECENT_LIMIT,
  KUDOS_TITLE,
  filterKudos,
  honoreeForStory,
  kudosExcludeErrors,
  kudosPath,
  loadKudosExclude,
} from "@/lib/kudos";
import { placeLabel } from "@/lib/present";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const CRUMBS = [
  { name: "Today", path: "/" },
  { name: KUDOS_TITLE, path: KUDOS_PATH },
];

function readyStories() {
  const stories = getPublishedStories();
  const config = loadKudosExclude();
  const errors = kudosExcludeErrors(stories, config);
  if (errors.length) throw new Error(`Kudos exclude list:\n- ${errors.join("\n- ")}`);
  return filterKudos(stories, config.exclude);
}

export function generateMetadata(): Metadata {
  const stories = readyStories();
  return listingMeta({
    title: KUDOS_TITLE,
    description: KUDOS_DESCRIPTION,
    base: KUDOS_PATH,
    page: 1,
    total: Math.max(stories.length, 1),
  });
}

export default function KudosPage() {
  const stories = readyStories();
  const recent = stories.slice(0, KUDOS_RECENT_LIMIT);
  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: KUDOS_TITLE,
          description: KUDOS_DESCRIPTION,
          path: KUDOS_PATH,
          crumbs: CRUMBS,
          stories: [],
          items: recent.map((story) => ({ name: story.title, path: kudosPath(story.slug) })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>{KUDOS_TITLE}</span>
        </p>
        <p className="kicker">Thank a helper</p>
        <h1>Good News Kudos cards.</h1>
        <p className="lede">{KUDOS_DESCRIPTION}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p>
          {stories.length
            ? `${stories.length} ${stories.length === 1 ? "story can" : "stories can"} take a card. A card thanks a nurse, a teacher, a crossing guard, a firefighter crew, or a volunteer group, and it links back to the story. Stories about violence, politics, or a death do not get one.`
            : "Cards appear here when a story is a good fit for a thank-you."}
        </p>
        <ShareButtons title={KUDOS_TITLE} path={KUDOS_PATH} text={`${KUDOS_SHARE} ${siteConfig.name}`} />
      </div>
      <div className="wrap">
        <section className="classroom-box" id="classroom">
          <h2>For the classroom</h2>
          <p>{KUDOS_CLASSROOM_NOTE}</p>
          <p className="link-pills">
            <Link href="/kids">Classroom stories</Link>
            <Link href="/classroom">Good News Friday</Link>
            <Link href="/kindness-challenge">Kindness Challenge</Link>
          </p>
        </section>
        <section aria-labelledby="recent-kudos">
          <h2 id="recent-kudos" className="side-title">Recent stories</h2>
          {recent.length ? (
            <ul className="kudos-index">
              {recent.map((story) => (
                <li key={story.slug}>
                  <p className="kicker">{placeLabel(story)}</p>
                  <h3>
                    <Link href={`/story/${story.slug}`}>{story.title}</Link>
                  </h3>
                  <p>For {honoreeForStory(story)}</p>
                  <p>
                    <Link href={kudosPath(story.slug)}>Send a kudos card</Link>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <h2>No card yet.</h2>
              <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
                A story gets a card when a thank-you would be welcome.
              </p>
            </div>
          )}
          {stories.length > recent.length ? (
            <p className="kudos-note">More cards are linked from each eligible story.</p>
          ) : null}
        </section>
      </div>
      <EmailSignup id="kudos-email" />
    </div>
  );
}
