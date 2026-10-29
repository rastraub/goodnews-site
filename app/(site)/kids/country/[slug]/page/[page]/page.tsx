import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCountryBySlug } from "@/lib/countries";
import { kidPlaces, kidStoriesInCountry } from "@/lib/kids";
import { listingPageParams, parsePageParam } from "@/lib/paging";
import { KidPlaceBrowse, kidPlaceMetadata } from "../../../../place-browse";

type Props = { params: Promise<{ slug: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listingPageParams(
    kidPlaces()
      .filter((place) => place.kind === "country")
      .map((place) => {
        const country = getCountryBySlug(place.slug);
        return { slug: place.slug, total: country ? kidStoriesInCountry(country.code).length : 0 };
      }),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return kidPlaceMetadata("country", slug, parsed);
}

export default async function KidsCountryPaged({ params }: Props) {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/kids/country/${slug}`);
  return <KidPlaceBrowse kind="country" slug={slug} page={parsed} />;
}
