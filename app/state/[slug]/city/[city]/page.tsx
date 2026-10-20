import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { getHubIndex, hubsToPrerender } from "@/lib/hubs";

type Props = { params: Promise<{ slug: string; city: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return hubsToPrerender(getHubIndex().cities.filter((hub) => hub.stateSlug)).map((hub) => ({
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
