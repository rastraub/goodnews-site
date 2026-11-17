import type { Metadata } from "next";
import { KidPlaceBrowse, kidPlaceMetadata } from "../../place-browse";

type Props = { params: Promise<{ slug: string }> };

/** Classroom state pages render on request. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return kidPlaceMetadata("state", slug, 1);
}

export default async function KidsStatePage({ params }: Props) {
  const { slug } = await params;
  return <KidPlaceBrowse kind="state" slug={slug} page={1} />;
}
