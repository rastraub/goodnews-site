import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { NewsMapToolsLoader } from "@/components/news-map-tools-loader";
import { ShareButtons } from "@/components/share-buttons";
import { formatLongDate } from "@/lib/format";
import { goodNewsMap, newsMapDescription } from "@/lib/good-news-map";
import { GOOD_NEWS_MAP_PATH } from "@/lib/map-path";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Good News Map";
const CRUMBS = [
  { name: "Today", path: "/" },
  { name: TITLE, path: GOOD_NEWS_MAP_PATH },
];

export function generateMetadata(): Metadata {
  const board = goodNewsMap();
  const description = newsMapDescription(board);
  return {
    ...listingMeta({
      title: TITLE,
      description,
      base: GOOD_NEWS_MAP_PATH,
      page: 1,
      total: 1,
    }),
    openGraph: {
      url: GOOD_NEWS_MAP_PATH,
      title: TITLE,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description,
    },
  };
}

export default function GoodNewsMapPage() {
  const board = goodNewsMap();
  const description = newsMapDescription(board);
  const range = `${formatLongDate(board.start)} through ${formatLongDate(board.today)}`;

  return (
    <div className="page-block newsmap-page">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description,
          path: GOOD_NEWS_MAP_PATH,
          crumbs: CRUMBS,
          stories: board.states.flatMap((state) => state.places.flatMap((place) => place.stories.map((story) => ({ slug: story.slug, title: story.title })))),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>{TITLE}</span>
        </p>
        <p className="kicker">Explore by place</p>
        <h1>Good News Map.</h1>
        <p className="lede">
          {board.storyCount
            ? `${description} Stories published ${range}.`
            : `Stories published ${range} will show up here. Every state below still links to its page.`}
        </p>
        <p className="lede">
          A dot is the city. When the city is not in the census place list, the dot sits on the state. Darker gold means more stories in that state. Nothing on this page is sent to a map service.
        </p>
        <p className="meta">
          <span className="byline">
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </span>
        </p>
        <ShareButtons title={TITLE} path={GOOD_NEWS_MAP_PATH} text="Recent good news, placed by city." />
        <p className="link-pills">
          <Link href="/local">All states</Link>
          <Link href="/kids">Classroom stories</Link>
          <Link href="/classroom">Good News Friday</Link>
          <a href="#newsmap-list">List by state</a>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 8 }}>
        <aside className="classroom-box">
          <h2>Find a story from your state.</h2>
          <p>
            For a teacher reading with a class. Pick your state on the map, or use the list under it. Stories marked kid-friendly are the ones written to read aloud. This page is for adults.
          </p>
          <p className="link-pills">
            <Link href="/kids">Classroom stories</Link>
            <Link href="/kids/print">Print the story of the day</Link>
            <Link href="/classroom">Good News Friday</Link>
          </p>
        </aside>
        <NewsMapToolsLoader />
        <figure className="newsmap-figure">
          <div className="newsmap" dangerouslySetInnerHTML={{ __html: board.svg }} />
          <figcaption>
            <ul className="index-legend">
              <li><i className="swatch band-0" /> No stories</li>
              <li><i className="swatch band-1" /> Fewer stories</li>
              <li><i className="swatch band-2" /> Middle</li>
              <li><i className="swatch band-3" /> More stories</li>
              <li><i className="swatch band-4" /> Most stories</li>
            </ul>
            <p>Shading compares states in this 30-day window. The list has the exact count. Each state opens its page, and each dot opens that place in the list.</p>
          </figcaption>
        </figure>
        <nav className="state-index" aria-label="States" style={{ marginTop: 22 }}>
          {board.states.map((state) => (
            <Link key={state.code} href={`#newsmap-state-${state.slug}`} data-state={state.code} className={state.count ? "has newsmap-jump" : "newsmap-jump"}>
              <span>{state.name}</span>
              <span className="count">{state.count}</span>
            </Link>
          ))}
        </nav>
        <div id="newsmap-list" className="newsmap-states">
          <h2>Stories by state</h2>
          <p className="newsmap-filter-note">The same stories as the map, in text, for a small screen or a screen reader. A state with zero still links to older stories.</p>
          {board.states.map((state) => (
            <section key={state.code} id={`newsmap-state-${state.slug}`} className="newsmap-state" data-state={state.code} data-total={state.count}>
              <h3>
                <Link href={state.href}>{state.name}</Link>
              </h3>
              <p className="newsmap-tally">{state.count === 1 ? "1 story in the last 30 days." : `${state.count} stories in the last 30 days.`}</p>
              {state.places.length ? (
                state.places.map((place) => (
                  <div key={place.id} id={place.id} className="newsmap-place" data-pin={place.id}>
                    <h4>
                      {place.href ? <Link href={place.href}>{place.city}</Link> : place.city}
                    </h4>
                    {place.precision === "state" ? (
                      <p className="newsmap-approx">Shown on the state. This city is not in the census place list.</p>
                    ) : null}
                    <ul className="newsmap-stories">
                      {place.stories.map((story) => (
                        <li key={story.slug} className="newsmap-story" data-state={state.code} data-cat={story.category} data-kid={story.kidFriendly ? "1" : "0"} data-pin={place.id}>
                          <Link href={`/story/${story.slug}`}>{story.title}</Link>
                          <span className="newsmap-meta">
                            {story.categoryLabel}
                            {story.kidFriendly ? <span className="newsmap-kid"> · Kid-friendly</span> : null}
                            {" · "}
                            {story.dateLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="newsmap-none">
                  No story in the last 30 days. <Link href={state.href}>Older stories from {state.name}</Link>.
                </p>
              )}
              <p className="newsmap-filter-empty" hidden>
                No story in this filter. <Link href={state.href}>All {state.name} stories</Link>.
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
