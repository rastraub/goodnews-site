import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { getHubIndex, hubPageParams } from "@/lib/hubs";
import { parsePageParam } from "@/lib/paging";

type Props = { params: Promise<{ slug: string; city: string; page: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return hubPageParams(getHubIndex().cities.filter((hub) => hub.countrySlug)).map((hub) => ({
    slug: hub.params.slug,
    city: hub.params.city,
    page: "2",
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return hubMetadata(`/country/${slug}/city/${city}`, parsed);
}

export default async function CountryCityPaged({ params }: Props) {
  const { slug, city, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/country/${slug}/city/${city}`);
  return <HubBrowse path={`/country/${slug}/city/${city}`} page={parsed} />;
}
