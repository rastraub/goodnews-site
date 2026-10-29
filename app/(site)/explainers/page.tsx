import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import {
  EXPLAINER_INDEX_DESCRIPTION,
  EXPLAINER_INDEX_PATH,
  EXPLAINER_INDEX_TITLE,
  explainerIndexJsonLd,
  explainerPath,
  getPublishedExplainers,
  storiesForExplainer,
} from "@/lib/explainers";
import { pageAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: EXPLAINER_INDEX_TITLE,
  description: EXPLAINER_INDEX_DESCRIPTION,
  alternates: pageAlternates(EXPLAINER_INDEX_PATH),
};

export default function ExplainersPage() {
  const explainers = getPublishedExplainers();

  return (
    <section className="page-block">
      <JsonLd data={explainerIndexJsonLd(explainers)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Explainers</span>
        </p>
        <p className="kicker">Evergreen</p>
        <h1>Good News Explainers.</h1>
        <p className="lede">{EXPLAINER_INDEX_DESCRIPTION}</p>
      </div>
      <div className="wrap" style={{ paddingTop: 8, paddingBottom: 56 }}>
        <div className="explainer-list">
          {explainers.map((explainer) => {
            const count = storiesForExplainer(explainer).length;
            return (
              <Link key={explainer.slug} href={explainerPath(explainer.slug)}>
                <h2>{explainer.title}</h2>
                <p>{explainer.dek}</p>
                <span className="count">
                  {count === 1 ? "1 story from the archive" : `${count} stories from the archive`}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
