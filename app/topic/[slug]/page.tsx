import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";
import { getHubIndex, hubsToPrerender } from "@/lib/hubs";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return hubsToPrerender(getHubIndex().topics).map((hub) => ({ slug: hub.params.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return hubMetadata(`/topic/${slug}`, 1);
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  return <HubBrowse path={`/topic/${slug}`} page={1} />;
}
