import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryImage } from "@/components/story-image";
import { UsMap } from "@/components/us-map";
import { VerifiedBadge } from "@/components/verified-badge";
import { PrintButton } from "@/app/kids/print-button";
import { getCategory } from "@/lib/categories";
import { openGraphImage } from "@/lib/feed-image";
import {
  CLASSROOM_QUESTIONS,
  FIRST_RESPONDERS_DAY_PATH,
  FIRST_RESPONDERS_RESOLUTION_URL,
  THANK_YOU_LINKS,
  firstRespondersDescription,
  firstRespondersShareText,
  firstRespondersTitle,
  getFirstRespondersDayHub,
} from "@/lib/first-responders-day";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export function generateMetadata(): Metadata {
  const hub = getFirstRespondersDayHub();
  const description = firstRespondersDescription(hub.year);
  const title = firstRespondersTitle(hub.year);
  const image = hub.imageStory ? openGraphImage(hub.imageStory) : undefined;
  return {
    ...listingMeta({
      title,
      description,
      base: FIRST_RESPONDERS_DAY_PATH,
      page: 1,
      total: 1,
      image,
    }),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  };
}

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

function StoryTile({
  story,
  kicker,
  pinned,
  priority = false,
  id,
}: {
  story: Story;
  kicker: string;
  pinned: boolean;
  priority?: boolean;
  id?: string;
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
          {story.place ?? story.city}
          {pinned ? " · Pinned" : ""}
        </div>
        <h3>
          <Link href={`/story/${story.slug}`}>{story.title}</Link>
        </h3>
        <p>{story.dek}</p>
        <VerifiedBadge source={story.sourceName} />
      </div>
    </article>
  );
}

function GapCard({ title, body, id }: { title: string; body: string; id?: string }) {
  return (
    <article id={id} className="card fr-gap">
      <div className="body">
        <h3>{title}</h3>
        <p>{body}</p>
        <Link className="btn btn-ink" href="/submit">
          Submit a story
        </Link>
      </div>
    </article>
  );
}

export default function FirstRespondersDayPage() {
  const hub = getFirstRespondersDayHub();
  const shareText = firstRespondersShareText(hub.year);
  const description = firstRespondersDescription(hub.year);
  const title = firstRespondersTitle(hub.year);
  const seen = new Set<string>();
  const readAloud: Story[] = [];
  for (const story of hub.stories) {
    if (seen.has(story.slug) || !story.kidFriendly || !story.kidSummary) continue;
    seen.add(story.slug);
    readAloud.push(story);
  }
  const coveredLabel =
    hub.gaps.length === 0
      ? "Every state and Washington, D.C. has a story on this page."
      : `${hub.covered.length} of ${hub.slots.length} places have a story, counting Washington, D.C. An open state is ready for a tip.`;
  const leadSlug =
    hub.roles.find((role) => role.stories.length)?.stories[0]?.story.slug ?? hub.covered[0]?.story?.slug;

  return (
    <>
      <div className="page-block">
        <JsonLd
          data={listingJsonLd({
            name: title,
            description,
            path: FIRST_RESPONDERS_DAY_PATH,
            crumbs: [
              { name: "Today", path: "/" },
              { name: "First Responders Day", path: FIRST_RESPONDERS_DAY_PATH },
            ],
            stories: hub.stories,
          })}
        />
        <div className="wrap page-hero">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>First Responders Day</span>
          </p>
          <p className="kicker">October 28, {hub.year}</p>
          <h1>Thank you, first responders.</h1>
          <p className="lede">
            October 28, {hub.year} is Honoring the Nation&apos;s First Responders Day. This page stays up all year, and
            the date shown is always the current year. Senate resolutions have supported the designation. One example is{" "}
            <a href={FIRST_RESPONDERS_RESOLUTION_URL} target="_blank" rel="noopener noreferrer">
              S.Con.Res.15
            </a>{" "}
            in the 116th Congress. The Senate agreed to it in support of October 28, 2019.
          </p>
          <p className="lede" style={{ marginTop: 12 }}>
            First responders are firefighters, police officers and deputies, EMS and flight crews, 911 dispatchers, and
            search-and-rescue teams. The stories here are rescues, lifesaving help, reunions with the people they
            saved, and kindness in the community. Each one is checked and linked to the original report. Stories about
            use of force, shootings, pursuits, crime suspects, or politics are left off this page.
          </p>
          <p className="lede" style={{ marginTop: 12 }}>
            {coveredLabel}
          </p>
          <p className="byline" style={{ marginTop: 18 }}>
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </p>
          <p className="link-pills">
            <a href="#roles">By role</a>
            <a href="#states">By state</a>
            <a href="#thanks">How to say thanks</a>
            <a href="#classroom">For classrooms</a>
            <a href="#share">Share</a>
            <Link href="/topic/first-responders">All first-responder stories</Link>
          </p>
        </div>

        <div className="wrap" id="roles">
          <h2 className="side-title">By role</h2>
          <p className="lede">
            The strongest matches from the archive, grouped by the job the story describes. A newsroom pin stays at the
            front of its group.
          </p>
          {hub.roles.map((role) => (
            <section key={role.slug} id={`role-${role.slug}`} className="fr-role">
              <h3>{role.label}</h3>
              {role.stories.length ? (
                <div className="grid">
                  {role.stories.map((item) => (
                    <StoryTile
                      key={item.story.slug}
                      story={item.story}
                      kicker={role.label}
                      pinned={item.pinned}
                      priority={item.story.slug === leadSlug}
                    />
                  ))}
                </div>
              ) : (
                <GapCard
                  title={`No ${role.empty} story yet`}
                  body={`The archive does not have a ${role.empty} story that clears this page. Send one in and the newsroom will check it.`}
                />
              )}
            </section>
          ))}
        </div>

        <div className="wrap" id="states">
          <h2 className="side-title">By state</h2>
          <p className="lede">One story for each state the archive can match, including Washington, D.C. Gold marks a story. An open state is waiting for a tip.</p>
          <div className="fr-map-wrap">
            <UsMap
              highlighted={hub.covered.map((slot) => slot.state.code)}
              legend={[{ swatch: "#FFD36E", label: "Story on this page" }]}
              labels={false}
            />
          </div>
          <nav className="state-index" aria-label="States">
            {hub.slots.map((slot) => (
              <a key={slot.state.code} href={`#fr-${slot.state.slug}`} className={slot.story ? "has" : undefined}>
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
                  <GapCard
                    key={slot.state.code}
                    id={`fr-${slot.state.slug}`}
                    title={`Still open: ${slot.state.name}`}
                    body={`This spot is waiting for a rescue, a lifesaving moment, or an act of kindness by first responders in ${slot.state.name}.`}
                  />
                );
              }
              return (
                <StoryTile
                  key={slot.state.code}
                  id={`fr-${slot.state.slug}`}
                  story={story}
                  kicker={slot.state.name}
                  pinned={slot.pinned}
                  priority={story.slug === leadSlug}
                />
              );
            })}
          </div>
        </div>

        <div className="wrap">
          <section id="thanks">
            <h2 className="side-title">How to say thanks</h2>
            <p className="lede">
              Free ideas, with no petition and no donation form on this page. The links go to the organizations that
              already do the work.
            </p>
            <div className="help-list" style={{ marginTop: 16 }}>
              {THANK_YOU_LINKS.map((item) =>
                item.external ? (
                  <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">
                    <span>
                      {item.label}
                      <span className="from">{item.note}</span>
                    </span>
                  </a>
                ) : (
                  <a key={item.id} href={item.href}>
                    <span>
                      {item.label}
                      <span className="from">{item.note}</span>
                    </span>
                  </a>
                ),
              )}
            </div>
          </section>

          <section className="classroom-box" id="classroom">
            <h2>For classrooms</h2>
            <p className="teacher-note">
              A short note for a teacher to read with children about ages 6 to 12. This page is for adults. Leave
              politics out of the cards. Do not ask students for a full name, age, school, or email address.
            </p>
            <h3>Thank-you card</h3>
            <p>Print this and let the class fill in the blanks. A teacher can mail the cards to a local station.</p>
            <div className="fr-card">
              <p>Dear First Responder,</p>
              <p>Thank you for helping people in our town. I am glad you are there when someone needs help.</p>
              <p>One thing I want to thank you for is ________.</p>
              <p>From, ________</p>
            </div>
            <div className="print-actions">
              <PrintButton label="Print the thank-you card" />
            </div>
            <h3>Discussion questions</h3>
            <ol>
              {CLASSROOM_QUESTIONS.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
            <p>
              More stories a teacher can read aloud are in the <Link href="/kids">Kids section</Link>
              {" · "}
              <Link href="/kids/print">Story of the Day</Link>
              {readAloud.length ? <> On this page, a teacher can also read: {readAloudStories(readAloud)}.</> : null}
            </p>
          </section>

          <section id="share">
            <h2 className="side-title">Share a thank-you</h2>
            <p className="lede">{shareText}</p>
            <div style={{ marginTop: 14 }}>
              <ShareButtons title={shareText} path={FIRST_RESPONDERS_DAY_PATH} />
            </div>
          </section>
        </div>
      </div>
      <EmailSignup id="first-responders-email" />
    </>
  );
}
