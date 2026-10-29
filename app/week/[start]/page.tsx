import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ListenControls } from "@/components/listen-controls";
import { StoryCard } from "@/components/story-card";
import { kidListSegments, listenCardId } from "@/lib/listen-text";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import { toCard } from "@/lib/present";
import type { Story } from "@/lib/stories";
import { packByStart } from "@/lib/classroom-pack";
import { storiesInReadingOrder, usPlaceSentence, weeksToPrerender, type WeekRoundup } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return weeksToPrerender().map((week) => ({ start: week.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const week = weeksToPrerender().find((item) => item.start === start);
  if (!week) return {};
  return listingMeta({
    title: week.title,
    description: week.intro,
    base: week.path,
    page: 1,
    total: 1,
    feedPath: "/week/rss.xml",
    image: { url: week.image, alt: week.imageAlt },
  });
}

function Cards({ stories, listen }: { stories: Story[]; listen?: boolean }) {
  return (
    <div className="grid">
      {stories.map((story) => (
        <StoryCard key={story.slug} story={toCard(story)} listenId={listen ? listenCardId(story.slug) : undefined} />
      ))}
    </div>
  );
}

function WeekNav({
  previous,
  next,
}: {
  previous?: WeekRoundup<Story>;
  next?: WeekRoundup<Story>;
}) {
  return (
    <nav className="pager" aria-label="Weeks">
      {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
      <Link href="/week">All weeks</Link>
      {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
    </nav>
  );
}

export default async function WeekPage({ params }: Props) {
  const { start } = await params;
  const weeks = weeksToPrerender();
  const index = weeks.findIndex((week) => week.start === start);
  if (index < 0) notFound();
  const week = weeks[index];
  const previous = index > 0 ? weeks[index - 1] : undefined;
  const next = index < weeks.length - 1 ? weeks[index + 1] : undefined;
  const storyWord = week.kids.length === 1 ? "story" : "stories";
  const pack = packByStart(week.start);

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: week.title,
          description: week.intro,
          path: week.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "This week", path: "/week" },
            { name: week.rangeLabel, path: week.path },
          ],
          stories: storiesInReadingOrder(week),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/week">This week</Link>
          <span aria-hidden="true">/</span>
          <span>{week.rangeLabel}</span>
        </p>
        <p className="kicker">{week.inProgress ? "So far" : "This week"}</p>
        <h1>{week.heading}</h1>
        <p className="lede">{week.intro}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          {previous ? <Link href={previous.path}>Previous week</Link> : null}
          <Link href="/week">All weeks</Link>
          {next ? <Link href={next.path}>Next week</Link> : null}
          {week.kids.length ? <Link href="/kids">Classroom section</Link> : null}
          <Link href="/week/rss.xml">Week RSS</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <section aria-labelledby="standouts">
          <div className="shead">
            <div>
              <h2 id="standouts">Standout stories</h2>
              <p>{week.standoutNote}</p>
            </div>
          </div>
          <Cards stories={week.standouts} />
        </section>
        {week.categories.map((category) => (
          <section key={category.slug} aria-labelledby={`category-${category.slug}`} style={{ marginTop: 56 }}>
            <div className="shead">
              <div>
                <h2 id={`category-${category.slug}`}>{category.label}</h2>
                <p>
                  {category.stories.length} {category.stories.length === 1 ? "story" : "stories"} in this section this week.
                </p>
              </div>
              <Link className="more" href={`/category/${category.slug}`}>
                All {category.label}
                <svg className="ico" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </Link>
            </div>
            <Cards stories={category.stories} />
          </section>
        ))}
        {week.world.length ? (
          <section aria-labelledby="around-the-world" style={{ marginTop: 56 }}>
            <div className="shead">
              <div>
                <h2 id="around-the-world">Around the World</h2>
                <p>
                  {week.world.length} {week.world.length === 1 ? "story" : "stories"} from outside the United States.
                </p>
              </div>
              <Link className="more" href="/world">
                World desk
                <svg className="ico" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </Link>
            </div>
            <Cards stories={week.world} />
          </section>
        ) : null}
        {week.kids.length ? (
          <section className="classroom-box" aria-labelledby="classrooms" style={{ marginTop: 56 }}>
            <h2 id="classrooms">For classrooms</h2>
            <p style={{ color: "var(--ink2)", fontSize: "16.5px", lineHeight: 1.55 }}>
              {week.kids.length} {storyWord} this week {week.kids.length === 1 ? "is" : "are"} ready for a classroom read-aloud.
            </p>
            <p style={{ marginTop: 12 }}>
              <Link className="more" href="/kids">
                Open the classroom section
                <svg className="ico" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </Link>
              {pack ? (
                <Link className="more" href={pack.path} style={{ marginLeft: 16 }}>
                  Print the Good News Friday pack
                  <svg className="ico" aria-hidden="true">
                    <use href="#i-arrow" />
                  </svg>
                </Link>
              ) : null}
            </p>
            <ListenControls label="Read all aloud" groupLabel="Read this week's classroom summaries aloud" segments={kidListSegments(week.kids)} />
            <div style={{ marginTop: 18 }}>
              <Cards stories={week.kids} listen />
            </div>
          </section>
        ) : null}
        {week.states.length ? (
          <section aria-labelledby="states" style={{ marginTop: 56 }}>
            <div className="shead">
              <div>
                <h2 id="states">States with good news this week</h2>
                <p>{usPlaceSentence(week.usPlace)}</p>
              </div>
              <Link className="more" href="/local">
                All states
                <svg className="ico" aria-hidden="true">
                  <use href="#i-arrow" />
                </svg>
              </Link>
            </div>
            <div className="state-index">
              {week.states.map((state) => (
                <Link key={state.code} href={`/state/${state.slug}`} className="has">
                  <span>{state.name}</span>
                  <span className="count">{state.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <WeekNav previous={previous} next={next} />
      </div>
    </div>
  );
}
