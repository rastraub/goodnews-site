import type { Metadata } from "next";
import { CountryBrowse, countryPageMetadata } from "./browse";

type Props = { params: Promise<{ slug: string }> };

/** Country pages render on request, including countries that have stories. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return countryPageMetadata(slug, 1);
}

export default async function CountryPage({ params }: Props) {
  const { slug } = await params;
  return <CountryBrowse slug={slug} page={1} />;
}
