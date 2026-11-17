import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";

type Props = { params: Promise<{ slug: string; category: string }> };

/** State topic pages render on request. The URL is unchanged. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category } = await params;
  return hubMetadata(`/state/${slug}/${category}`, 1);
}

export default async function StateCategoryPage({ params }: Props) {
  const { slug, category } = await params;
  return <HubBrowse path={`/state/${slug}/${category}`} page={1} />;
}
