"use client";

import Link from "next/link";
import { useState } from "react";

export type SourceStoryLink = {
  slug: string;
  title: string;
  dateLabel: string;
};

export type SourcePlaceLink = {
  label: string;
  href: string;
};

export type SourceListItem = {
  slug: string;
  name: string;
  domain: string;
  homepage: string;
  count: number;
  hasPage: boolean;
  places: SourcePlaceLink[];
  stateCodes: string[];
  outsideUs: boolean;
  aliases: string[];
  stories: SourceStoryLink[];
};

export type SourceFilter = {
  id: string;
  label: string;
  count: number;
};

function storyLabel(count: number): string {
  return count === 1 ? "1 story" : `${count} stories`;
}

function aliasLine(aliases: string[]): string {
  if (aliases.length === 0) return "";
  if (aliases.length === 1) return aliases[0];
  if (aliases.length === 2) return `${aliases[0]} and ${aliases[1]}`;
  return `${aliases.slice(0, -1).join(", ")}, and ${aliases[aliases.length - 1]}`;
}

export function SourcesBrowser({ outlets, filters }: { outlets: SourceListItem[]; filters: SourceFilter[] }) {
  const [filter, setFilter] = useState("all");
  const shown =
    filter === "all"
      ? outlets
      : filter === "world"
        ? outlets.filter((outlet) => outlet.outsideUs)
        : outlets.filter((outlet) => outlet.stateCodes.includes(filter));

  return (
    <>
      <div className="source-filters">
        <label htmlFor="source-state">Place</label>
        <select id="source-state" value={filter} onChange={(event) => setFilter(event.target.value)}>
          {filters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.count})
            </option>
          ))}
        </select>
        <p className="count-note" aria-live="polite">
          {shown.length === 1 ? "1 newsroom" : `${shown.length} newsrooms`} · sorted by stories credited
        </p>
      </div>
      {shown.length ? (
        <div className="source-list">
          {shown.map((outlet) => {
            const also = aliasLine(outlet.aliases);
            return (
              <article className="source-card" id={outlet.slug} key={outlet.slug}>
                <div className="source-card-top">
                  <div>
                    <h2>
                      {outlet.hasPage ? <Link href={`/sources/${outlet.slug}`}>{outlet.name}</Link> : outlet.name}
                    </h2>
                    <p className="source-meta">
                      <span className="count">{storyLabel(outlet.count)}</span>
                      {outlet.places.map((place) => (
                        <Link key={place.href} href={place.href}>
                          {place.label}
                        </Link>
                      ))}
                    </p>
                    {also ? <p className="source-alias">Also credited as {also}.</p> : null}
                  </div>
                  <a href={outlet.homepage} target="_blank" rel="noopener noreferrer">
                    Visit {outlet.domain}
                    <span className="sr"> (opens in a new tab)</span>
                    <svg className="ico" aria-hidden="true">
                      <use href="#i-ext" />
                    </svg>
                  </a>
                </div>
                <ul className="source-stories">
                  {outlet.stories.map((story) => (
                    <li key={story.slug}>
                      <Link href={`/story/${story.slug}`}>{story.title}</Link>
                      <span className="source-when">{story.dateLabel}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <h2>No newsroom in this list yet.</h2>
          <p>Try another place. Every credited outlet is on the full list.</p>
        </div>
      )}
    </>
  );
}
