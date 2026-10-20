import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { getHubIndex, hubPageParams } from "@/lib/hubs";
import { parsePageParam } from "@/lib/paging";

type Props = { params: Promise<{ slug: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return hubPageParams(getHubIndex().topics).map(({ hub, page }) => ({
    slug: hub.params.slug,
    page,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return hubMetadata(`/topic/${slug}`, parsed);
}

export default async function TopicPaged({ params }: Props) {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/topic/${slug}`);
  return <HubBrowse path={`/topic/${slug}`} page={parsed} />;
}