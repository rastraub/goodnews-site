import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KudosCard } from "@/components/kudos-card";
import { KUDOS_MESSAGES } from "@/lib/kudos-card-text";
import {
  KUDOS_PATH,
  KUDOS_TITLE,
  filterKudos,
  honoreeForStory,
  kudosExcludeErrors,
  kudosPath,
  loadKudosExclude,
} from "@/lib/kudos";
import { absoluteUrl, pageAlternates } from "@/lib/seo";
import { getPublishedStories, getStory } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

let eligibleCache: Set<string> | null = null;

function eligibleSlugs(): Set<string> {
  if (process.env.NODE_ENV === "production" && eligibleCache) return eligibleCache;
  const stories = getPublishedStories();
  const config = loadKudosExclude();
  const errors = kudosExcludeErrors(stories, config);
  if (errors.length) throw new Error(`Kudos exclude list:\n- ${errors.join("\n- ")}`);
  const slugs = new Set(filterKudos(stories, config.exclude).map((story) => story.slug));
  if (process.env.NODE_ENV === "production") eligibleCache = slugs;
  return slugs;
}

export function generateStaticParams() {
  return [...eligibleSlugs()].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story || !eligibleSlugs().has(slug)) return { robots: { index: false, follow: false } };
  const honoree = honoreeForStory(story);
  const title = `Kudos card: ${story.shortTitle ?? story.title}`;
  const description = `A printable thank-you card for ${honoree}. It links back to the story. This page is a card, not a new article.`;
  return {
    title,
    description,
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
    alternates: pageAlternates(kudosPath(slug)),
    // A card page is a headline plus a short note, so it stays out of the index.
    robots: { index: false, follow: true },
  };
}

export default async function KudosStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story || !eligibleSlugs().has(slug)) notFound();
  const honoree = honoreeForStory(story);
  const storyPath = `/story/${story.slug}`;
  const storyUrl = absoluteUrl(storyPath);
  return (
    <article className="page-block">
      <div className="wrap page-hero no-print">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={KUDOS_PATH}>{KUDOS_TITLE}</Link>
          <span aria-hidden="true">/</span>
          <span>{story.shortTitle ?? story.title}</span>
        </p>
        <p className="kicker">Thank-you card</p>
        <h1>Send a kudos card</h1>
        <p className="lede">
          A half-page card for {honoree}. Pick a thank-you or edit it here. Then print it, copy it, or open it in your own apps.
        </p>
        <p className="byline">
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          {" · "}
          {siteConfig.owner.name}
        </p>
        <p className="link-pills">
          <Link href={storyPath}>Read the story</Link>
          <Link href={KUDOS_PATH}>All kudos cards</Link>
        </p>
      </div>
      <div className="wrap kudos-layout">
        <KudosCard
          slug={story.slug}
          headline={story.title}
          honoree={honoree}
          messageChoices={KUDOS_MESSAGES}
          storyPath={storyPath}
          storyUrl={storyUrl}
          siteName={siteConfig.name}
        />
      </div>
    </article>
  );
}
