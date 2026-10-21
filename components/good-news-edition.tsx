import Link from "next/link";
import { CopyLink } from "./copy-link";
import { IndexMap } from "./index-map";
import { IndexMethodology } from "./index-methodology";
import { JsonLd } from "./json-ld";
import { StoryCard } from "./story-card";
import { indexJsonLd, type GoodNewsIndex, type IndexCountRow, type IndexStateRow } from "@/lib/good-news-index";
import { formatCount } from "@/lib/format";
import { getHubByPath } from "@/lib/hubs";
import { toCard } from "@/lib/present";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

function storyWord(count: number): string {
  return count === 1 ? "story" : "stories";
}

function Bars({ rows }: { rows: (IndexCountRow & { href?: string })[] }) {
  const max = rows.reduce((peak, row) => Math.max(peak, row.count), 0);
  return (
    <ol className="index-bars">
      {rows.map((row) => (
        <li key={row.slug}>
          <div className="index-bar-label">
            {row.href ? <Link href={row.href}>{row.label}</Link> : <span>{row.label}</span>}
            <span>
              {row.count}
              {row.rank ? <span className="index-rank"> · {row.rankLabel}</span> : null}
            </span>
          </div>
          <div className="index-bar" aria-hidden="true">
            <span style={{ width: max && row.count ? `${(row.count / max) * 100}%` : "0%" }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function EditionNav({
  previous,
  next,
}: {
  previous?: GoodNewsIndex<Story>;
  next?: GoodNewsIndex<Story>;
}) {
  return (
    <nav className="pager" aria-label="Editions">
      {previous ? <Link href={previous.path}>Previous month</Link> : <span className="muted">Previous month</span>}
      <Link href="/good-news-index">All editions</Link>
      {next ? <Link href={next.path}>Next month</Link> : <span className="muted">Next month</span>}
    </nav>
  );
}

export function GoodNewsEdition({
  edition,
  previous,
  next,
}: {
  edition: GoodNewsIndex<Story>;
  previous?: GoodNewsIndex<Story>;
  next?: GoodNewsIndex<Story>;
}) {
  const topics = edition.topics.slice(0, 10).map((topic) => ({
    ...topic,
    href: getHubByPath(`/topic/${topic.slug}`) ? `/topic/${topic.slug}` : undefined,
  }));
  const helpLeaders = edition.states
    .filter((state) => state.helpLinks > 0)
    .sort((a, b) => (a.helpRank ?? 99) - (b.helpRank ?? 99) || a.name.localeCompare(b.name))
    .slice(0, 10);
  const kidStates = edition.states
    .filter((state) => state.kidStories > 0)
    .sort((a, b) => b.kidStories - a.kidStories || a.name.localeCompare(b.name));
  const byName = edition.states.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page-block">
      <JsonLd data={indexJsonLd(edition)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href="/good-news-index">Good News Index</Link>
          <span aria-hidden="true">/</span>
          <span>{edition.label}</span>
        </p>
        <p className="kicker">{edition.inProgress ? "Month to date" : "Monthly index"}</p>
        <h1>{edition.heading}</h1>
        <p className="lede">{edition.description}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="index-updated">{edition.updatedLabel}</p>
        <p className="link-pills">
          <a href={edition.csvPath}>Download CSV</a>
          <a href="#methodology">Methodology</a>
          <a href="#cite">Cite this</a>
          <Link href="/good-news-index">All editions</Link>
          {previous ? <Link href={previous.path}>Previous month</Link> : null}
          {next ? <Link href={next.path}>Next month</Link> : null}
        </p>
      </div>

      <div className="wrap" style={{ paddingTop: 8 }}>
        <dl className="index-stats">
          <div>
            <dt>Stories</dt>
            <dd>{formatCount(edition.storyCount)}</dd>
          </div>
          <div>
            <dt>United States</dt>
            <dd>{formatCount(edition.usCount)}</dd>
          </div>
          <div>
            <dt>Outside the United States</dt>
            <dd>{formatCount(edition.worldCount)}</dd>
          </div>
          <div>
            <dt>Classroom stories</dt>
            <dd>{formatCount(edition.kidCount)}</dd>
          </div>
          <div>
            <dt>How to help links</dt>
            <dd>{formatCount(edition.helpLinkCount)}</dd>
          </div>
        </dl>

        <section aria-labelledby="by-state" style={{ marginTop: 56 }}>
          <div className="shead">
            <div>
              <h2 id="by-state">Stories by state</h2>
              <p>
                {edition.statesWithStories === 0
                  ? "No United States story is in this edition."
                  : `${edition.usPlace.charAt(0).toUpperCase()}${edition.usPlace.slice(1)} ${edition.statesWithStories === 1 ? "has" : "have"} a story in this edition.`}
              </p>
            </div>
          </div>
          <IndexMap states={edition.states} />
          <div className="index-table-wrap">
            <table className="index-table">
              <caption>
                Stories {siteConfig.name} published in {edition.label}
                {edition.inProgress ? ", month to date" : ""}, by state and the District of Columbia. Per 1 million residents uses the July 1, 2024 U.S. Census estimate.
              </caption>
              <thead>
                <tr>
                  <th scope="col">State</th>
                  <th scope="col" className="num">Story rank</th>
                  <th scope="col" className="num">Stories</th>
                  <th scope="col" className="num">Per 1 million</th>
                  <th scope="col" className="num">Per person rank</th>
                  <th scope="col" className="num">Classroom</th>
                  <th scope="col" className="num">How to help</th>
                </tr>
              </thead>
              <tbody>
                {edition.states.map((state) => (
                  <StateRow key={state.code} state={state} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="index-note">
            A blank rank means no story, or no How to help link of the kind this column counts. Adding the story column can exceed the United States total, because a story can be listed in more than one state.{" "}
            <a href="#methodology">How the numbers are made</a>.
          </p>
        </section>

        <section aria-labelledby="your-state" style={{ marginTop: 56 }}>
          <div className="shead">
            <div>
              <h2 id="your-state">
                {edition.inProgress ? "Your state\u2019s good news this month" : `Your state\u2019s good news in ${edition.label}`}
              </h2>
              <p>Each link opens that state&apos;s stories. The number is this edition only.</p>
            </div>
            <Link className="more" href="/local">
              All states
              <svg className="ico" aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </Link>
          </div>
          <div className="state-index">
            {byName.map((state) => (
              <Link key={state.code} href={`/state/${state.slug}`} className={state.stories ? "has" : undefined}>
                <span>{state.name}</span>
                <span className="count">{state.stories ? `${state.stories} · ${state.rankLabel}` : "0"}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="index-split" style={{ marginTop: 56 }}>
          <section aria-labelledby="categories">
            <div className="shead">
              <div>
                <h2 id="categories">Categories</h2>
                <p>The section stored on each story. Every story has one.</p>
              </div>
            </div>
            <Bars rows={edition.categories.map((category) => ({ ...category, href: `/category/${category.slug}` }))} />
          </section>
          <section aria-labelledby="topics">
            <div className="shead">
              <div>
                <h2 id="topics">Topics</h2>
                <p>
                  {topics.length ? "The ten topics on the most stories this month. A story can carry more than one." : "No topic tags are on these stories."}{" "}
                  {edition.topics.length > topics.length ? "The CSV lists every topic with a story." : null}
                </p>
              </div>
            </div>
            {topics.length ? <Bars rows={topics} /> : null}
          </section>
        </div>

        <section aria-labelledby="help" style={{ marginTop: 56 }}>
          <div className="shead">
            <div>
              <h2 id="help">How to help links</h2>
              <p>
                {edition.helpLinkCount} distinct donate, volunteer, and thank {edition.helpLinkCount === 1 ? "link" : "links"} on stories this month.
                Learn-more links are not included. This is not a nonprofit census. The story file does not record nonprofit status.
              </p>
            </div>
            <Link className="more" href="/help">
              Ways to help
              <svg className="ico" aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </Link>
          </div>
          {helpLeaders.length ? (
            <ol className="index-rank-list">
              {helpLeaders.map((state) => (
                <li key={state.code}>
                  <a href={`#${state.slug}`}>{state.name}</a>
                  <span>
                    {state.helpLinks} {state.helpLinks === 1 ? "link" : "links"} · {state.helpRankLabel}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="index-note">No donate, volunteer, or thank link is on a story in this edition.</p>
          )}
        </section>

        <section aria-labelledby="world" style={{ marginTop: 56 }}>
          <div className="shead">
            <div>
              <h2 id="world">World stories</h2>
              <p>
                {edition.worldCount
                  ? `${edition.worldCount} ${storyWord(edition.worldCount)} from ${edition.countryCount} ${edition.countryCount === 1 ? "country" : "countries"} outside the United States.`
                  : "No story from outside the United States is in this edition."}
              </p>
            </div>
            <Link className="more" href="/world">
              World desk
              <svg className="ico" aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </Link>
          </div>
          {edition.countries.length ? (
            <div className="index-table-wrap">
              <table className="index-table">
                <caption>Stories from outside the United States in {edition.label}, by country.</caption>
                <thead>
                  <tr>
                    <th scope="col">Country</th>
                    <th scope="col" className="num">Rank</th>
                    <th scope="col" className="num">Stories</th>
                    <th scope="col" className="num">Classroom</th>
                  </tr>
                </thead>
                <tbody>
                  {edition.countries.map((country) => (
                    <tr key={country.code}>
                      <th scope="row">
                        <Link href={`/country/${country.slug}`}>{country.label}</Link>
                      </th>
                      <td className="num">{country.rankLabel}</td>
                      <td className="num">{country.count}</td>
                      <td className="num">{country.kidStories}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="classroom-box" aria-labelledby="classrooms" style={{ marginTop: 56 }}>
          <h2 id="classrooms">Classroom stories</h2>
          <p>
            {edition.kidCount
              ? `${edition.kidCount} ${storyWord(edition.kidCount)} ${edition.kidCount === 1 ? "is" : "are"} marked for a classroom read-aloud. ${edition.kidUsCount} ${edition.kidUsCount === 1 ? "is" : "are"} from the United States and ${edition.kidWorldCount} ${edition.kidWorldCount === 1 ? "is" : "are"} from outside it.`
              : "No classroom story is in this edition."}
          </p>
          {kidStates.length ? (
            <p className="link-pills">
              {kidStates.map((state) => (
                <Link key={state.code} href={`/kids/state/${state.slug}`}>
                  {state.name} · {state.kidStories}
                </Link>
              ))}
            </p>
          ) : null}
          <p style={{ marginTop: 12 }}>
            <Link className="more" href="/kids">
              Open the classroom section
              <svg className="ico" aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </Link>
          </p>
        </section>

        {edition.standouts.length ? (
          <section aria-labelledby="standouts" style={{ marginTop: 56 }}>
            <div className="shead">
              <div>
                <h2 id="standouts">Standout stories</h2>
                <p>{edition.standoutNote}</p>
              </div>
            </div>
            <div className="grid">
              {edition.standouts.map((story) => (
                <StoryCard key={story.slug} story={toCard(story)} />
              ))}
            </div>
          </section>
        ) : null}

        <section id="methodology" aria-labelledby="method-heading" style={{ marginTop: 56 }}>
          <h2 id="method-heading">Methodology</h2>
          <IndexMethodology />
        </section>

        <section id="cite" aria-labelledby="cite-heading" style={{ marginTop: 56 }}>
          <h2 id="cite-heading">Cite this</h2>
          <blockquote className="cite-box">
            <p>{edition.citation}</p>
          </blockquote>
          <div className="cite-actions">
            <CopyLink value={edition.citation} label="Copy citation" />
            <a className="btn btn-outline" href={edition.csvPath}>
              Download CSV
            </a>
          </div>
          <p className="index-note">
            Questions and corrections: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
          </p>
        </section>

        <EditionNav previous={previous} next={next} />
      </div>
    </div>
  );
}

function StateRow({ state }: { state: IndexStateRow }) {
  return (
    <tr id={state.slug}>
      <th scope="row">
        <Link href={`/state/${state.slug}`}>{state.name}</Link>
      </th>
      <td className="num">{state.rankLabel}</td>
      <td className="num">{state.stories}</td>
      <td className="num">{state.perMillionLabel}</td>
      <td className="num">{state.perMillionRankLabel}</td>
      <td className="num">{state.kidStories}</td>
      <td className="num">
        {state.helpLinks}
        {state.helpRank ? <span className="index-rank"> · {state.helpRankLabel}</span> : null}
      </td>
    </tr>
  );
}
