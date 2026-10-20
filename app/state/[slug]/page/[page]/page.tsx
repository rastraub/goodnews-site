import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { StateBrowse, statePageMetadata } from "../../browse";
import { listingPageParams, parsePageParam } from "@/lib/paging";
import { getByState } from "@/lib/stories";
import { STATES } from "@/lib/states";

type Props = { params: Promise<{ slug: string; page: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return listingPageParams(STATES.map((state) => ({ slug: state.slug, total: getByState(state.code).length })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return statePageMetadata(slug, parsed);
}

export default async function StatePaged({ params }: Props) {
  const { slug, page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect(`/state/${slug}`);
  return <StateBrowse slug={slug} page={parsed} />;
}
