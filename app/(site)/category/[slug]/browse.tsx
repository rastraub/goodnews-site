import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { getCategory } from "@/lib/categories";
import { getHubIndex } from "@/lib/hubs";

type Category = NonNullable<ReturnType<typeof getCategory>>;
import { getCountry } from "@/lib/countries";
import { pageCount, pageSlice } from "@/lib/paging";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { getByCategory } from "@/lib/stories";
import { getStateByCode } from "@/lib/states";

function categoryDescription(description: string) {
  return `${description} Verified good news, each story linked to its original source.`;
}

export function categoryPageMetadata(slug: string, page: number): Metadata {
  const category = getCategory(slug);
  if (!category) return {};
  const stories = getByCategory(category.slug);
  if (page > pageCount(stories.length)) return {};
  const image = stories[0];
  return listingMeta({
    title: `${category.label} good news`,
    description: categoryDescription(category.description),
    base: `/category/${category.slug}`,
    page,
    total: stories.length,
    feedPath: `/category/${category.slug}/rss.xml`,
    image: image ? openGraphImage(image) : undefined,
  });
}

function CategoryBody({ category, page }: { category: Category; page: number }) {
  const stories = getByCategory(category.slug);
  const description = categoryDescription(category.description);
  const path = page <= 1 ? `/category/${category.slug}` : `/category/${category.slug}/page/${page}`;
  const states = new Map<string, { slug: string; name: string }>();
  const countries = new Map<string, { slug: string; name: string }>();
  for (const story of stories) {
    const state = getStateByCode(story.state);
    if (state && !states.has(state.code)) states.set(state.code, { slug: state.slug, name: state.name });
    if (story.country !== "US") {
      const country = getCountry(story.country);
      if (country && !countries.has(country.code)) {
        countries.set(country.code, { slug: country.slug, name: country.name });
      }
    }
  }
  const stateLinks = [...states.values()].sort((a, b) => a.name.localeCompare(b.name));
  const countryLinks = [...countries.values()].sort((a, b) => a.name.localeCompare(b.name));
  const placeHubs = getHubIndex().stateCategories.filter((hub) => hub.categorySlug === category.slug);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: `${category.label} good news`,
          description,
          path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: category.label, path: `/category/${category.slug}` },
          ],
          stories: pageSlice(stories, page),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>{category.label}</span>
        </p>
        <p className="kicker">{category.label}</p>
        <h1>{category.label} good news</h1>
        <p className="lede">{description}</p>
        {stateLinks.length ? (
          <>
            <h2 className="side-title">Browse by state</h2>
            <p className="link-pills">
              {stateLinks.map((state) => (
                <Link key={state.slug} href={`/state/${state.slug}`}>
                  {state.name}
                </Link>
              ))}
            </p>
          </>
        ) : null}
        {placeHubs.length ? (
          <>
            <h2 className="side-title">{category.label} by state</h2>
            <p className="link-pills">
              {placeHubs.map((hub) => (
                <Link key={hub.path} href={hub.path}>
                  {hub.linkLabel}
                </Link>
              ))}
            </p>
          </>
        ) : null}
        {countryLinks.length ? (
          <>
            <h2 className="side-title">Browse by country</h2>
            <p className="link-pills">
              {countryLinks.map((country) => (
                <Link key={country.slug} href={`/country/${country.slug}`}>
                  {country.name}
                </Link>
              ))}
            </p>
          </>
        ) : null}
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {stories.length ? (
          <StoryGrid stories={stories} page={page} base={`/category/${category.slug}`} />
        ) : (
          <div className="empty">
            <h2>Nothing here yet.</h2>
            <p>When a story in this category is approved, it will land on this page.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryBrowse({ slug, page }: { slug: string; page: number }) {
  const category = getCategory(slug);
  if (!category) notFound();
  const total = getByCategory(category.slug).length;
  if (page > pageCount(total)) notFound();
  return <CategoryBody category={category} page={page} />;
}
