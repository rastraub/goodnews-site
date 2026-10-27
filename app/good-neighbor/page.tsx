import type { Metadata } from "next";
import { GoodNeighborView } from "@/components/good-neighbor-view";
import { editionMonth } from "@/lib/good-neighbor";
import { fileCountsForBallot, getBallot } from "@/lib/good-neighbor-data";
import { publicCounts } from "@/lib/good-neighbor-store";
import { listingMeta } from "@/lib/seo";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const ballot = getBallot(editionMonth());
  if (!ballot) {
    return listingMeta({
      title: "Good Neighbor",
      description: "A monthly reader vote for a neighbor who did something kind.",
      base: "/good-neighbor",
      page: 1,
      total: 1,
    });
  }
  const lead = ballot.nominees[0];
  return listingMeta({
    title: ballot.title,
    description: ballot.description,
    base: "/good-neighbor",
    page: 1,
    total: 1,
    image: lead ? { url: lead.image, alt: lead.imageAlt } : undefined,
  });
}

export default function GoodNeighborPage() {
  const ballot = getBallot(editionMonth());
  if (!ballot) {
    return (
      <div className="page-block">
        <div className="wrap page-hero">
          <p className="kicker">Reader vote</p>
          <h1>Good Neighbor.</h1>
          <p className="lede">This month does not have neighbor stories for a ballot yet.</p>
        </div>
      </div>
    );
  }
  const counts = publicCounts(
    fileCountsForBallot(ballot.month),
    ballot.nominees.map((nominee) => nominee.slug),
  );
  return <GoodNeighborView ballot={ballot} counts={counts} />;
}
