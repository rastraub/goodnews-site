import Link from "next/link";
import { GoodNeighborBallot } from "@/components/good-neighbor-ballot";
import { JsonLd } from "@/components/json-ld";
import { ballotJsonLd, ballotMonths, type Ballot } from "@/lib/good-neighbor-data";
import { editionMonth, monthLabel } from "@/lib/good-neighbor";
import { siteConfig } from "@/site.config";

export function GoodNeighborView({ ballot, counts }: { ballot: Ballot; counts: Record<string, number> }) {
  const months = ballotMonths();
  const current = editionMonth();
  return (
    <div className="page-block">
      <JsonLd data={ballotJsonLd(ballot)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          {ballot.canonicalPath === "/good-neighbor" ? (
            <span>Good Neighbor</span>
          ) : (
            <Link href="/good-neighbor">Good Neighbor</Link>
          )}
          {ballot.canonicalPath === "/good-neighbor" ? null : (
            <>
              <span aria-hidden="true">/</span>
              <span>{ballot.monthLabel}</span>
            </>
          )}
        </p>
        <p className="kicker">Reader vote</p>
        <h1>Good Neighbor of {ballot.monthName}.</h1>
        <p className="lede">{ballot.lede}</p>
        <p className="lede">{ballot.note}</p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href="/good-neighbor/winners">Winners</Link>
          {months.map((month) => (
            <Link key={month} href={month === current ? "/good-neighbor" : `/good-neighbor/${month}`}>
              {monthLabel(month)}
            </Link>
          ))}
        </p>
      </div>
      <div className="wrap gn-wrap">
        <GoodNeighborBallot
          month={ballot.month}
          monthName={ballot.monthName}
          path={ballot.canonicalPath}
          open={ballot.open}
          votesEnabled={ballot.votesEnabled}
          editorWinner={ballot.editorWinner}
          initialCounts={counts}
          nominees={ballot.nominees}
        />
      </div>
    </div>
  );
}
