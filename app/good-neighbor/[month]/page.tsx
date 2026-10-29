import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoodNeighborView } from "@/components/good-neighbor-view";
import { ballotMonths, fileCountsForBallot, getBallot } from "@/lib/good-neighbor-data";
import { publicCounts } from "@/lib/good-neighbor-store";
import { listingMeta } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return ballotMonths().map((month) => ({ month }));
}

type Props = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  const ballot = getBallot(month);
  if (!ballot) return {};
  const lead = ballot.nominees[0];
  return listingMeta({
    title: ballot.title,
    description: ballot.description,
    base: ballot.canonicalPath,
    page: 1,
    total: 1,
    image: lead ? { url: lead.image, alt: lead.imageAlt } : undefined,
  });
}

export default async function GoodNeighborMonthPage({ params }: Props) {
  const { month } = await params;
  const ballot = getBallot(month);
  if (!ballot) notFound();
  const counts = publicCounts(
    fileCountsForBallot(ballot.month),
    ballot.nominees.map((nominee) => nominee.slug),
  );
  return <GoodNeighborView ballot={ballot} counts={counts} />;
}
