import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { COUNTRIES, REGIONS, countriesInRegion } from "@/lib/countries";
import { STORY_PAGE_SIZE } from "@/lib/paging";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { countryCounts, getWorldStories } from "@/lib/stories";

const TITLE = "Good news around the world";
const DESCRIPTION =
  "Verified, uplifting stories from countries outside the United States. Every story is checked and linked to its original source.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates("/world", "/world/rss.xml"),
};

export default function WorldPage() {
  const stories = getWorldStories();
  const latest = stories.slice(0, STORY_PAGE_SIZE);
  const counts = new Map(countryCounts().map((item) => [item.code, item.count]));

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path: "/world",
          crumbs: [
            { name: "Today", path: "/" },
            { name: "World", path: "/world" },
          ],
          stories: latest,
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>World</span>
        </p>
        <p className="kicker">World</p>
        <h1>Good news from around the world.</h1>
        <p className="lede">
          {stories.length
            ? `${stories.length} verified ${stories.length === 1 ? "story" : "stories"} from outside the United States, each one checked and linked to the original report. The United States stays on the local pages.`
            : "The world edition is open. Stories from outside the United States will land here once they are checked. Local stories stay on the state pages."}
        </p>
        <p className="link-pills">
          <Link href="/world/rss.xml">World RSS</Link>
          <Link href="/local">Good news from the states</Link>
          <Link href="/stories">All stories</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {latest.length ? (
          <>
            <div className="shead">
              <div>
                <h2>Latest from outside the United States</h2>
                <p>
                  Newest first. Open a country for everything published there.
                  {stories.length > latest.length ? ` Showing the newest ${latest.length}.` : ""}
                </p>
              </div>
            </div>
            <StoryGrid stories={latest} page={1} base="/world" />
          </>
        ) : (
          <div className="empty">
            <h2>The world desk is open.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              No story from outside the United States is up yet. The country index below is ready for the first one.
            </p>
          </div>
        )}
        <div className="shead" style={{ marginTop: 56 }}>
          <div>
            <h2>Every country</h2>
            <p>
              {COUNTRIES.length} places, grouped by region. A gold count means a story is up. The United States is here too, and its states live on{" "}
              <Link href="/local">Local</Link>.
            </p>
          </div>
        </div>
        {REGIONS.map((region) => (
          <section key={region.id} className="region-block" aria-labelledby={`region-${region.id}`}>
            <h2 className="side-title" id={`region-${region.id}`}>
              {region.label}
            </h2>
            <div className="state-index">
              {countriesInRegion(region.id).map((country) => {
                const count = counts.get(country.code) ?? 0;
                return (
                  <Link key={country.code} href={`/country/${country.slug}`} className={count ? "has" : undefined}>
                    <span>{country.name}</span>
                    {count ? <span className="count">{count}</span> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
