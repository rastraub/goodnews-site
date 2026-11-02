import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import {
  AMBASSADOR_SHARE,
  AMBASSADORS_PATH,
  ambassadorSignupHref,
  shoutoutsPath,
} from "@/lib/ambassador-tip";
import {
  ambassadorPlace,
  classesForMonth,
  formatAmbassadorMonth,
  indexableShoutoutMonths,
  shoutoutsJsonLd,
  shoutoutMonthsToPrerender,
} from "@/lib/kindness-ambassadors";
import { listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ month: string }> };

export function generateStaticParams() {
  return shoutoutMonthsToPrerender().map((month) => ({ month }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  if (!shoutoutMonthsToPrerender().includes(month)) return {};
  const classes = classesForMonth(month);
  const label = formatAmbassadorMonth(month);
  const description = classes.length
    ? `Kindness Ambassador shoutouts for ${label}. Group name, place, and the act of kindness. No children's names.`
    : `No Kindness Ambassador class has been featured for ${label} yet. Be the first class featured.`;
  const meta = listingMeta({
    title: `Classroom shoutouts for ${label}`,
    description,
    base: shoutoutsPath(month),
    page: 1,
    total: 1,
  });
  if (!classes.length) return { ...meta, robots: { index: false, follow: true } };
  return meta;
}

export default async function ShoutoutsPage({ params }: Props) {
  const { month } = await params;
  if (!shoutoutMonthsToPrerender().includes(month)) notFound();
  const classes = classesForMonth(month);
  const label = formatAmbassadorMonth(month);
  const featured = indexableShoutoutMonths().filter((item) => item !== month).reverse();
  const shareText = `${AMBASSADOR_SHARE} Shoutouts for ${label}. — ${siteConfig.name}`;

  return (
    <div className="page-block">
      <JsonLd data={shoutoutsJsonLd(month, classes)} />
      <div className="wrap page-hero kindness-layout">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={AMBASSADORS_PATH}>Kindness Ambassadors</Link>
          <span aria-hidden="true">/</span>
          <span>{label}</span>
        </p>
        <p className="kicker">Classroom shoutouts</p>
        <h1>{label}.</h1>
        <p className="lede">
          Shoutouts name the group, the city and state or country, and the act. They do not name children, and they do not show photos of children.
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p className="link-pills">
          <Link href={AMBASSADORS_PATH}>About the program</Link>
          <Link href={ambassadorSignupHref()}>Kindness Ambassadors class signup</Link>
        </p>
      </div>
      <div className="wrap kindness-layout" style={{ paddingTop: 8 }}>
        {classes.length ? (
          <div className="shoutout-list">
            {classes.map((entry) => (
              <article key={`${entry.group}-${entry.city}-${entry.act}`} className="shoutout-card">
                <h2>{entry.group}</h2>
                <p className="place">{ambassadorPlace(entry)}</p>
                <p>{entry.act}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>Be the first class featured.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              No class has been featured for {label} yet. When a class tells us about a small act of kindness, editors can add the group name, the place, and what the class did. Children&apos;s names stay off the page.
            </p>
            <p className="link-pills">
              <Link href={ambassadorSignupHref()}>Join Kindness Ambassadors</Link>
              <Link href={AMBASSADORS_PATH}>How the program works</Link>
            </p>
          </div>
        )}
        {featured.length ? (
          <section aria-labelledby="other-months">
            <h2 id="other-months">Other months</h2>
            <ul className="questions">
              {featured.map((item) => (
                <li key={item}>
                  <Link href={shoutoutsPath(item)}>{formatAmbassadorMonth(item)}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="no-print">
          <ShareButtons title={`Kindness Ambassador shoutouts for ${label}`} path={shoutoutsPath(month)} text={shareText} />
        </div>
      </div>
    </div>
  );
}
