import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { toCard } from "@/lib/present";
import { listingJsonLd, pageAlternates, xHandle } from "@/lib/seo";
import { getByCategory } from "@/lib/stories";
import { getStateByCode } from "@/lib/states";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

function categoryDescription(description: string) {
  return `${description} Verified good news from across the United States, each story linked to its original source.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  const stories = getByCategory(category.slug);
  const title = `${category.label} good news`;
  const description = categoryDescription(category.description);
  const image = stories[0];
  return {
    title,
    description,
    alternates: pageAlternates(`/category/${category.slug}`),
    ...(image
      ? {
          openGraph: {
            url: `/category/${category.slug}`,
            title,
            description,
            images: [{ url: image.image, alt: image.imageAlt, type: "image/webp" as const }],
          },
          twitter: {
            card: "summary_large_image" as const,
            site: xHandle(),
            title,
            description,
            images: [image.image],
          },
        }
      : {}),
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const stories = getByCategory(category.slug);
  const description = categoryDescription(category.description);
  const states = new Map<string, { slug: string; name: string }>();
  for (const story of stories) {
    const state = getStateByCode(story.state);
    if (state && !states.has(state.code)) states.set(state.code, { slug: state.slug, name: state.name });
  }
  const stateLinks = [...states.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: `${category.label} good news`,
          description,
          path: `/category/${category.slug}`,
          crumbs: [
            { name: "Today", path: "/" },
            { name: category.label, path: `/category/${category.slug}` },
          ],
          stories,
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>{category.label}</span>
        </p>
        <p className="kicker">{category.label}</p>
        <h1>{category.label} good news</h1>
        <p className="lede">{description}</p>
        {stateLinks.length ? (
          <>
            <h2 className="side-title">Browse by state</h2>
            <p className="link-pills">
              {stateLinks.map((state) => (
                <Link key={state.slug} href={`/state/${state.slug}`}>
                  {state.name}
                </Link>
              ))}
            </p>
          </>
        ) : null}
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {stories.length ? (
          <div className="grid">
            {stories.map((story) => (
              <StoryCard key={story.slug} story={toCard(story)} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>Nothing here yet.</h2>
            <p>When a story in this category is approved, it will land on this page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
