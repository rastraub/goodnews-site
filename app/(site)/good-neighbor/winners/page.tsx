import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { WinnerBoard } from "@/components/good-neighbor-results";
import { badgeLabel, votingOpen } from "@/lib/good-neighbor";
import { editionDay } from "@/lib/world-pick";
import { ballotMonths, getBallot, winnerCards, winnersJsonLd } from "@/lib/good-neighbor-data";
import { votesEnabled } from "@/lib/good-neighbor-store";
import { pageAlternates } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Good Neighbor winners";
const DESCRIPTION = "Neighbors named Good Neighbor of the Month after the vote closes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: pageAlternates("/good-neighbor/winners"),
};

export default function GoodNeighborWinnersPage() {
  const cards = winnerCards();
  const enabled = votesEnabled();
  const today = editionDay();
  const closed = ballotMonths().filter((month) => !votingOpen(month, today));
  const ballots = enabled
    ? closed.flatMap((month) => {
        const ballot = getBallot(month);
        if (!ballot) return [];
        return [
          {
            month,
            label: badgeLabel(month, closed),
            href: ballot.canonicalPath,
            nominees: ballot.nominees.map((nominee) => ({
              slug: nominee.slug,
              title: nominee.title,
              dek: nominee.dek,
              place: nominee.place,
              image: nominee.image,
              imageAlt: nominee.imageAlt,
              imageTreatment: nominee.imageTreatment,
            })),
          },
        ];
      })
    : [];

  return (
    <div className="page-block">
      <JsonLd data={winnersJsonLd(cards)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/good-neighbor">Good Neighbor</Link>
          <span aria-hidden="true">/</span>
          <span>Winners</span>
        </p>
        <p className="kicker">Reader vote</p>
        <h1>Good Neighbors.</h1>
        <p className="lede">
          After the 25th, the neighbor with the most votes is Good Neighbor of that month. The badge stays on the story. Who voted is not published.
        </p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href="/good-neighbor">This month</Link>
        </p>
      </div>
      <div className="wrap gn-wrap">
        <WinnerBoard enabled={enabled} seed={cards} ballots={ballots} />
      </div>
    </div>
  );
}
