import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { UsMap } from "@/components/us-map";
import { RESPONDER_TYPES, heroesHref, isFirstResponderStory, responderTypeOf } from "@/lib/first-responders";
import { toCard } from "@/lib/present";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { getStateByCode, STATES } from "@/lib/states";
import { siteConfig } from "@/site.config";

const TITLE = "Hometown Heroes";
const DESCRIPTION =
  "Verified good news about firefighters, police officers, EMTs, paramedics, 911 dispatchers, and search-and-rescue crews. Each story links to the newsroom that reported it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates("/heroes"),
};

type Props = { searchParams: Promise<{ type?: string; state?: string }> };

export default async function HeroesPage({ searchParams }: Props) {
  const query = await searchParams;
  const type = RESPONDER_TYPES.find((item) => item.slug === query.type)?.slug;
  const state = getStateByCode(query.state);
  const heroes = getPublishedStories().filter((story) => isFirstResponderStory(story));
  const typed = type ? heroes.filter((story) => responderTypeOf(story) === type) : heroes;
  const visible = state
    ? typed.filter(
        (story) => story.country === "US" && (story.state === state.code || story.alsoStates.includes(state.code)),
      )
    : typed;
  const counts = new Map<string, number>();
  for (const story of typed) {
    if (story.country !== "US" || !story.state) continue;
    counts.set(story.state, (counts.get(story.state) ?? 0) + 1);
    for (const extra of story.alsoStates) {
      if (extra !== story.state) counts.set(extra, (counts.get(extra) ?? 0) + 1);
    }
  }
  const highlighted = [...counts.keys()];
  const typeLabel = RESPONDER_TYPES.find((item) => item.slug === type)?.label;

  return (
    <>
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/heroes",
          crumbs: [
            { name: "Today", path: "/" },
            { name: TITLE, path: "/heroes" },
          ],
          stories: visible,
        })}
      />
      <section className="page-block" style={{ paddingBottom: 12 }}>
        <div className="wrap page-hero">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>{TITLE}</span>
          </p>
          <p className="kicker">First responders</p>
          <h1>{TITLE}</h1>
          <p className="lede">{DESCRIPTION}</p>
          <p className="byline" style={{ marginTop: 18 }}>
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </p>
          <div className="tabs" role="tablist" aria-label="Filter by responder" style={{ marginTop: 28 }}>
            <Link href={heroesHref({ state: state?.code })} className={type ? undefined : "on"} aria-current={type ? undefined : "page"}>
              All
            </Link>
            {RESPONDER_TYPES.map((item) => (
              <Link
                key={item.slug}
                href={heroesHref({ type: item.slug, state: state?.code })}
                className={type === item.slug ? "on" : undefined}
                aria-current={type === item.slug ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="local" style={{ paddingTop: 12 }}>
        <div className="wrap">
          <div className="local-card">
            <div className="local-copy">
              <span className="badge-new">Across the country</span>
              <h2>{state ? state.name : "Pick a state"}</h2>
              <p>
                {state
                  ? `${visible.length} ${visible.length === 1 ? "story" : "stories"} from ${state.name}${typeLabel ? `, filtered to ${typeLabel}` : ""}.`
                  : typed.length
                    ? "Gold marks a state with a story in this filter. Choose one to read closer to home."
                    : "No state has a story in this filter yet."}
              </p>
              {state ? (
                <p style={{ marginTop: 16 }}>
                  <Link className="more" href={heroesHref({ type })}>
                    All states
                    <svg className="ico" aria-hidden="true">
                      <use href="#i-arrow" />
                    </svg>
                  </Link>
                </p>
              ) : null}
            </div>
            <UsMap
              highlighted={highlighted}
              home={state?.code}
              legend={{ highlighted: "Has a story", selected: state ? "Selected" : undefined }}
            />
          </div>
          <div className="state-index" style={{ marginTop: 28 }}>
            {STATES.map((item) => {
              const count = counts.get(item.code) ?? 0;
              const selected = state?.code === item.code;
              if (!count) {
                return (
                  <span key={item.code} style={{ opacity: 0.55 }}>
                    <span>{item.name}</span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.code}
                  href={heroesHref({ type, state: selected ? undefined : item.code })}
                  className="has"
                  aria-current={selected ? "page" : undefined}
                >
                  <span>{item.name}</span>
                  <span className="count">{count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="page-block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="shead">
            <div>
              <h2>{typeLabel ? typeLabel : "Latest stories"}</h2>
              <p>Rescues, medical saves, and kindness from people who show up when someone needs help.</p>
            </div>
          </div>
          {visible.length ? (
            <div className="grid">
              {visible.map((story) => (
                <StoryCard key={story.slug} story={toCard(story)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>Nothing in this filter yet</h2>
              <p>The next verified story is on its way. Try another responder, or read every state.</p>
              <p style={{ marginTop: 16 }}>
                <Link className="more" href="/heroes">
                  Show every Hometown Heroes story
                  <svg className="ico" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
      <EmailSignup id="heroes-signup" />
    </>
  );
}
