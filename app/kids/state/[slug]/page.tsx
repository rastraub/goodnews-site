import type { Metadata } from "next";
import { kidPlaces } from "@/lib/kids";
import { KidPlaceBrowse, kidPlaceMetadata } from "../../place-browse";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return kidPlaces()
    .filter((place) => place.kind === "state")
    .map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return kidPlaceMetadata("state", slug, 1);
}

export default async function KidsStatePage({ params }: Props) {
  const { slug } = await params;
  return <KidPlaceBrowse kind="state" slug={slug} page={1} />;
}
