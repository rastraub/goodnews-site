import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { BreakEditionView } from "@/components/break-edition";
import {
  BREAK_INDEX_DESCRIPTION,
  BREAK_INDEX_PATH,
  BREAK_INDEX_TITLE,
  breakIndexJsonLd,
  featuredBreakEdition,
  getBingoActs,
  getBreakPack,
  listBreakEditions,
} from "@/lib/break-pack";
import { listingMeta } from "@/lib/seo";
import { mountainDay } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  return listingMeta({
    title: BREAK_INDEX_TITLE,
    description: BREAK_INDEX_DESCRIPTION,
    base: BREAK_INDEX_PATH,
    page: 1,
    total: 1,
  });
}

export default function BreakIndexPage() {
  const today = mountainDay();
  const featured = featuredBreakEdition(today);
  const pack = getBreakPack(featured.slug, today);
  const editions = listBreakEditions(today);
  const others = editions.filter((edition) => edition.slug !== featured.slug);

  return (
    <div className="page-block">
      <JsonLd data={breakIndexJsonLd(editions)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Holiday break pack</span>
        </p>
        <p className="kicker">For families</p>
        <h1>Good News Holiday Break Pack.</h1>
        <p className="lede">
          One printable pack of kid-friendly stories, Kindness Bingo, and activities already on {siteConfig.name}. The pack below is the break happening now in Denver, or the next one when schools are still in session.
        </p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <BreakEditionView pack={pack} acts={getBingoActs()} others={others} nested />
      </div>
      <div className="no-print">
        <EmailSignup id="break-index-email" />
      </div>
    </div>
  );
}
