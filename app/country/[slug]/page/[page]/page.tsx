import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CountryBrowse, countryPageMetadata } from "../../browse";
import { COUNTRIES } from "@/lib/countries";
import { listingPageParams, parsePageParam } from "@/lib/paging";
import { getByCountry } from "@/lib/stories";

type Props = { params: Promise<{ slug: string; page: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return listingPageParams(
    COUNTRIES.map((country) => ({ slug: country.slug, total: getByCountry(country.code).length })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return countryPageMetadata(slug, parsed);
}

export default async function CountryPaged({ params }: Props) {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/country/${slug}`);
  return <CountryBrowse slug={slug} page={parsed} />;
}
