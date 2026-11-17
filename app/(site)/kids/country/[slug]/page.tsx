import type { Metadata } from "next";
import { KidPlaceBrowse, kidPlaceMetadata } from "../../place-browse";

type Props = { params: Promise<{ slug: string }> };

/** Classroom country pages render on request. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return kidPlaceMetadata("country", slug, 1);
}

export default async function KidsCountryPage({ params }: Props) {
  const { slug } = await params;
  return <KidPlaceBrowse kind="country" slug={slug} page={1} />;
}
