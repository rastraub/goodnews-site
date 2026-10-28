"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StoryCard } from "@/components/story-card";
import { renderUsMap } from "@/components/us-map";
import { heroesPath, isResponderType, RESPONDER_TYPES } from "@/lib/heroes";
import { STORY_PAGE_SIZE } from "@/lib/paging";
import type { StoryCardModel } from "@/lib/present";
import { getStateByCode, stateName, STATES } from "@/lib/states";

export type HeroListing = {
  card: StoryCardModel;
  country: string;
  states: string[];
  types: string[];
};

function matches(story: HeroListing, type: string, state: string) {
  if (type && !story.types.includes(type)) return false;
  if (state && !story.states.includes(state)) return false;
  return true;
}

export function HeroesBrowse({ stories }: { stories: HeroListing[] }) {
  const search = useSearchParams();
  const router = useRouter();
  const typeParam = search.get("type") ?? "";
  const stateParam = (search.get("state") ?? "").toUpperCase();
  const type = isResponderType(typeParam) ? typeParam : "";
  const state = getStateByCode(stateParam) ? stateParam : "";
  const [extra, setExtra] = useState(0);
  const filterKey = `${type}:${state}`;
  const [seenKey, setSeenKey] = useState(filterKey);
  if (seenKey !== filterKey) {
    setSeenKey(filterKey);
    setExtra(0);
  }

  const filtered = stories.filter((story) => matches(story, type, state));
  const visibleCount = STORY_PAGE_SIZE + extra;
  const visible = filtered.slice(0, visibleCount);
  const typeLabel = RESPONDER_TYPES.find((item) => item.slug === type)?.label;

  const highlighted: string[] = [];
  const stateCounts = new Map<string, number>();
  const seenCodes = new Set<string>();
  for (const story of stories) {
    if (type && !story.types.includes(type)) continue;
    for (const code of story.states) {
      stateCounts.set(code, (stateCounts.get(code) ?? 0) + 1);
      const lower = code.toLowerCase();
      if (!seenCodes.has(lower)) {
        seenCodes.add(lower);
        highlighted.push(lower);
      }
    }
  }

  const stateEntries = STATES.flatMap((item) => {
    const count = stateCounts.get(item.code) ?? 0;
    if (!count && item.code !== state) return [];
    return [{ ...item, count }];
  });

  let markup = renderUsMap(state ? state.toLowerCase() : undefined, highlighted);
  for (const item of STATES) {
    markup = markup.replaceAll(`href="/state/${item.slug}"`, `href="${heroesPath(type, item.code)}"`);
  }

  function onMapClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const link = (event.target as Element).closest("a.state-link");
    if (!(link instanceof HTMLAnchorElement)) return;
    event.preventDefault();
    const code = (link.dataset.state ?? "").toUpperCase();
    if (!getStateByCode(code)) return;
    router.push(heroesPath(type, state === code ? "" : code), { scroll: false });
  }

  const place = state ? stateName(state) : "the United States";
  const who = typeLabel ?? "First responders";

  return (
    <>
      <div className="wrap">
        <h2 className="side-title">Filter by responder</h2>
        <div className="tabs" role="group" aria-label="Responder type">
          <Link href={heroesPath("", state)} scroll={false} className={type ? undefined : "on"} aria-current={type ? undefined : "true"}>
            All
          </Link>
          {RESPONDER_TYPES.map((item) => (
            <Link
              key={item.slug}
              href={heroesPath(item.slug, state)}
              scroll={false}
              className={type === item.slug ? "on" : undefined}
              aria-current={type === item.slug ? "true" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <h2 className="side-title">Pick a state</h2>
        <p className="empty-note">Gold states have a story in this filter. Select one to read only that state.</p>
        <div className="heroes-map">
          <div className="map">
            <div
              className="map-canvas"
              onClick={onMapClick}
              dangerouslySetInnerHTML={{ __html: markup }}
            />
            <div className="map-legend">
              <span>
                <i style={{ background: "#FFD36E" }} />
                Has a story
              </span>
              {state ? (
                <span>
                  <i style={{ background: "#F3B23C" }} />
                  {stateName(state)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

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
              {who} in {place}. Each card links to the original report.
            </p>
          </div>
        </div>
        {visible.length ? (
          <div className="grid">
            {visible.map((story) => (
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
        {visible.length < filtered.length ? (
          <p style={{ marginTop: 28 }}>
            <button className="btn btn-outline" type="button" onClick={() => setExtra((count) => count + STORY_PAGE_SIZE)}>
              Show more stories
            </button>
          </p>
        ) : null}
      </div>
    </>
  );
}
