import { StoryImage } from "@/components/story-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheerButton } from "@/components/cheer-button";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryCard } from "@/components/story-card";
import { EmphaticTitle, StoryBody } from "@/components/story-body";
import { VerifiedBadge } from "@/components/verified-badge";
import { getCategory } from "@/lib/categories";
import { formatStoryDate } from "@/lib/format";
import { HELP_KIND_LABEL } from "@/lib/help";
import { placeLabel, toCard } from "@/lib/present";
import { getPublishedStories, getStory, relatedStories } from "@/lib/stories";
import { getStateByCode } from "@/lib/states";
import { siteConfig } from "@/site.config";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPublishedStories().map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};
  const description = story.dek;
  return {
    title: story.title,
    description,
    alternates: { canonical: `/story/${story.slug}` },
    openGraph: {
      type: "article",
      url: `/story/${story.slug}`,
      description,
      publishedTime: story.date,
    },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();
  const category = getCategory(story.category);
  const state = getStateByCode(story.state);
  const related = relatedStories(story);
  const url = `${siteConfig.url}/story/${story.slug}`;

  return (
    <article className="story-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: story.title,
          description: story.dek,
          datePublished: story.date,
          image: [`${siteConfig.url}${story.image}`],
          author: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
          publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
          isBasedOn: story.sourceUrl,
          mainEntityOfPage: url,
          citation: story.sourceUrl,
        }}
      />
      <div className="wrap story-layout">
        <div className="story-main">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            {category ? <Link href={`/category/${category.slug}`}>{category.label}</Link> : null}
            <span aria-hidden="true">/</span>
            {state ? <Link href={`/state/${state.slug}`}>{state.name}</Link> : null}
          </p>
          <div className="kicker">
            {category?.label}
            <span className="dot" />
            <span className="place">{placeLabel(story)}</span>
          </div>
          <EmphaticTitle title={story.title} emphasis={story.emphasis} />
          <p className="dek">{story.dek}</p>
          <div className="meta">
            <VerifiedBadge source={story.sourceName} withSourceWord />
            <span className="time">
              {formatStoryDate(story.date)} · {story.minutes} min read
            </span>
          </div>
          <div className="actions">
            <CheerButton slug={story.slug} count={story.cheers} variant="hero" />
            <a className="help" href="#how-to-help">
              <svg className="ico" aria-hidden="true"><use href="#i-hand" /></svg>
              How to help
            </a>
          </div>
          {story.correction ? (
            <div className="correction">
              <strong>Correction. </strong>
              {story.correction}
            </div>
          ) : null}
          <figure>
            <div className="story-figure">
              <StoryImage src={story.image} alt={story.imageAlt} priority sizes="(max-width: 700px) 100vw, 720px" treatment={story.imageTreatment} />
            </div>
            <figcaption className="caption">
              {story.imageCaption}{" "}
              <a href={story.imageCreditUrl} rel="noopener noreferrer">
                {story.imageCredit}
              </a>
              {" · "}
              <a href={story.imageLicenseUrl} rel="noopener noreferrer">
                {story.imageLicense}
              </a>
            </figcaption>
          </figure>
          <div className="source-box">
            <div>
              <h2>Read the original</h2>
              <p>The reporting lives at {story.sourceName}. Our summary is checked against it, and we link it on every story.</p>
            </div>
            <a className="btn btn-ink" href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
              Read it on {story.sourceName}
              <svg className="ico" aria-hidden="true"><use href="#i-ext" /></svg>
            </a>
          </div>
          <StoryBody markdown={story.body} />
        </div>
        <aside className="story-side">
          <section className="side-card" id="how-to-help">
            <h2>How to help</h2>
            <div className="help-list">
              {story.howToHelp.map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                  <span>{item.label}</span>
                  <small>{HELP_KIND_LABEL[item.kind]}</small>
                </a>
              ))}
            </div>
          </section>
          <section className="side-card">
            <h2>Share this story</h2>
            <ShareButtons title={story.title} path={`/story/${story.slug}`} />
          </section>
        </aside>
      </div>
      {related.length ? (
        <section className="latest">
          <div className="wrap">
            <div className="shead">
              <div>
                <h2>More good news</h2>
                <p>Other stories in the same neighborhood of kindness.</p>
              </div>
            </div>
            <div className="grid">
              {related.map((item) => (
                <StoryCard key={item.slug} story={toCard(item)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
