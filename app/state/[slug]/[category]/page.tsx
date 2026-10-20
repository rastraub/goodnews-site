import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { getHubIndex, hubsToPrerender } from "@/lib/hubs";

type Props = { params: Promise<{ slug: string; category: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return hubsToPrerender(getHubIndex().stateCategories).map((hub) => ({
    slug: hub.params.slug,
    category: hub.params.category,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category } = await params;
  return hubMetadata(`/state/${slug}/${category}`, 1);
}

export default async function StateCategoryPage({ params }: Props) {
  const { slug, category } = await params;
  return <HubBrowse path={`/state/${slug}/${category}`} page={1} />;
}
