import { ExplainerBody } from "@/components/explainer-body";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { HELP_KIND_LABEL } from "@/lib/help";
import { formatStoryDate } from "@/lib/format";
import { toCard } from "@/lib/present";
import {
  explainerJsonLd,
  explainerPath,
  getExplainer,
  getPublishedExplainers,
  storiesForExplainer,
} from "@/lib/explainers";
import { pageAlternates, xHandle } from "@/lib/seo";
import { siteConfig } from "@/site.config";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedExplainers().map((explainer) => ({ slug: explainer.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const explainer = getExplainer(slug);
  if (!explainer) return {};
  const path = explainerPath(explainer.slug);
  return {
    title: explainer.title,
    description: explainer.dek,
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
    alternates: pageAlternates(path),
    openGraph: {
      type: "article",
      url: path,
      title: explainer.title,
      description: explainer.dek,
      publishedTime: `${explainer.date}T09:00:00.000Z`,
      modifiedTime: `${explainer.updated ?? explainer.date}T09:00:00.000Z`,
      authors: [siteConfig.editor.name],
      section: "Explainers",
      tags: explainer.keywords,
    },
    twitter: {
      card: "summary_large_image",
      site: xHandle(),
      title: explainer.title,
      description: explainer.dek,
    },
  };
}

export default async function ExplainerPage({ params }: Props) {
  const { slug } = await params;
  const explainer = getExplainer(slug);
  if (!explainer) notFound();
  const stories = storiesForExplainer(explainer);
  const others = getPublishedExplainers().filter((item) => item.slug !== explainer.slug);

  return (
    <article className="story-page">
      <JsonLd data={explainerJsonLd(explainer)} />
      <div className="wrap story-layout">
        <div className="story-main">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <Link href="/explainers">Explainers</Link>
            <span aria-hidden="true">/</span>
            <span>{explainer.shortTitle}</span>
          </p>
          <p className="kicker">Explainer</p>
          <h1>{explainer.title}</h1>
          <p className="dek">{explainer.dek}</p>
          <div className="meta">
            <span className="byline">
              By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
            </span>
            <span className="time">
              {formatStoryDate(explainer.updated ?? explainer.date)} · {explainer.minutes} min read
            </span>
          </div>
          <ExplainerBody markdown={explainer.body} />
          {explainer.steps?.length ? (
            <div className="steps" style={{ marginTop: 8 }}>
              {explainer.steps.map((step, index) => (
                <div className="step" id={`step-${index + 1}`} key={step.name}>
                  <div className="n">{index + 1}</div>
                  <div>
                    <h3>{step.name}</h3>
                    <p>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <section className="classroom-box" aria-labelledby="safety-notes">
            <h2 id="safety-notes">A few safety notes</h2>
            <ul>
              {explainer.safety.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
          <section className="classroom-box" id="sources">
            <h2>Sources</h2>
            <ul>
              {explainer.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section className="classroom-box" id="for-kids">
            <h2>In short, for kids</h2>
            <p>{explainer.kidSummary}</p>
            <p>
              For a teacher to read with a class. <Link href="/kids">Classroom stories</Link>
            </p>
          </section>
        </div>
        <aside className="story-side">
          <section className="side-card" id="how-to-help">
            <h2>How to help</h2>
            <div className="help-list">
              {explainer.howToHelp.map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                  <span>{item.label}</span>
                  <small>{HELP_KIND_LABEL[item.kind]}</small>
                </a>
              ))}
            </div>
          </section>
          {others.length ? (
            <section className="side-card">
              <h2>More explainers</h2>
              <p className="jump-links">
                {others.map((item) => (
                  <Link key={item.slug} href={explainerPath(item.slug)}>
                    {item.shortTitle}
                  </Link>
                ))}
              </p>
            </section>
          ) : null}
        </aside>
      </div>
      <section className="latest">
        <div className="wrap">
          <div className="shead">
            <div>
              <h2>Stories from the archive</h2>
              <p>Related reporting already on this site. Each one still links to the newsroom that reported it.</p>
            </div>
          </div>
          {stories.length ? (
            <div className="grid">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={toCard(story)} />
              ))}
            </div>
          ) : (
            <p className="empty">No archive stories are linked yet.</p>
          )}
        </div>
      </section>
    </article>
  );
}
