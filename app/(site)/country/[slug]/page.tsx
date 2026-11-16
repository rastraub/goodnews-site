import type { Metadata } from "next";
import { CountryBrowse, countryPageMetadata } from "./browse";
import { COUNTRIES } from "@/lib/countries";
import { getByCountry } from "@/lib/stories";

type Props = { params: Promise<{ slug: string }> };

/**
 * Countries with no stories still render on request. Prebuilding every empty
 * hub was filling the deploy disk. dynamicParams stays on so those URLs work.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return COUNTRIES.filter((country) => getByCountry(country.code).length > 0).map((country) => ({
    slug: country.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return countryPageMetadata(slug, 1);
}

export default async function CountryPage({ params }: Props) {
  const { slug } = await params;
  return <CountryBrowse slug={slug} page={1} />;
}
