import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { StoriesBrowse, storiesPageMetadata } from "../../browse";
import { archivePageParams, pageCount, parsePageParam } from "@/lib/paging";
import { getPublishedStories } from "@/lib/stories";

type Props = { params: Promise<{ page: string }> };

export const dynamicParams = true;

export function generateStaticParams() {
  return archivePageParams(getPublishedStories().length);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed || parsed < 2) return {};
  return storiesPageMetadata(parsed);
}

export default async function StoriesPaged({ params }: Props) {
  const { page } = await params;
  const parsed = parsePageParam(page);
  if (!parsed) notFound();
  if (parsed === 1) redirect("/stories");
  if (parsed > pageCount(getPublishedStories().length)) notFound();
  return <StoriesBrowse page={parsed} />;
}
