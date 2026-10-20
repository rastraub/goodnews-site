import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { kidPlaces, kidStoriesInState } from "@/lib/kids";
import { listingPageParams, parsePageParam } from "@/lib/paging";
import { getStateBySlug } from "@/lib/states";
import { KidPlaceBrowse, kidPlaceMetadata } from "../../../../place-browse";

type Props = { params: Promise<{ slug: string; page: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return listingPageParams(
    kidPlaces()
      .filter((place) => place.kind === "state")
      .map((place) => {
        const state = getStateBySlug(place.slug);
        return { slug: place.slug, total: state ? kidStoriesInState(state.code).length : 0 };
      }),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return kidPlaceMetadata("state", slug, parsed);
}

export default async function KidsStatePaged({ params }: Props) {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/kids/state/${slug}`);
  return <KidPlaceBrowse kind="state" slug={slug} page={parsed} />;
}
