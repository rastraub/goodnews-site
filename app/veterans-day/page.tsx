import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import { UsMap } from "@/components/us-map";
import { VerifiedBadge } from "@/components/verified-badge";
import { HELP_KIND_LABEL } from "@/lib/help";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, pageAlternates, xHandle } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import {
  getVeteransDayHub,
  VETERANS_DAY_DESCRIPTION,
  VETERANS_DAY_PATH,
  VETERANS_DAY_TITLE,
} from "@/lib/veterans-day";
import { siteConfig } from "@/site.config";

const hub = getVeteransDayHub();
const social = hub.socialStory ? openGraphImage(hub.socialStory) : undefined;

export const metadata: Metadata = {
  title: VETERANS_DAY_TITLE,
  description: VETERANS_DAY_DESCRIPTION,
  authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  alternates: pageAlternates(VETERANS_DAY_PATH),
  openGraph: {
    title: VETERANS_DAY_TITLE,
    description: VETERANS_DAY_DESCRIPTION,
    url: VETERANS_DAY_PATH,
    ...(social
      ? {
          images: [
            {
              url: social.url,
              alt: social.alt,
              type: social.type,
              ...(social.width && social.height ? { width: social.width, height: social.height } : {}),
            },
          ],
        }
      : {}),
  },
  twitter: {
    card: "summary_large_image",
    site: xHandle(),
    title: VETERANS_DAY_TITLE,
    description: VETERANS_DAY_DESCRIPTION,
    ...(social ? { images: [social.url] } : {}),
  },
};

function readAloudStories(stories: Story[]) {
  return stories.map((story, index) => {
    let separator = "";
    if (index > 0) {
      const last = index === stories.length - 1;
      separator = stories.length === 2 ? " and " : last ? ", and " : ", ";
    }
    return (
      <span key={story.slug}>
        {separator}
        <Link href={`/story/${story.slug}`}>{story.title}</Link>
      </span>
    );
  });
}

export default function VeteransDayPage() {
  const page = getVeteransDayHub();
  const listed: { slug: string; title: string }[] = [];
  const seenStories = new Set<string>();
  const readAloud: Story[] = [];
  for (const slot of page.covered) {
    if (!slot.story || seenStories.has(slot.story.slug)) continue;
    seenStories.add(slot.story.slug);
    listed.push({ slug: slot.story.slug, title: slot.story.title });
    if (slot.story.kidFriendly && slot.story.kidSummary) readAloud.push(slot.story);
  }
  const firstImage = page.slots.findIndex((slot) => slot.story);
  const coveredLabel =
    page.gaps.length === 0
      ? "Every state and Washington, D.C. has a story on this page."
      : `${page.covered.length} of ${page.slots.length} places have a story, counting Washington, D.C. The open ones are ready for a tip.`;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: VETERANS_DAY_TITLE,
          description: VETERANS_DAY_DESCRIPTION,
          path: VETERANS_DAY_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Veterans Day", path: VETERANS_DAY_PATH },
          ],
          stories: listed,
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Veterans Day</span>
        </p>
        <p className="kicker">Veterans Day</p>
        <h1>Good news for Veterans Day.</h1>
        <p className="lede">
          Veterans Day is November 11. This page stays up all year. Each state and Washington, D.C. is paired with one
          kindness story from the archive, such as an honor flight, a home, a service dog, or a welcome home. The newest
          strong match is the one on the card. Each story is checked and linked to the original report.
        </p>
        <p className="lede" style={{ marginTop: 12 }}>
          {coveredLabel}
        </p>
        <p className="byline" style={{ marginTop: 18 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <a href="#states">States</a>
          <a href="#classroom">For classrooms</a>
          <a href="#how-to-help">How to help</a>
          <Link href="/kids">Kids section</Link>
        </p>
      </div>

      <div className="wrap" id="states">
        <h2 className="side-title">Find a state</h2>
        <div className="vet-map-wrap">
          <UsMap
            highlighted={page.covered.map((slot) => slot.state.code)}
            legend={[{ swatch: "#FFD36E", label: "Story on this page" }]}
            labels={false}
          />
        </div>
        <div className="state-index">
          {page.slots.map((slot) => (
            <a key={slot.state.code} href={`#vd-${slot.state.slug}`} className={slot.story ? "has" : undefined}>
              <span>{slot.state.name}</span>
              {slot.story ? <span className="count">Story</span> : <span className="open">Open</span>}
            </a>
          ))}
        </div>

        <section className="classroom-box" id="classroom">
          <h2>For classrooms</h2>
          <p className="teacher-note">A short note for a teacher to read with children about ages 6 to 12. This page is for adults.</p>
          <h3>Thank-you cards</h3>
          <p>
            Ask the class to write a short thank-you card. If the students know a veteran, a first name is enough. If
            they do not, start with “Dear Veteran” and thank them for one specific thing the class can say out loud,
            such as help in a hometown. A teacher can mail the cards to a veterans home, a local post, or a group named
            in the how-to-help list on this page. Leave politics out of the cards. Do not ask students for a full name,
            age, school, or email address.
          </p>
          <ol>
            <li>What did people in one story on this page actually do for a veteran?</li>
            <li>What specific thank-you could your class write in two or three sentences?</li>
            <li>Which group named on this page could a teacher contact before the cards are mailed?</li>
          </ol>
          <p>
            More stories a teacher can read aloud are in the <Link href="/kids">Kids section</Link>.
            {readAloud.length ? <> On this page, a teacher can also read: {readAloudStories(readAloud)}.</> : null}
          </p>
        </section>

        <h2 className="side-title" id="stories">
          The stories
        </h2>
        <div className="grid">
          {page.slots.map((slot, index) => {
            const story = slot.story;
            if (!story) {
              return (
                <article key={slot.state.code} id={`vd-${slot.state.slug}`} className="card vet-gap">
                  <div className="body">
                    <div className="place">
                      <Link href={`/state/${slot.state.slug}`}>{slot.state.name}</Link>
                    </div>
                    <h3>Still open: {slot.state.name}</h3>
                    <p>
                      This spot is waiting for a kindness story about a veteran in {slot.state.name}. Send one in and
                      the newsroom will check it.
                    </p>
                    <Link className="btn btn-ink" href="/submit">
                      Submit a story
                    </Link>
                  </div>
                </article>
              );
            }
            return (
              <article key={slot.state.code} id={`vd-${slot.state.slug}`} className="card">
                <Link href={`/story/${story.slug}`} className="ph">
                  <StoryImage
                    src={story.image}
                    alt={story.imageAlt}
                    sizes="(max-width: 700px) 100vw, 25vw"
                    priority={index === firstImage}
                    treatment={story.imageTreatment}
                  />
                  <span className="cat" style={{ color: "#24537F" }}>
                    {slot.state.name}
                  </span>
                </Link>
                <div className="body">
                  <div className="place">
                    <Link href={`/state/${slot.state.slug}`}>{slot.state.name}</Link>
                    {slot.pinned ? " · Pinned" : ""}
                  </div>
                  <h3>
                    <Link href={`/story/${story.slug}`}>{story.title}</Link>
                  </h3>
                  <p>{story.dek}</p>
                  <VerifiedBadge source={story.sourceName} />
                </div>
                <div className="foot vet-foot">
                  <a className="source-link" href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Read it on {story.sourceName}
                  </a>
                  <Link href={`/story/${story.slug}#how-to-help`} className="howto">
                    <svg className="ico" aria-hidden="true">
                      <use href="#i-hand" />
                    </svg>
                    How to help
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <section id="how-to-help">
          <h2 className="side-title">How to help veterans</h2>
          {page.help.length ? (
            <>
              <p className="lede">These are the how-to-help links already published on the stories above.</p>
              <div className="help-list cols-2" style={{ marginTop: 16 }}>
                {page.help.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                    <span>
                      {item.label}
                      <span className="from">
                        {item.stateName} · {item.storyTitle}
                      </span>
                    </span>
                    <small>{HELP_KIND_LABEL[item.kind]}</small>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="lede">Help links show up here when a story on this page names an organization.</p>
          )}
        </section>
      </div>
    </div>
  );
}
