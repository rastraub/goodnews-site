import type { Metadata } from "next";
import { CountryBrowse, countryPageMetadata } from "./browse";
import { COUNTRIES } from "@/lib/countries";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COUNTRIES.map((country) => ({ slug: country.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return countryPageMetadata(slug, 1);
}

export default async function CountryPage({ params }: Props) {
  const { slug } = await params;
  return <CountryBrowse slug={slug} page={1} />;
}
