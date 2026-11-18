import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { BreakEditionView } from "@/components/break-edition";
import { BREAK_EDITIONS } from "@/data/break-editions";
import {
  BREAK_INDEX_PATH,
  BREAK_INDEX_TITLE,
  breakEditionJsonLd,
  getBingoActs,
  getBreakPack,
  listBreakEditions,
} from "@/lib/break-pack";
import { listingMeta } from "@/lib/seo";
import { mountainDay } from "@/lib/weeks";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BREAK_EDITIONS.map((edition) => ({ slug: edition.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const edition = BREAK_EDITIONS.find((item) => item.slug === slug);
  if (!edition) return {};
  return listingMeta({
    title: edition.seoTitle,
    description: edition.description,
    base: `/break/${edition.slug}`,
    page: 1,
    total: 1,
  });
}

export default async function BreakEditionPage({ params }: Props) {
  const { slug } = await params;
  const edition = BREAK_EDITIONS.find((item) => item.slug === slug);
  if (!edition) notFound();
  const today = mountainDay();
  const pack = getBreakPack(slug, today);
  const others = listBreakEditions(today).filter((item) => item.slug !== slug);

  return (
    <div className="page-block">
      <JsonLd data={breakEditionJsonLd(pack)} />
      <div className="wrap page-hero">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={BREAK_INDEX_PATH}>{BREAK_INDEX_TITLE}</Link>
          <span aria-hidden="true">/</span>
          <span>{edition.name}</span>
        </p>
        <BreakEditionView pack={pack} acts={getBingoActs()} others={others} />
      </div>
      <div className="no-print">
        <EmailSignup id={`break-${slug}-email`} />
      </div>
    </div>
  );
}
