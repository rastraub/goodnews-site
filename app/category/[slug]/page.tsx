import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryCard } from "@/components/story-card";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { toCard } from "@/lib/present";
import { getByCategory } from "@/lib/stories";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return {
    title: category.label,
    description: category.description,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const stories = getByCategory(category.slug);

  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">{category.label}</p>
        <h1>{category.label}</h1>
        <p className="lede">{category.description}</p>
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
