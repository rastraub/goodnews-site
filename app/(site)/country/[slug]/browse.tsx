import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { countriesInRegion, getCountryBySlug, type CountryInfo } from "@/lib/countries";
import { countryIsIndexable, getHubIndex } from "@/lib/hubs";
import { kidStoriesInCountry } from "@/lib/kids";
import { pageCount, pageSlice, STORY_PAGE_SIZE } from "@/lib/paging";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { countryCounts, getByCountry } from "@/lib/stories";

function countryDescription(name: string) {
  return `Good news from ${name}: verified, uplifting stories checked against the original report and linked to that source.`;
}

export function countryPageMetadata(slug: string, page: number): Metadata {
  const country = getCountryBySlug(slug);
  if (!country) return {};
  const stories = getByCountry(country.code);
  const pages = pageCount(stories.length);
  if (page > pages) return {};
  const image = stories[0];
  const meta = listingMeta({
    title: `Good news ${country.name}`,
    description: countryDescription(country.name),
    base: `/country/${country.slug}`,
    page,
    total: stories.length,
    feedPath: `/country/${country.slug}/rss.xml`,
    image: image ? openGraphImage(image) : undefined,
  });
  if (!countryIsIndexable(country.code)) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

function CountryBody({ country, page }: { country: CountryInfo; page: number }) {
  const stories = getByCountry(country.code);
  const description = countryDescription(country.name);
  const path = page <= 1 ? `/country/${country.slug}` : `/country/${country.slug}/page/${page}`;
  const counts = new Map(countryCounts().map((item) => [item.code, item.count]));
  const siblings = countriesInRegion(country.region)
    .filter((item) => item.code !== country.code && (counts.get(item.code) ?? 0) > 0)
    .slice(0, 12);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: `Good news ${country.name}`,
          description,
          path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "World", path: "/world" },
            { name: country.name, path: `/country/${country.slug}` },
          ],
          stories: pageSlice(stories, page, STORY_PAGE_SIZE),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/world">World</Link>
          <span aria-hidden="true">/</span>
          <span>{country.name}</span>
        </p>
        <p className="kicker">World</p>
        <h1>Good news from {country.name}.</h1>
        <p className="lede">
          {stories.length
            ? `Good news from ${country.name}. ${stories.length} verified ${stories.length === 1 ? "story" : "stories"}, each one checked and linked to the original report.`
            : `Good news from ${country.name} will land here once a story is checked and published.`}
        </p>
        <p className="link-pills">
          <Link href={`/country/${country.slug}/rss.xml`}>RSS</Link>
          {country.code === "US" ? <Link href="/local">Browse by state</Link> : <Link href="/world">All countries</Link>}
          {country.code !== "US" && kidStoriesInCountry(country.code).length ? (
            <Link href={`/kids/country/${country.slug}`}>Classroom stories</Link>
          ) : null}
          {(getHubIndex().byCountrySlug.get(country.slug) ?? []).map((hub) => (
            <Link key={hub.path} href={hub.path}>
              {hub.crumbs[hub.crumbs.length - 1]?.name ?? hub.linkLabel}
            </Link>
          ))}
        </p>
      </div>
      <div className="wrap state-layout" style={{ paddingTop: 24 }}>
        <div>
          {stories.length ? (
            <StoryGrid stories={stories} page={page} base={`/country/${country.slug}`} />
          ) : (
            <div className="empty">
              <h2>{country.name} is due for some good news.</h2>
              <p style={{ margin: "8px 0 18px", color: "var(--ink2)" }}>
                Kindness is happening in {country.name}. It just has not crossed our desk yet.
              </p>
              <Link className="btn btn-ink" href="/contact">
                Tell us about a story from {country.name}
              </Link>
            </div>
          )}
          {siblings.length ? (
            <div style={{ marginTop: 28 }}>
              <h2 className="side-title">Good news in the same region</h2>
              <p className="link-pills">
                {siblings.map((item) => (
                  <Link key={item.code} href={`/country/${item.slug}`}>
                    {item.name}
                  </Link>
                ))}
              </p>
            </div>
          ) : (
            <p style={{ marginTop: 22 }}>
              <Link className="more" href="/world">
                Good news from every country
                <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
              </Link>
            </p>
          )}
        </div>
        <aside className="state-side">
          <div className="side-card">
            <h2>{country.name}</h2>
            <p>
              {country.code === "US"
                ? "Stories from the United States are listed here. The state map and the city-by-city index live on Local."
                : `This page collects every checked story from ${country.name}. The full country index is on World.`}
            </p>
            <p style={{ marginTop: 14 }}>
              <Link className="more" href={country.code === "US" ? "/local" : "/world"}>
                {country.code === "US" ? "See all 50 states" : "See every country"}
                <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CountryBrowse({ slug, page }: { slug: string; page: number }) {
  const country = getCountryBySlug(slug);
  if (!country) notFound();
  const total = getByCountry(country.code).length;
  if (page > pageCount(total)) notFound();
  return <CountryBody country={country} page={page} />;
}
