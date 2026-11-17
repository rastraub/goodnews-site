import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { parsePageParam } from "@/lib/paging";
import { KidPlaceBrowse, kidPlaceMetadata } from "../../../../place-browse";

type Props = { params: Promise<{ slug: string; page: string }> };

/** Later classroom state pages render on request. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return kidPlaceMetadata("state", slug, parsed);
}

export default async function KidsStatePaged({ params }: Props) {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/kids/state/${slug}`);
  return <KidPlaceBrowse kind="state" slug={slug} page={parsed} />;
}
