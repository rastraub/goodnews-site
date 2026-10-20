import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { getCountryBySlug } from "@/lib/countries";
import { kidStoriesInCountry, kidStoriesInState } from "@/lib/kids";
import { pageCount, pageSlice } from "@/lib/paging";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { getStateBySlug } from "@/lib/states";
import type { Story } from "@/lib/stories";

export type KidPlaceKind = "state" | "country";

function resolvePlace(kind: KidPlaceKind, slug: string): { name: string; path: string; stories: Story[] } | undefined {
  if (kind === "state") {
    const state = getStateBySlug(slug);
    if (!state) return undefined;
    return {
      name: state.name,
      path: `/kids/state/${state.slug}`,
      stories: kidStoriesInState(state.code),
    };
  }
  const country = getCountryBySlug(slug);
  if (!country || country.code === "US") return undefined;
  return {
    name: country.name,
    path: `/kids/country/${country.slug}`,
    stories: kidStoriesInCountry(country.code),
  };
}

export function kidPlaceMetadata(kind: KidPlaceKind, slug: string, page: number): Metadata {
  const place = resolvePlace(kind, slug);
  if (!place || !place.stories.length || page > pageCount(place.stories.length)) return {};
  const image = place.stories[0];
  return listingMeta({
    title: `Good news for kids in ${place.name}`,
    description: `Classroom stories from ${place.name} for teachers to read aloud, with a short summary and discussion questions.`,
    base: place.path,
    page,
    total: place.stories.length,
    image: image ? { url: image.image, alt: image.imageAlt } : undefined,
  });
}

export function KidPlaceBrowse({ kind, slug, page }: { kind: KidPlaceKind; slug: string; page: number }) {
  const place = resolvePlace(kind, slug);
  if (!place || !place.stories.length || page > pageCount(place.stories.length)) notFound();
  const path = page <= 1 ? place.path : `${place.path}/page/${page}`;
  const title = `Good news for kids in ${place.name}`;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: title,
          description: `Classroom stories from ${place.name}.`,
          path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "For classrooms", path: "/kids" },
            { name: place.name, path: place.path },
          ],
          stories: pageSlice(place.stories, page),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/kids">For classrooms</Link>
          <span aria-hidden="true">/</span>
          <span>{place.name}</span>
        </p>
        <p className="kicker">For teachers</p>
        <h1>{title}</h1>
        <p className="lede">
          {place.stories.length} classroom {place.stories.length === 1 ? "story" : "stories"} from {place.name}. For an adult to read with a class.
        </p>
        <p className="link-pills">
          <Link href="/kids/print">Print the story of the day</Link>
          <Link href="/kids">All classroom stories</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <StoryGrid stories={place.stories} page={page} base={place.path} />
      </div>
    </div>
  );
}
