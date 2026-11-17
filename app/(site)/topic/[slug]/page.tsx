import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";

type Props = { params: Promise<{ slug: string }> };

/** Tag pages render on request. The URL is unchanged. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return hubMetadata(`/topic/${slug}`, 1);
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  return <HubBrowse path={`/topic/${slug}`} page={1} />;
}
