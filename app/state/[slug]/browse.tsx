import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { StateJump } from "@/components/local-explorer";
import { UsMap } from "@/components/us-map";
import { WorldSpotlight } from "@/components/world-spotlight";
import { CATEGORIES } from "@/lib/categories";
import { pageCount, pageSlice } from "@/lib/paging";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { getHubIndex } from "@/lib/hubs";
import { stateIndexLink } from "@/lib/good-news-index";
import { kidStoriesInState } from "@/lib/kids";
import { getByState, stateCounts } from "@/lib/stories";
import { getStateBySlug, neighborStates, type StateInfo } from "@/lib/states";

function stateDescription(name: string) {
  return `Good news from ${name}: verified, uplifting stories from cities and towns across the state. Every story is checked and linked to its original source.`;
}

function uniqueCities(stories: { city: string }[]) {
  const cities: string[] = [];
  for (const story of stories) {
    if (!cities.includes(story.city)) cities.push(story.city);
  }
  return cities;
}

function formatList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function statePageMetadata(slug: string, page: number): Metadata {
  const state = getStateBySlug(slug);
  if (!state) return {};
  const stories = getByState(state.code);
  if (page > pageCount(stories.length)) return {};
  const image = stories[0];
  return listingMeta({
    title: `Good news ${state.name}`,
    description: stateDescription(state.name),
    base: `/state/${state.slug}`,
    page,
    total: stories.length,
    feedPath: `/state/${state.slug}/rss.xml`,
    image: image ? openGraphImage(image) : undefined,
  });
}

function StateBody({ state, page }: { state: StateInfo; page: number }) {
  const stories = getByState(state.code);
  const highlighted = stateCounts().map((item) => item.code.toLowerCase());
  const cities = uniqueCities(stories).slice(0, 4);
  const categories = CATEGORIES.filter((category) => stories.some((story) => story.category === category.slug));
  const stateHubs = getHubIndex().byStateSlug.get(state.slug);
  const categoryHubs = new Map((stateHubs?.categories ?? []).map((hub) => [hub.categorySlug, hub]));
  const cityHubs = stateHubs?.cities ?? [];
  const neighbors = neighborStates(state.code);
  const indexLink = stateIndexLink(state);
  const description = stateDescription(state.name);
  const cityPhrase = cities.length ? `, including ${formatList(cities)}` : "";
  const path = page <= 1 ? `/state/${state.slug}` : `/state/${state.slug}/page/${page}`;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: `Good news ${state.name}`,
          description,
          path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Local", path: "/local" },
            { name: state.name, path: `/state/${state.slug}` },
          ],
          stories: pageSlice(stories, page),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/local">Local</Link>
          <span aria-hidden="true">/</span>
          <span>{state.name}</span>
        </p>
        <p className="kicker">Local</p>
        <h1>Good news from {state.name}.</h1>
        <p className="lede">
          {stories.length
            ? `Good news from ${state.name}${cityPhrase}. ${stories.length} verified ${stories.length === 1 ? "story" : "stories"}, each one checked and linked to the original report.`
            : `Good news from ${state.name} will land here once a story is checked and published. If you know one, send it in.`}
        </p>
        {indexLink ? (
          <p className="link-pills">
            <Link href={indexLink.href}>{indexLink.label}</Link>
          </p>
        ) : null}
        {categories.length ? (
          <p className="link-pills">
            {categories.map((category) => {
              const hub = categoryHubs.get(category.slug);
              return (
                <Link key={category.slug} href={hub?.path ?? `/category/${category.slug}`}>
                  {category.label}
                </Link>
              );
            })}
          </p>
        ) : null}
        {kidStoriesInState(state.code).length ? (
          <p className="link-pills">
            <Link href={`/kids/state/${state.slug}`}>Classroom stories from {state.name}</Link>
          </p>
        ) : null}
        {cityHubs.length ? (
          <>
            <h2 className="side-title">Cities</h2>
            <p className="link-pills">
              {cityHubs.map((hub) => (
                <Link key={hub.path} href={hub.path}>
                  {hub.crumbs[hub.crumbs.length - 1]?.name ?? hub.linkLabel}
                </Link>
              ))}
            </p>
          </>
        ) : null}
      </div>
      <div className="wrap state-layout" style={{ paddingTop: 24 }}>
        <div>
          {stories.length ? (
            <StoryGrid stories={stories} page={page} base={`/state/${state.slug}`} columns="1fr" />
          ) : (
            <div className="empty">
              <h2>{state.name} is due for some good news.</h2>
              <p style={{ margin: "8px 0 18px", color: "var(--ink2)" }}>
                Kindness is happening here. It just has not crossed our desk yet.
              </p>
              <Link className="btn btn-ink" href="/submit">
                Submit a {state.name} story
              </Link>
            </div>
          )}
          {neighbors.length ? (
            <div style={{ marginTop: 28 }}>
              <h2 className="side-title">Good news nearby</h2>
              <p className="link-pills">
                {neighbors.map((neighbor) => (
                  <Link key={neighbor.code} href={`/state/${neighbor.slug}`}>
                    {neighbor.name}
                  </Link>
                ))}
              </p>
            </div>
          ) : (
            <p style={{ marginTop: 22 }}>
              <Link className="more" href="/local">
                Good news from every state
                <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
              </Link>
            </p>
          )}
        </div>
        <aside className="state-side">
          <UsMap home={state.code.toLowerCase()} highlighted={highlighted} />
          <StateJump code={state.code} />
          <p style={{ marginTop: 14 }}>
            <Link className="more" href="/local">
              See all 50 states
              <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
            </Link>
          </p>
        </aside>
      </div>
      {page === 1 ? <WorldSpotlight /> : null}
    </div>
  );
}

export function StateBrowse({ slug, page }: { slug: string; page: number }) {
  const state = getStateBySlug(slug);
  if (!state) notFound();
  const total = getByState(state.code).length;
  if (page > pageCount(total)) notFound();
  return <StateBody state={state} page={page} />;
}
