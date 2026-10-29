import type { Metadata } from "next";
import { kidPlaces } from "@/lib/kids";
import { KidPlaceBrowse, kidPlaceMetadata } from "../../place-browse";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return kidPlaces()
    .filter((place) => place.kind === "country")
    .map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return kidPlaceMetadata("country", slug, 1);
}

export default async function KidsCountryPage({ params }: Props) {
  const { slug } = await params;
  return <KidPlaceBrowse kind="country" slug={slug} page={1} />;
}
