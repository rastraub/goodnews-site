import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { getHubIndex, hubsToPrerender, MIN_CITY_INDEX_STORIES } from "@/lib/hubs";

type Props = { params: Promise<{ slug: string; city: string }> };

/**
 * One-story city pages stay available on request. Only cities with enough
 * stories to be indexable are prebuilt, which keeps those URLs working
 * without writing a static file for every single-story place.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return hubsToPrerender(
    getHubIndex().cities.filter((hub) => hub.stateSlug && hub.count >= MIN_CITY_INDEX_STORIES),
  ).map((hub) => ({
    slug: hub.params.slug,
    city: hub.params.city,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city } = await params;
  return hubMetadata(`/state/${slug}/city/${city}`, 1);
}

export default async function StateCityPage({ params }: Props) {
  const { slug, city } = await params;
  return <HubBrowse path={`/state/${slug}/city/${city}`} page={1} />;
}
