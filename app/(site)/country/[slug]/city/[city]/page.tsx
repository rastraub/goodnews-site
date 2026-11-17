import type { Metadata } from "next";
import { HubBrowse, hubMetadata } from "@/components/hub-browse";

type Props = { params: Promise<{ slug: string; city: string }> };

/** City pages render on request. The URL is unchanged. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, city } = await params;
  return hubMetadata(`/country/${slug}/city/${city}`, 1);
}

export default async function CountryCityPage({ params }: Props) {
  const { slug, city } = await params;
  return <HubBrowse path={`/country/${slug}/city/${city}`} page={1} />;
}
