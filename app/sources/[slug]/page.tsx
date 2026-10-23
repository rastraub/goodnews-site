import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SourceInvite } from "@/components/source-invite";
import { StoryCard } from "@/components/story-card";
import { joinNames, getOutlet, getOutlets } from "@/lib/outlets";
import { toCard } from "@/lib/present";
import { listingJsonLd, pageAlternates } from "@/lib/seo";
import { getPublishedStories } from "@/lib/stories";
import { siteConfig } from "@/site.config";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getOutlets()
    .filter((outlet) => outlet.hasPage)
    .map((outlet) => ({ slug: outlet.slug }));
}

function outletDescription(outlet: { count: number; name: string }): string {
  const noun = outlet.count === 1 ? "story" : "stories";
  return `${outlet.count} ${noun} on ${siteConfig.name} credit ${outlet.name}. The reporting is theirs, and each summary links to the original article.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const outlet = getOutlet(slug);
  if (!outlet?.pagePath) return {};
  const description = outletDescription(outlet);
  return {
    title: outlet.name,
    description,
    alternates: pageAlternates(outlet.pagePath),
    openGraph: {
      url: outlet.pagePath,
      title: outlet.name,
      description,
    },
  };
}

export default async function OutletPage({ params }: Props) {
  const { slug } = await params;
  const outlet = getOutlet(slug);
  if (!outlet?.pagePath) notFound();

  const bySlug = new Map(getPublishedStories().map((story) => [story.slug, story]));
  const stories = outlet.stories.flatMap((ref) => {
    const story = bySlug.get(ref.slug);
    return story ? [story] : [];
  });
  const description = outletDescription(outlet);
  const places = [
    ...outlet.states.map((state) => ({ label: state.name, href: `/state/${state.slug}` })),
    ...outlet.countries.map((country) => ({ label: country.name, href: `/country/${country.slug}` })),
  ];

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: outlet.name,
          description,
          path: outlet.pagePath,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Newsrooms", path: "/sources" },
            { name: outlet.name, path: outlet.pagePath },
          ],
          stories,
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/sources">Newsrooms</Link>
          <span aria-hidden="true">/</span>
          <span>{outlet.name}</span>
        </p>
        <p className="kicker">Newsroom</p>
        <h1>{outlet.name}</h1>
        <p className="lede">{description}</p>
        {outlet.aliases.length ? <p className="source-alias">Also credited as {joinNames(outlet.aliases)}.</p> : null}
        <p className="link-pills">
          <a href={outlet.homepage} target="_blank" rel="noopener noreferrer">
            Visit {outlet.domain}
          </a>
          {places.map((place) => (
            <Link key={place.href} href={place.href}>
              {place.label}
            </Link>
          ))}
        </p>
        <SourceInvite />
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="shead">
          <div>
            <h2>Stories we credit to {outlet.name}</h2>
            <p>Newest first. The original article stays linked on each story.</p>
          </div>
        </div>
        <div className="grid">
          {stories.map((story) => (
            <StoryCard key={story.slug} story={toCard(story)} />
          ))}
        </div>
      </div>
    </div>
  );
}
