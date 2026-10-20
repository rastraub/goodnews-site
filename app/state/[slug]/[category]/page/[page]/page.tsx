import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { getHubIndex, hubPageParams } from "@/lib/hubs";
import { parsePageParam } from "@/lib/paging";

type Props = { params: Promise<{ slug: string; category: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return hubPageParams(getHubIndex().stateCategories).map(({ hub, page }) => ({
    slug: hub.params.slug,
    category: hub.params.category,
    page,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return hubMetadata(`/state/${slug}/${category}`, parsed);
}

export default async function StateCategoryPaged({ params }: Props) {
  const { slug, category, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/state/${slug}/${category}`);
  return <HubBrowse path={`/state/${slug}/${category}`} page={parsed} />;
}
