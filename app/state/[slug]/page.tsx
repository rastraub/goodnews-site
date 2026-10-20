import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { StateJump } from "@/components/local-explorer";
import { UsMap } from "@/components/us-map";
import { CATEGORIES } from "@/lib/categories";
import { toCard } from "@/lib/present";
import { listingJsonLd, pageAlternates, xHandle } from "@/lib/seo";
import { getByState, stateCounts } from "@/lib/stories";
import { getStateBySlug, neighborStates, STATES } from "@/lib/states";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STATES.map((state) => ({ slug: state.slug }));
}

function stateDescription(name: string) {
  return `Good news from ${name}: verified, uplifting stories from cities and towns across the state. Every story is checked and linked to its original source.`;
}

function uniqueCities(stories: { city: string }[]) {
  const cities: string[] = [];
  for (const story of stories) {
    if (!cities.includes(story.city)) cities.push(story.city);
  }
  return cities;
}

function formatList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return {};
  const stories = getByState(state.code);
  const title = `Good news ${state.name}`;
  const description = stateDescription(state.name);
  const image = stories[0];
  return {
    title,
    description,
    alternates: pageAlternates(`/state/${state.slug}`),
    ...(image
      ? {
          openGraph: {
            url: `/state/${state.slug}`,
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

export default async function StatePage({ params }: Props) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) notFound();
  const stories = getByState(state.code);
  const highlighted = stateCounts().map((item) => item.code.toLowerCase());
  const cities = uniqueCities(stories).slice(0, 4);
  const categories = CATEGORIES.filter((category) => stories.some((story) => story.category === category.slug));
  const neighbors = neighborStates(state.code);
  const description = stateDescription(state.name);
  const cityPhrase = cities.length ? `, including ${formatList(cities)}` : "";

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: `Good news ${state.name}`,
          description,
          path: `/state/${state.slug}`,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Local", path: "/local" },
            { name: state.name, path: `/state/${state.slug}` },
          ],
          stories,
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/local">Local</Link>
          <span aria-hidden="true">/</span>
          <span>{state.name}</span>
        </p>
        <p className="kicker">Local</p>
        <h1>Good news from {state.name}.</h1>
        <p className="lede">
          {stories.length
            ? `Good news from ${state.name}${cityPhrase}. ${stories.length} verified ${stories.length === 1 ? "story" : "stories"}, each one checked and linked to the original report.`
            : `Good news from ${state.name} will land here once a story is checked and published. If you know one, send it in.`}
        </p>
        {categories.length ? (
          <p className="link-pills">
            {categories.map((category) => (
              <Link key={category.slug} href={`/category/${category.slug}`}>
                {category.label}
              </Link>
            ))}
          </p>
        ) : null}
      </div>
      <div className="wrap state-layout" style={{ paddingTop: 24 }}>
        <div>
          {stories.length ? (
            <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
              {stories.map((story) => (
                <StoryCard key={story.slug} story={toCard(story)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>{state.name} is due for some good news.</h2>
              <p style={{ margin: "8px 0 18px", color: "var(--ink2)" }}>
                Kindness is happening here. It just has not crossed our desk yet.
              </p>
              <Link className="btn btn-ink" href="/submit">
                Submit a {state.name} story
              </Link>
            </div>
          )}
          {neighbors.length ? (
            <div style={{ marginTop: 28 }}>
              <h2 className="side-title">Good news nearby</h2>
              <p className="link-pills">
                {neighbors.map((neighbor) => (
                  <Link key={neighbor.code} href={`/state/${neighbor.slug}`}>
                    {neighbor.name}
                  </Link>
                ))}
              </p>
            </div>
          ) : (
            <p style={{ marginTop: 22 }}>
              <Link className="more" href="/local">
                Good news from every state
                <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
              </Link>
            </p>
          )}
        </div>
        <aside className="state-side">
          <UsMap home={state.code.toLowerCase()} highlighted={highlighted} />
          <StateJump code={state.code} />
          <p style={{ marginTop: 14 }}>
            <Link className="more" href="/local">
              See all 50 states
              <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
