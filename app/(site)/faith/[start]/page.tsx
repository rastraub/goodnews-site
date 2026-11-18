import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyBlock } from "@/components/copy-block";
import { JsonLd } from "@/components/json-ld";
import { PrintButton } from "@/app/(site)/kids/print-button";
import {
  FAITH_FEED_PATH,
  FAITH_INDEX_PATH,
  FAITH_INDEX_TITLE,
  bulletinsToPrerender,
  faithCategoryLabel,
  type FaithBulletin,
} from "@/lib/faith";
import { openGraphImage } from "@/lib/feed-image";
import { placeLabel } from "@/lib/present";
import { faithJsonLd, listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return bulletinsToPrerender().map((bulletin) => ({ start: bulletin.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const bulletin = bulletinsToPrerender().find((item) => item.start === start);
  if (!bulletin) return {};
  return listingMeta({
    title: bulletin.title,
    description: bulletin.description,
    base: bulletin.path,
    page: 1,
    total: 1,
    feedPath: FAITH_FEED_PATH,
    image: openGraphImage(bulletin),
  });
}

function BulletinNav({ previous, next }: { previous?: FaithBulletin<Story>; next?: FaithBulletin<Story> }) {
  return (
    <nav className="pager no-print" aria-label="Faith bulletins">
      {previous ? <Link href={previous.path}>Previous week</Link> : <span className="muted">Previous week</span>}
      <Link href={FAITH_INDEX_PATH}>All weeks</Link>
      {next ? <Link href={next.path}>Next week</Link> : <span className="muted">Next week</span>}
    </nav>
  );
}

export default async function FaithBulletinPage({ params }: Props) {
  const { start } = await params;
  const bulletins = bulletinsToPrerender();
  const index = bulletins.findIndex((bulletin) => bulletin.start === start);
  if (index < 0) notFound();
  const bulletin = bulletins[index];
  const previous = index > 0 ? bulletins[index - 1] : undefined;
  const next = index < bulletins.length - 1 ? bulletins[index + 1] : undefined;
  const promptText = bulletin.prompts.map((prompt, promptIndex) => `${promptIndex + 1}. ${prompt}`).join("\n");

  return (
    <div className="page-block faith-page">
      <JsonLd
        data={faithJsonLd({
          name: bulletin.title,
          description: bulletin.description,
          path: bulletin.path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Faith communities", path: FAITH_INDEX_PATH },
            { name: bulletin.rangeLabel, path: bulletin.path },
          ],
          items: bulletin.stories.map((story) => ({ name: story.title, path: `/story/${story.slug}` })),
        })}
      />
      <article className="wrap page-hero">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={FAITH_INDEX_PATH}>Faith communities</Link>
          <span aria-hidden="true">/</span>
          <span>{bulletin.rangeLabel}</span>
        </p>
        <div className="no-print">
          <p className="kicker">{bulletin.inProgress ? "Bulletin pack · So far" : "Bulletin pack"}</p>
          <h1>{bulletin.heading}</h1>
          <p className="lede">{bulletin.intro}</p>
          <p className="byline">
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
            {" · "}
            Week of {bulletin.rangeLabel}
          </p>
          <p>
            Summaries are from {siteConfig.name}. The reporting belongs to the newsrooms linked on each line. Paste either version into a bulletin. The half-page insert below is the one to print.
          </p>
          <div className="pack-actions">
            <PrintButton label="Print the half-page insert" />
          </div>
          <section aria-labelledby="bulletin-copy">
            <h2 id="bulletin-copy">Copy for a bulletin</h2>
            <h3>Plain text</h3>
            <CopyBlock value={bulletin.plainText} label="Copy plain text" />
            <h3>Simple HTML</h3>
            <CopyBlock value={bulletin.html} label="Copy HTML" />
          </section>
        </div>

        <section className="faith-insert" aria-label="Half-page bulletin insert">
          <p className="kicker">Half-page insert</p>
          <h2>
            {FAITH_INDEX_TITLE}
            <span className="faith-range">Week of {bulletin.rangeLabel}</span>
          </h2>
          <ol className="faith-lines">
            {bulletin.items.map((item) => (
              <li key={item.slug}>
                {item.sentence}{" "}
                <span className="print-source">
                  <a href={item.sourceUrl}>{item.sourceName}</a>
                  {" · "}
                  <a href={item.storyUrl}>{siteConfig.name}</a>
                </span>
              </li>
            ))}
          </ol>
          <h3>Service idea of the week</h3>
          <p>
            {bulletin.service.text}{" "}
            <span className="print-source">
              <a href={bulletin.service.href}>{bulletin.service.linkLabel}</a>
            </span>
          </p>
          <h3>A question to share</h3>
          <ul className="faith-prompts">
            {bulletin.prompts.slice(0, 2).map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
          <p className="print-source faith-insert-foot">
            {siteConfig.name} · {siteConfig.url}
            {bulletin.path} · By {siteConfig.editor.name}
          </p>
        </section>

        <div className="no-print">
          <section aria-labelledby="service-idea">
            <h2 id="service-idea">Service idea of the week</h2>
            <p>{bulletin.service.text}</p>
            <p>
              Tied to the story from {bulletin.service.place}.{" "}
              <a href={bulletin.service.href}>{bulletin.service.linkLabel}</a>
              {" · "}
              <Link href={`/story/${bulletin.service.slug}`}>Full story</Link>
            </p>
            <CopyBlock value={bulletin.service.text} label="Copy the service idea" />
          </section>
          <section aria-labelledby="discussion">
            <h2 id="discussion">Small-group and youth prompts</h2>
            <p>Neutral on purpose, so any tradition can use them. There is no religious content in the questions.</p>
            <ol className="questions">
              {bulletin.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ol>
            <CopyBlock value={promptText} label="Copy the prompts" />
          </section>
          <section aria-labelledby="stories-this-week">
            <h2 id="stories-this-week">Stories in this pack</h2>
            <ul className="faith-story-list">
              {bulletin.stories.map((story) => (
                <li key={story.slug}>
                  <Link href={`/story/${story.slug}`}>{story.title}</Link>
                  <span>
                    {faithCategoryLabel(story.category)} · {placeLabel(story)} · {story.sourceName}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <BulletinNav previous={previous} next={next} />
        </div>
      </article>
    </div>
  );
}
