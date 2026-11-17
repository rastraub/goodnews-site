import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CountryBrowse, countryPageMetadata } from "../../browse";
import { parsePageParam } from "@/lib/paging";

type Props = { params: Promise<{ slug: string; page: string }> };

/** Later country pages render on request. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
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
