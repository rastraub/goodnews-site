import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { parsePageParam } from "@/lib/paging";

type Props = { params: Promise<{ slug: string; city: string; page: string }> };

/** Later city pages render on request. Page 1 lives at the city path. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return hubMetadata(`/state/${slug}/city/${city}`, parsed);
}

export default async function StateCityPaged({ params }: Props) {
  const { slug, city, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/state/${slug}/city/${city}`);
  return <HubBrowse path={`/state/${slug}/city/${city}`} page={parsed} />;
}
