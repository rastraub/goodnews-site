import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryImage } from "@/components/story-image";
import { UsMap } from "@/components/us-map";
import { VerifiedBadge } from "@/components/verified-badge";
import { getCategory } from "@/lib/categories";
import { countryName } from "@/lib/countries";
import { openGraphImage } from "@/lib/feed-image";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { placeLabel } from "@/lib/present";
import { listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import {
  CLASSROOM_QUESTIONS,
  KINDNESS_ACTS,
  RELATED_HUBS,
  WORLD_KINDNESS_DESCRIPTION,
  WORLD_KINDNESS_PATH,
  WORLD_KINDNESS_SHARE,
  WORLD_KINDNESS_TITLE,
  getWorldKindnessDayHub,
  worldKindnessJsonLd,
} from "@/lib/world-kindness-day";
import { siteConfig } from "@/site.config";

export function generateMetadata(): Metadata {
  const hub = getWorldKindnessDayHub();
  const image = hub.imageStory ? openGraphImage(hub.imageStory) : undefined;
  return {
    ...listingMeta({
      title: WORLD_KINDNESS_TITLE,
      description: WORLD_KINDNESS_DESCRIPTION,
      base: WORLD_KINDNESS_PATH,
      page: 1,
      total: 1,
      image,
    }),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  };
}

function StoryTile({
  story,
  kicker,
  pinned,
  priority = false,
  id,
  readAloud = false,
}: {
  story: Story;
  kicker: string;
  pinned: boolean;
  priority?: boolean;
  id?: string;
  readAloud?: boolean;
}) {
  const category = getCategory(story.category);
  return (
    <article className="card" id={id}>
      <Link href={`/story/${story.slug}`} className="ph">
        <StoryImage
          src={story.image}
          alt={story.imageAlt}
          sizes="(max-width: 700px) 100vw, 25vw"
          priority={priority}
          treatment={story.imageTreatment}
        />
        <span className="cat" style={{ color: category?.color ?? "#24537F" }}>
          {kicker}
        </span>
      </Link>
      <div className="body">
        <div className="place">
          {placeLabel(story)}
          {pinned ? " · Pinned" : ""}
        </div>
        <h3>
          <Link href={`/story/${story.slug}`}>{story.title}</Link>
        </h3>
        <p>{story.dek}</p>
        {readAloud && story.kidSummary ? (
          <p className="gn-kid">
            <span>Read aloud</span>
            {story.kidSummary}
          </p>
        ) : null}
        <VerifiedBadge source={story.sourceName} />
      </div>
    </article>
  );
}

export default function WorldKindnessDayPage() {
  const hub = getWorldKindnessDayHub();
  const coveredLabel =
    hub.gaps.length === 0
      ? "Every state and Washington, D.C. has a story on this page."
      : `${hub.covered.length} of ${hub.slots.length} places have a story, counting Washington, D.C. An open state is ready for a tip.`;
  const leadSlug = hub.world[0]?.story.slug ?? hub.covered[0]?.story?.slug;

  return (
    <>
      <div className="page-block">
        <JsonLd data={worldKindnessJsonLd(hub)} />
        <div className="wrap page-hero">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>World Kindness Day</span>
          </p>
          <p className="kicker">November 13</p>
          <h1>Good news for World Kindness Day.</h1>
          <p className="lede">
            World Kindness Day is November 13. This page stays up all year. The stories are already in the archive:
            strangers helping strangers, kids doing something kind, neighbors, community acts, and people being kind to
            animals. Each one is checked and linked to the original report. Stories centered on violence, use of force,
            politics, or a tragedy are left off.
          </p>
          <p className="lede">
            {coveredLabel} Below the map are 13 free acts for November 13, and a kindness chain a class can print.
          </p>
          <p className="byline">
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </p>
          <p className="link-pills">
            <a href="#world">Around the world</a>
            <a href="#states">States</a>
            <a href="#kids">Kids</a>
            <a href="#acts">13 free acts</a>
            <a href="#classroom">For classrooms</a>
            <a href="#share">Share</a>
            <Link href={KINDNESS_INDEX_PATH}>Kindness Challenge</Link>
            <Link href="/kids">Kids section</Link>
            <Link href="/topic/kindness">All kindness stories</Link>
          </p>
        </div>

        <div className="wrap" id="world">
          <h2 className="side-title">Kindness around the world</h2>
          <p className="lede">
            One strong match from each country outside the United States that already has a kindness story in the
            archive.
          </p>
          {hub.world.length ? (
            <div className="grid">
              {hub.world.map((item) => (
                <StoryTile
                  key={item.story.slug}
                  story={item.story}
                  kicker={countryName(item.story.country)}
                  pinned={item.pinned}
                  priority={item.story.slug === leadSlug}
                />
              ))}
            </div>
          ) : (
            <article className="card fr-gap">
              <div className="body">
                <h3>No international story yet</h3>
                <p>The archive does not have a kindness story filed outside the United States that clears this page.</p>
                <Link className="btn btn-ink" href="/submit">
                  Submit a story
                </Link>
              </div>
            </article>
          )}
        </div>

        <div className="wrap" id="states">
          <h2 className="side-title">Kindness in all 50 states</h2>
          <p className="lede">
            One story for each state the archive can match, including Washington, D.C. Gold marks a story. An open state
            is waiting for a tip.
          </p>
          <div className="fr-map-wrap">
            <UsMap
              highlighted={hub.covered.map((slot) => slot.state.code)}
              legend={[{ swatch: "#FFD36E", label: "Story on this page" }]}
              labels={false}
            />
          </div>
          <nav className="state-index" aria-label="States">
            {hub.slots.map((slot) => (
              <a key={slot.state.code} href={`#wk-${slot.state.slug}`} className={slot.story ? "has" : undefined}>
                <span>{slot.state.name}</span>
                {slot.story ? <span className="count">Story</span> : <span className="open">Open</span>}
              </a>
            ))}
          </nav>
          <div className="grid">
            {hub.slots.map((slot) => {
              const story = slot.story;
              if (!story) {
                return (
                  <article key={slot.state.code} id={`wk-${slot.state.slug}`} className="card fr-gap">
                    <div className="body">
                      <div className="place">
                        <Link href={`/state/${slot.state.slug}`}>{slot.state.name}</Link>
                      </div>
                      <h3>Still open: {slot.state.name}</h3>
                      <p>
                        This spot is waiting for a kindness story from {slot.state.name}. Send one in and the newsroom
                        will check it.
                      </p>
                      <Link className="btn btn-ink" href="/submit">
                        Submit a story
                      </Link>
                    </div>
                  </article>
                );
              }
              return (
                <StoryTile
                  key={slot.state.code}
                  id={`wk-${slot.state.slug}`}
                  story={story}
                  kicker={slot.state.name}
                  pinned={slot.pinned}
                  priority={story.slug === leadSlug}
                />
              );
            })}
          </div>
        </div>

        <div className="wrap" id="kids">
          <h2 className="side-title">Kids being kind</h2>
          <p className="lede">
            Kid-friendly stories from the archive, with kids doing the kind thing listed first. When a story has a
            read-aloud summary, it is on the card.
          </p>
          {hub.kids.length ? (
            <div className="grid">
              {hub.kids.map((item) => (
                <StoryTile
                  key={item.story.slug}
                  story={item.story}
                  kicker="For classrooms"
                  pinned={item.pinned}
                  readAloud
                />
              ))}
            </div>
          ) : (
            <article className="card fr-gap">
              <div className="body">
                <h3>No classroom story yet</h3>
                <p>The archive does not have a kid-friendly kindness story that clears this page.</p>
                <Link className="btn btn-ink" href="/submit">
                  Submit a story
                </Link>
              </div>
            </article>
          )}
          <p className="lede" style={{ marginTop: 18 }}>
            More stories a teacher can read aloud are in the <Link href="/kids">Kids section</Link>.
          </p>
        </div>

        <div className="wrap" id="acts">
          <h2 className="side-title">13 free acts of kindness for Nov 13</h2>
          <p className="lede">
            Thirteen simple ideas for November 13. They are free, they do not ask anyone for money or a personal
            detail, and they are not news reports. A child should stay with people they already know.
          </p>
          <ol className="kindness-acts">
            {KINDNESS_ACTS.map((act) => (
              <li key={act.title}>
                <div>
                  <strong>{act.title}</strong>
                  <p>{act.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="wrap">
          <section className="classroom-box" id="classroom">
            <h2>For classrooms</h2>
            <p className="teacher-note">
              A short note for a teacher to read with children about ages 6 to 12. This page is for adults. Do not ask
              students for a full name, age, school, or email address. Do not send children off alone.
            </p>
            <h3>Kindness chain</h3>
            <p>
              Cut one paper strip for each student, about one inch by six inches. Each student writes one free kind act
              on a strip. It can be one of the 13 acts, or one of their own that needs no money and no trip alone. Loop
              the strips into a paper chain and hang it in the classroom. A first name on a strip is optional. The act
              is the point.
            </p>
            <div className="fr-card wk-chain">
              <p>Our kindness chain</p>
              <p>One free act I can do: _______________</p>
              <p>I can do it on November 13, or on any ordinary day.</p>
            </div>
            <h3>Thank-you note</h3>
            <p>Print this and let the class fill in the blanks. The note goes to someone the student already knows.</p>
            <div className="fr-card">
              <p>Dear ________,</p>
              <p>Thank you for ________.</p>
              <p>It helped me because ________.</p>
              <p>From, ________</p>
            </div>
            <div className="print-actions">
              <PrintButton label="Print the classroom activity" />
            </div>
            <h3>Discussion questions</h3>
            <ol>
              {CLASSROOM_QUESTIONS.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </section>

          <section id="related">
            <h2 className="side-title">Keep going</h2>
            <p className="lede">Other pages on this site, if you want a next step after November 13.</p>
            <div className="help-list" style={{ marginTop: 16 }}>
              {RELATED_HUBS.map((hubLink) => (
                <Link key={hubLink.href} href={hubLink.href}>
                  <span>
                    {hubLink.label}
                    <span className="from">{hubLink.note}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section id="share">
            <h2 className="side-title">Share the day</h2>
            <p className="lede">{WORLD_KINDNESS_SHARE}</p>
            <div style={{ marginTop: 14 }}>
              <ShareButtons title={WORLD_KINDNESS_SHARE} path={WORLD_KINDNESS_PATH} text={WORLD_KINDNESS_SHARE} />
            </div>
          </section>
        </div>
      </div>
      <EmailSignup id="world-kindness-email" />
    </>
  );
}
