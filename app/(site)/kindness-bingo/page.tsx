import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { KindnessBingo } from "@/components/kindness-bingo";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { cardSeed } from "@/lib/bingo-card";
import {
  BINGO_DESCRIPTION,
  BINGO_PATH,
  BINGO_TITLE,
  BREAK_INDEX_PATH,
  BREAK_PARENT_NOTE,
  bingoJsonLd,
  getBingoActs,
} from "@/lib/break-pack";
import { listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const STANDALONE_SEED = "kindness-bingo";

export function generateMetadata(): Metadata {
  return listingMeta({
    title: BINGO_TITLE,
    description: BINGO_DESCRIPTION,
    base: BINGO_PATH,
    page: 1,
    total: 1,
  });
}

export default function KindnessBingoPage() {
  return (
    <div className="page-block">
      <JsonLd data={bingoJsonLd()} />
      <div className="wrap page-hero print-sheet">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Kindness Bingo</span>
        </p>
        <p className="kicker">For families</p>
        <h1>Kindness Bingo.</h1>
        <p className="lede">{BINGO_DESCRIPTION}</p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <div className="pack-actions no-print">
          <PrintButton label="Print this card" />
          <Link href={BREAK_INDEX_PATH}>Holiday break pack</Link>
        </div>
        <section className="pack-teacher" aria-labelledby="bingo-note">
          <h2 id="bingo-note">A note for parents</h2>
          <p>{BREAK_PARENT_NOTE}</p>
        </section>
        <KindnessBingo acts={getBingoActs()} defaultSeed={cardSeed(STANDALONE_SEED)} />
      </div>
      <div className="no-print">
        <EmailSignup id="bingo-email" />
      </div>
    </div>
  );
}
