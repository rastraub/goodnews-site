import { StoryImage } from "@/components/story-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheerButton } from "@/components/cheer-button";
import { LiveBadge } from "@/components/good-neighbor-results";
import { ListenControls } from "@/components/listen-controls";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryCard } from "@/components/story-card";
import { EmphaticTitle, StoryBody } from "@/components/story-body";
import { VerifiedBadge } from "@/components/verified-badge";
import { getCategory } from "@/lib/categories";
import { monthDayFromIso, monthDayLabel, onThisDayPath } from "@/lib/calendar-day";
import { packByStart } from "@/lib/classroom-pack";
import { closedNomination, recordedWinnerFor } from "@/lib/good-neighbor-data";
import { votesEnabled } from "@/lib/good-neighbor-store";
import { cityHubForStory, getHubByPath, hubPathsForStory } from "@/lib/hubs";
import { formatStoryDate } from "@/lib/format";
import { HELP_KIND_LABEL } from "@/lib/help";
import { kidListenSegments, storyListenSegments } from "@/lib/listen-text";
import { placeLabel, toCard } from "@/lib/present";
import { openGraphImage } from "@/lib/feed-image";
import { pageAlternates, storyJsonLd, storyModifiedIso, storyPublishedIso, xHandle } from "@/lib/seo";
import { getCountry } from "@/lib/countries";
import { explainerPath, explainersForStory } from "@/lib/explainers";
import { challengesForStory } from "@/lib/kindness";
import { getOutletForStory } from "@/lib/outlets";
import { getStory, relatedStories, storiesToPrerender, type Story } from "@/lib/stories";
import { getStateByCode } from "@/lib/states";
import { weekStart } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return storiesToPrerender().map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};
  const description = story.dek;
  const category = getCategory(story.category);
  const state = getStateByCode(story.state);
  const country = getCountry(story.country);
  const published = storyPublishedIso(story);
  const modified = storyModifiedIso(story);
  const socialImage = openGraphImage(story);
  const tags = [story.country === "US" ? state?.name : country?.name, story.city, category?.label].filter((tag): tag is string => Boolean(tag));
  return {
    title: story.title,
    description,
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
    alternates: pageAlternates(`/story/${story.slug}`),
    openGraph: {
      type: "article",
      url: `/story/${story.slug}`,
      title: story.title,
      description,
      publishedTime: published,
      modifiedTime: modified,
      authors: [siteConfig.editor.name],
      section: category?.label,
      tags,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      site: xHandle(),
      title: story.title,
      description,
      images: [socialImage.url],
    },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();
  const category = getCategory(story.category);
  const state = story.country === "US" ? getStateByCode(story.state) : undefined;
  const country = story.country === "US" ? undefined : getCountry(story.country);
  const related = relatedStories(story);
  const outlet = getOutletForStory(story);
  const neighborBadge = recordedWinnerFor(story.slug);
  const neighborVote = !neighborBadge && votesEnabled() ? closedNomination(story.slug) : undefined;
  const inspired = challengesForStory(story.slug);
  const hubLinks = hubPathsForStory(story).flatMap((path) => {
    const hub = getHubByPath(path);
    return hub ? [{ href: hub.path, label: hub.linkLabel }] : [];
  });
  const friday = packByStart(weekStart(story.date));
  const explainers = explainersForStory(story);
  const anniversary = monthDayFromIso(story.date);
  if (anniversary) {
    hubLinks.push({
      href: onThisDayPath(anniversary.month, anniversary.day),
      label: `Good news on ${monthDayLabel(anniversary.month, anniversary.day)}`,
    });
  }

  return (
    <article className="story-page">
      <JsonLd data={storyJsonLd(story)} />
      <div className="wrap story-layout">
        <div className="story-main">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            {category ? <Link href={`/category/${category.slug}`}>{category.label}</Link> : null}
            <span aria-hidden="true">/</span>
            {country ? <Link href={`/country/${country.slug}`}>{country.name}</Link> : null}
            {state ? <Link href={`/state/${state.slug}`}>{state.name}</Link> : null}
          </p>
          <div className="kicker">
            {category?.label}
            <span className="dot" />
            <span className="place"><PlaceName story={story} /></span>
          </div>
          {neighborBadge ? (
            <Link href={neighborBadge.href} className="gn-badge">
              {neighborBadge.label}
            </Link>
          ) : neighborVote ? (
            <LiveBadge slug={story.slug} month={neighborVote.month} href={neighborVote.href} label={neighborVote.label} />
          ) : null}
          <EmphaticTitle id="speak-title" title={story.title} emphasis={story.emphasis} />
          <ListenControls
            label="Listen to this story"
            segments={storyListenSegments(story)}
            kidSegments={story.kidFriendly && story.kidSummary && story.kidQuestions?.length ? kidListenSegments(story) : undefined}
          />
          <p className="dek" id="speak-dek">
            {story.dek}
          </p>
          <div className="meta">
            <span className="byline">
              By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
            </span>
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
            <div className="source-actions">
              <a className="btn btn-ink" href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                Read it on {story.sourceName}
                <svg className="ico" aria-hidden="true"><use href="#i-ext" /></svg>
              </a>
              {outlet?.hasPage && outlet.pagePath ? (
                <Link className="source-more" href={outlet.pagePath}>
                  Stories we credit to {story.sourceName}
                </Link>
              ) : null}
            </div>
          </div>
          <StoryBody markdown={story.body} />
          {inspired.length ? (
            <section className="classroom-box" id="kindness-challenge">
              <h2>Kindness Challenge</h2>
              <p>
                This story inspired {inspired.length === 1 ? "a weekly kindness challenge" : "weekly kindness challenges"} for classrooms and families.
              </p>
              <p className="link-pills">
                {inspired.map((challenge) => (
                  <Link key={challenge.week} href={challenge.path}>
                    {challenge.status === "this-week" ? "This week's challenge" : challenge.rangeLabel}
                  </Link>
                ))}
              </p>
            </section>
          ) : null}
          {story.kidFriendly && story.kidSummary && story.kidQuestions?.length ? (
            <section className="classroom-box" id="classroom">
              <h2>For the classroom</h2>
              <p id="speak-kid">{story.kidSummary}</p>
              <ol>
                {story.kidQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
              <p>
                For a teacher to read with a class. <Link href="/kids/print">Print the story of the day</Link>
                {" · "}
                <Link href="/kids">All classroom stories</Link>
                {friday ? (
                  <>
                    {" · "}
                    <Link href={friday.path}>This week&apos;s Good News Friday pack</Link>
                  </>
                ) : null}
              </p>
            </section>
          ) : null}
          {hubLinks.length ? (
            <p className="jump-links">
              {hubLinks.map((hub) => (
                <Link key={hub.href} href={hub.href}>
                  {hub.label}
                </Link>
              ))}
            </p>
          ) : null}
          {explainers.length ? (
            <section className="explainer-callout">
              <h2>Learn how this works</h2>
              <ul>
                {explainers.map((explainer) => (
                  <li key={explainer.slug}>
                    <Link href={explainerPath(explainer.slug)}>{explainer.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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
            <p className="featured-kit-link">
              <Link href={`/featured/${story.slug}`}>Featured in this story? Get your badge</Link>
            </p>
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
            <p className="jump-links">
              {category ? <Link href={`/category/${category.slug}`}>All {category.label} stories</Link> : null}
              {state ? <Link href={`/state/${state.slug}`}>Good news from {state.name}</Link> : null}
              {country ? <Link href={`/country/${country.slug}`}>Good news from {country.name}</Link> : null}
            </p>
          </div>
        </section>
      ) : null}
    </article>
  );
}

function PlaceName({ story }: { story: Story }) {
  const hub = cityHubForStory(story);
  const label = placeLabel(story);
  if (!hub) return label;
  const at = label.toLowerCase().indexOf(story.city.toLowerCase());
  if (at < 0) {
    return (
      <>
        <Link href={hub.path}>{story.city}</Link>
        {" · "}
        {label}
      </>
    );
  }
  return (
    <>
      {label.slice(0, at)}
      <Link href={hub.path}>{label.slice(at, at + story.city.length)}</Link>
      {label.slice(at + story.city.length)}
    </>
  );
}
