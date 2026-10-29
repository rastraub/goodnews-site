import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeGallery } from "@/components/badge-gallery";
import { CopyBlock } from "@/components/copy-block";
import { ShareLines } from "@/components/share-lines";
import { openGraphImage } from "@/lib/feed-image";
import { placeLabel } from "@/lib/present";
import { storyPermalink, storyShareLines } from "@/lib/partner-kit";
import { absoluteUrl } from "@/lib/seo";
import { getStory, storiesToPrerender } from "@/lib/stories";
import { getStateByCode } from "@/lib/states";
import { siteConfig } from "@/site.config";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return storiesToPrerender().map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return { robots: { index: false, follow: false } };
  return {
    title: `Featured kit: ${story.shortTitle ?? story.title}`,
    description: `Badge, embed code, and share text for this ${siteConfig.name} story.`,
    robots: { index: false, follow: true },
    alternates: { canonical: "/featured" },
  };
}

export default async function StoryFeaturedPage({ params }: Props) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();
  const href = storyPermalink(story.slug);
  const state = story.country === "US" ? getStateByCode(story.state) : undefined;
  const social = openGraphImage(story);
  const imageUrl = absoluteUrl(social.url);

  return (
    <div className="page-block">
      <article className="wrap page-hero kit">
        <p className="crumbs">
          <Link href="/featured">Featured</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/story/${story.slug}`}>{story.shortTitle ?? story.title}</Link>
        </p>
        <p className="kicker">Featured kit</p>
        <h1>Featured on {siteConfig.name}</h1>
        <p className="lede">
          Badge and share text for <Link href={`/story/${story.slug}`}>{story.title}</Link>. The embed code and the lines below already use that headline and its permanent link.
        </p>
        <p>
          {placeLabel(story)}
          {" · "}
          Reported by {story.sourceName}. Anyone named in this story can use the same badge.
        </p>

        <section id="badges">
          <h2>Badges</h2>
          <p>SVG stays sharp on a website. PNG is the one to use when a newsletter or a tool will not take an SVG. Each snippet links to this story.</p>
          <BadgeGallery storyHref={href} />
        </section>

        <section id="share">
          <h2>Share text</h2>
          <p>Paste a line into a post. The link is this story&apos;s permanent URL.</p>
          <ShareLines lines={storyShareLines(story)} />
        </section>

        <section id="image">
          <h2>Share image</h2>
          <p>
            Sharing the story link is the simple way. The image is already attached to that page. If you post the file itself, keep the credit and the license.
          </p>
          <figure className="kit-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={social.url} alt={story.imageAlt} width={social.width || 1200} height={social.height || 630} />
            <figcaption>
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
          <p className="badge-actions">
            <a className="btn btn-outline" href={social.url} download>
              Download image
            </a>
          </p>
          <CopyBlock value={imageUrl} label="Copy image URL" />
        </section>

        <section id="more">
          <h2>More</h2>
          <p>
            <Link href={`/story/${story.slug}`}>Read the story</Link>
            {" · "}
            <Link href="/featured">All badge styles and the general kit</Link>
            {" · "}
            {state ? (
              <>
                <Link href={`/widgets#${state.slug}`}>More good news from {state.name}</Link>
                {" · "}
              </>
            ) : null}
            <Link href="/widgets">Headline widgets</Link>
          </p>
          <p>
            Questions about this credit: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. That is the only address.
          </p>
        </section>
      </article>
    </div>
  );
}
