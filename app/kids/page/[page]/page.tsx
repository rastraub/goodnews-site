import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { archivePageParams, parsePageParam } from "@/lib/paging";
import { getKidStories } from "@/lib/kids";
import { KidsBrowse, kidsPageMetadata } from "../../browse";

type Props = { params: Promise<{ page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return archivePageParams(getKidStories().length);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return kidsPageMetadata(parsed);
}

export default async function KidsPaged({ params }: Props) {
  const { page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect("/kids");
  return <KidsBrowse page={parsed} />;
}
