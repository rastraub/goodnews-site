import type { Metadata } from "next";
import Link from "next/link";
import { BadgeGallery } from "@/components/badge-gallery";
import { CopyBlock } from "@/components/copy-block";
import { ShareLines } from "@/components/share-lines";
import { StoryKitFinder, type KitStory } from "@/components/story-kit-finder";
import { BADGE_VARIANTS } from "@/lib/badges";
import { placeLabel } from "@/lib/present";
import {
  badgeEmbedHtml,
  generalShareLines,
  iframeSnippet,
  scriptSnippet,
  storyPermalink,
  widgetTitle,
} from "@/lib/partner-kit";
import { pageAlternates } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: { absolute: `Featured on ${siteConfig.name}` },
  description: `Badge, embed code, and share text for newsrooms, nonprofits, schools, and reporters covered on ${siteConfig.name}.`,
  alternates: pageAlternates("/featured"),
};

export default function FeaturedPage() {
  const stories = getPublishedStories();
  const example = stories[0];
  const exampleHref = example ? storyPermalink(example.slug) : siteConfig.url;
  const light = BADGE_VARIANTS[0];
  const finderStories: KitStory[] = stories.map((story) => ({
    slug: story.slug,
    title: story.title,
    place: placeLabel(story),
    sourceName: story.sourceName,
  }));
  const handle = siteConfig.social.x.trim();

  return (
    <div className="page-block">
      <div className="wrap page-hero kit">
        <p className="kicker">For partners</p>
        <h1>Featured on {siteConfig.name}</h1>
        <p className="lede">
          A kit for nonprofits, local newsrooms, schools, and reporters whose work is part of a story here. The badge, the embed code, and the share text point readers back to that story.
        </p>
        <nav className="jump-links" aria-label="On this page">
          <a href="#what">What {siteConfig.name} is</a>
          <a href="#why">Why you were featured</a>
          <a href="#badges">Badges</a>
          <a href="#embed">Embed</a>
          <a href="#share">Share text</a>
          <a href="#widget">Widget</a>
          <a href="#contact">Contact</a>
        </nav>

        <section id="what">
          <h2>What {siteConfig.name} is</h2>
          <p>{siteConfig.description}</p>
          <p>
            {siteConfig.editor.blurb} The <Link href="/about">about page</Link> and the <Link href="/editorial-standards">editorial standards</Link> are the rules behind that.
          </p>
        </section>

        <section id="why">
          <h2>Why you were featured</h2>
          <p>
            We published a story that includes your reporting, your organization, your school, or your work. The badge says that story is on {siteConfig.name}. It is not a sponsorship, not a paid placement, and not an endorsement of a product.
          </p>
          <p>
            Anyone named in the same story can use the same badge. Link it to the story page so a reader lands on the piece that names you, with the original report one click away. A paid partnership, if we ever run one, is labeled and starts on <Link href="/partner">partner with us</Link>.
          </p>
        </section>

        <section id="badges">
          <h2>Badges</h2>
          <p>
            Four versions: light and dark, square and horizontal. SVG stays sharp on a website. PNG is there for a newsletter or a tool that will not take an SVG. The files do not set a cookie or report that they were viewed.
          </p>
          <BadgeGallery />
        </section>

        <section id="embed">
          <h2>Embed the badge</h2>
          <p>
            Paste the HTML where the badge should appear. The image links to the story. Each story has its own kit, with the headline and the permanent link already filled in.
          </p>
          {example && light ? (
            <>
              <p>
                This example is the newest story, <Link href={`/story/${example.slug}`}>{example.title}</Link>. The full set of shapes is on its <Link href={`/featured/${example.slug}`}>story kit</Link>.
              </p>
              <h3>SVG</h3>
              <CopyBlock value={badgeEmbedHtml({ variant: light, href: exampleHref, format: "svg" })} label="Copy SVG embed" />
              <h3>PNG</h3>
              <CopyBlock value={badgeEmbedHtml({ variant: light, href: exampleHref, format: "png" })} label="Copy PNG embed" />
            </>
          ) : (
            <p>Stories will show up here after the first one is published.</p>
          )}
          <h3>Find your story</h3>
          <StoryKitFinder stories={finderStories} />
        </section>

        <section id="share">
          <h2>Share text</h2>
          <p>
            Suggested lines for a post. They do not name accounts {siteConfig.name} does not run.
            {handle ? ` One optional line on a story kit can mention @${handle}, the only account we run.` : null}
          </p>
          <ShareLines lines={generalShareLines()} />
          <p>For a post about one story, open that story&apos;s kit. The headline and the link are filled in there.</p>
        </section>

        <section id="widget">
          <h2>A widget for your site</h2>
          <p>
            Local outlets and community sites can show the latest headlines. There is one widget for each state and the District of Columbia, plus a national latest list. No cookies and no tracking. The <Link href="/widgets">widget page</Link> has a snippet for every state.
          </p>
          <h3>Latest stories</h3>
          <iframe className="widget-preview" src="/embed/latest" title={widgetTitle()} loading="lazy" />
          <CopyBlock value={iframeSnippet({ place: "latest", title: widgetTitle() })} label="Copy iframe" />
          <CopyBlock value={scriptSnippet({ place: "latest", title: widgetTitle() })} label="Copy script" />
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            Questions about a credit, a badge, or a widget: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. That is the only address.
          </p>
        </section>
      </div>
    </div>
  );
}
