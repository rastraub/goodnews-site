import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import {
  heroStateCodes,
  heroesPath,
  isHometownHero,
  isResponderType,
  responderTypesFor,
  RESPONDER_TYPES,
} from "@/lib/heroes";
import { pageCount, pageSlice } from "@/lib/paging";
import { toCard } from "@/lib/present";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { getStateByCode, stateName, STATES } from "@/lib/states";
import { siteConfig } from "@/site.config";
import { HeroesMap } from "./browse";

const TITLE = "Hometown Heroes";
const DESCRIPTION =
  "Rescues, medical saves, and kindness from firefighters, police officers, EMTs, paramedics, 911 dispatchers, and search-and-rescue teams. Each story is checked and linked to the original report.";

type Query = { type?: string | string[]; state?: string | string[]; page?: string | string[] };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function listings() {
  return getPublishedStories()
    .filter((story) => isHometownHero(story.tags))
    .map((story) => ({
      card: toCard(story),
      states: heroStateCodes(story),
      types: responderTypesFor(story.tags),
    }));
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }): Promise<Metadata> {
  const query = await searchParams;
  const type = first(query.type);
  const state = first(query.state).toUpperCase();
  const page = Number(first(query.page) || "1");
  const filtered = Boolean(type || state || page > 1);
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: pageAlternates("/heroes"),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HeroesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const typeRaw = first(query.type);
  const stateRaw = first(query.state).toUpperCase();
  const type = isResponderType(typeRaw) ? typeRaw : "";
  const state = getStateByCode(stateRaw) ? stateRaw : "";
  const requested = Number(first(query.page) || "1");
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;

  const stories = listings();
  const filtered = stories.filter((story) => {
    if (type && !story.types.includes(type)) return false;
    if (state && !story.states.includes(state)) return false;
    return true;
  });
  const pages = pageCount(filtered.length);
  if (page > pages) notFound();

  const highlighted: string[] = [];
  const seen = new Set<string>();
  const stateCounts = new Map<string, number>();
  for (const story of stories) {
    if (type && !story.types.includes(type)) continue;
    for (const code of story.states) {
      stateCounts.set(code, (stateCounts.get(code) ?? 0) + 1);
      const lower = code.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        highlighted.push(lower);
      }
    }
  }
  const stateEntries = STATES.flatMap((item) => {
    const count = stateCounts.get(item.code) ?? 0;
    if (!count && item.code !== state) return [];
    return [{ ...item, count }];
  });
  const typeLabel = RESPONDER_TYPES.find((item) => item.slug === type)?.label ?? "First responders";
  const place = state ? stateName(state) : "the United States";
  const slice = pageSlice(filtered, page);

  return (
    <>
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: heroesPath(type, state, page),
          crumbs: [
            { name: "Today", path: "/" },
            { name: TITLE, path: "/heroes" },
          ],
          stories: slice.map((story) => ({ slug: story.card.slug, title: story.card.title })),
        })}
      />
      <div className="page-block" style={{ paddingBottom: 0 }}>
        <div className="wrap page-hero">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <span>{TITLE}</span>
          </p>
          <p className="kicker">First responders</p>
          <h1>Hometown Heroes</h1>
          <p className="lede">{DESCRIPTION}</p>
          <p className="byline" style={{ marginTop: 14 }}>
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </p>
        </div>
        <div className="wrap">
          <h2 className="side-title">Filter by responder</h2>
          <div className="tabs" role="group" aria-label="Responder type">
            <Link href={heroesPath("", state)} scroll={false} className={type ? undefined : "on"} aria-current={type ? undefined : "page"}>
              All
            </Link>
            {RESPONDER_TYPES.map((item) => (
              <Link
                key={item.slug}
                href={heroesPath(item.slug, state)}
                scroll={false}
                className={type === item.slug ? "on" : undefined}
                aria-current={type === item.slug ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <h2 className="side-title">Pick a state</h2>
          <p className="empty-note">Gold states have a story in this filter. Select one to read only that state.</p>
          <HeroesMap highlighted={highlighted} selected={state} type={type} />

          <div className="state-index" style={{ marginTop: 18 }}>
            <Link href={heroesPath(type, "")} scroll={false} className={state ? undefined : "on has"}>
              <span>All states</span>
            </Link>
            {stateEntries.map((item) => (
              <Link
                key={item.code}
                href={heroesPath(type, state === item.code ? "" : item.code)}
                scroll={false}
                className={state === item.code ? "on has" : item.count ? "has" : undefined}
              >
                <span>{item.name}</span>
                {item.count ? <span className="count">{item.count}</span> : null}
              </Link>
            ))}
          </div>

          <div className="shead" style={{ marginTop: 48 }}>
            <div>
              <h2>
                {filtered.length} {filtered.length === 1 ? "story" : "stories"}
              </h2>
              <p>
                {typeLabel} in {place}. Each card links to the original report.
              </p>
            </div>
          </div>
          {slice.length ? (
            <div className="grid">
              {slice.map((story) => (
                <StoryCard key={story.card.slug} story={story.card} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>Nothing in this filter yet.</h2>
              <p>Try another responder type, or clear the state and read the full list.</p>
              <p style={{ marginTop: 16 }}>
                <Link className="btn btn-ink" href="/heroes">
                  Show every story
                </Link>
              </p>
            </div>
          )}
          {pages > 1 ? (
            <nav className="pager" aria-label="Pagination">
              {page > 1 ? (
                <Link href={heroesPath(type, state, page - 1)}>Previous</Link>
              ) : (
                <span className="muted">Previous</span>
              )}
              <span>
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={heroesPath(type, state, page + 1)}>Next</Link>
              ) : (
                <span className="muted">Next</span>
              )}
            </nav>
          ) : null}
        </div>
      </div>
      <EmailSignup id="heroes-email" />
    </>
  );
}
