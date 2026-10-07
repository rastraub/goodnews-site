"use client";

import { useState } from "react";
import { StoryCard } from "./story-card";
import type { StoryCardModel } from "@/lib/present";
import { CATEGORIES } from "@/lib/categories";

const TABS = [{ slug: "all", label: "All" }, ...CATEGORIES.map((category) => ({ slug: category.slug, label: category.label }))];

export function HomeLatest({ stories, heroSlug }: { stories: StoryCardModel[]; heroSlug?: string }) {
  const [tab, setTab] = useState("all");
  const visible =
    tab === "all" ? stories.filter((story) => story.slug !== heroSlug) : stories.filter((story) => story.category === tab);

  return (
    <section className="latest">
      <div className="wrap">
        <div className="shead">
          <div>
            <h2>More good news</h2>
            <p>Every story links to its original source. No clickbait, no spin.</p>
          </div>
          <div className="tabs" role="tablist" aria-label="Filter stories">
            {TABS.map((item) => (
              <button
                key={item.slug}
                type="button"
                role="tab"
                aria-selected={tab === item.slug}
                className={tab === item.slug ? "on" : undefined}
                onClick={() => setTab(item.slug)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {visible.length ? (
          <div className="grid">
            {visible.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </div>
        ) : (
          <p className="empty-note">Nothing in this category yet. The next good story is on its way.</p>
        )}
        <div className="share-row">
          <a className="btn btn-outline" href="/stories">
            See all of today&apos;s good news
            <svg className="ico" aria-hidden="true">
              <use href="#i-arrow" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
