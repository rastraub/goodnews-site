import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryCard } from "@/components/story-card";
import {
  allCalendarDays,
  calendarIso,
  monthDayLabel,
  monthDaySlug,
  onThisDayPath,
  parseMonthDaySlug,
  shiftCalendarDay,
} from "@/lib/calendar-day";
import { openGraphImage } from "@/lib/feed-image";
import {
  getOnThisDay,
  onThisDayDescription,
  onThisDayJsonLd,
  onThisDayTitle,
  ON_THIS_DAY_INDEX_PATH,
  promptsFor,
  storiesForMonthDay,
} from "@/lib/on-this-day";
import { toCard } from "@/lib/present";
import { listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ monthDay: string }> };

export function generateStaticParams() {
  return allCalendarDays().map((day) => ({ monthDay: monthDaySlug(day.month, day.day) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { monthDay } = await params;
  const day = parseMonthDaySlug(monthDay);
  if (!day) return {};
  const stories = storiesForMonthDay(day.month, day.day);
  const image = stories[0];
  return {
    ...listingMeta({
      title: onThisDayTitle(day.month, day.day),
      description: onThisDayDescription(day.month, day.day),
      base: onThisDayPath(day.month, day.day),
      page: 1,
      total: 1,
      image: image ? openGraphImage(image) : undefined,
    }),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  };
}

export default async function OnThisDayPage({ params }: Props) {
  const { monthDay } = await params;
  const day = parseMonthDaySlug(monthDay);
  if (!day) notFound();
  const record = getOnThisDay(day.month, day.day);
  const entries = record?.entries ?? [];
  const stories = storiesForMonthDay(day.month, day.day);
  const prompts = promptsFor(day.month, day.day);
  const label = monthDayLabel(day.month, day.day);
  const title = onThisDayTitle(day.month, day.day);
  const previous = shiftCalendarDay(day.month, day.day, -1);
  const next = shiftCalendarDay(day.month, day.day, 1);
  const leapDay = day.month === 2 && day.day === 29;

  return (
    <div className="page-block">
      <JsonLd data={onThisDayJsonLd(day)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={ON_THIS_DAY_INDEX_PATH}>On this day</Link>
          <span aria-hidden="true">/</span>
          <span>{label}</span>
        </p>
        <p className="kicker">On this day</p>
        <h1>{title}.</h1>
        <p className="lede">
          Positive things that happened on {label}
          {entries.length ? `, with ${entries.length} verified ${entries.length === 1 ? "milestone" : "milestones"}` : ""}. Each milestone links to the source it was checked against.
          {leapDay ? " This date arrives in a leap year." : ""}
        </p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href={onThisDayPath(previous.month, previous.day)}>Previous day</Link>
          <Link href={ON_THIS_DAY_INDEX_PATH}>All days</Link>
          <Link href={onThisDayPath(next.month, next.day)}>Next day</Link>
          <Link href="/kids">For classrooms</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 8 }}>
        <section aria-labelledby="milestones">
          <div className="shead">
            <div>
              <h2 id="milestones">Verified milestones</h2>
              <p>Scientific firsts, civil-rights wins, conservation, medicine, kindness, and other good news. Checked against the linked source.</p>
            </div>
          </div>
          {entries.length ? (
            <ol className="otd-entries">
              {entries.map((entry, index) => (
                <li key={`${entry.year}-${entry.text.slice(0, 24)}`} id={`${calendarIso(entry.year, day.month, day.day)}-${index + 1}`}>
                  <p className="kicker">{entry.year}</p>
                  <p>{entry.text}</p>
                  <p className="otd-kid">
                    <b>For a read-aloud. </b>
                    {entry.kidLine}
                  </p>
                  <p className="otd-sources">
                    {entry.sources.map((source) => (
                      <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.name}
                      </a>
                    ))}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty">
              <h2>No verified milestone for this date yet.</h2>
              <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
                A milestone is added only when the year, a short account, and a link to a reputable source all check out. Archive stories for this date are below.
              </p>
            </div>
          )}
        </section>
        <section className="classroom-box" id="classroom" aria-labelledby="classroom-heading">
          <h2 id="classroom-heading">For the classroom</h2>
          <p>Two questions a teacher can use as a warm-up. This page is for an adult to read with a class.</p>
          <ol>
            {prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ol>
          <p>
            <Link href="/kids">Classroom stories</Link>
            {" · "}
            <Link href="/kids/print">Print the story of the day</Link>
          </p>
        </section>
        <section aria-labelledby="archive" style={{ marginTop: 56 }}>
          <div className="shead">
            <div>
              <h2 id="archive">From the archive</h2>
              <p>
                {stories.length
                  ? `${stories.length} ${stories.length === 1 ? "story" : "stories"} published on ${label} in any year.`
                  : `Stories published on ${label} will show up here. The archive is still young.`}
              </p>
            </div>
            <Link className="more" href="/stories">
              All stories
              <svg className="ico" aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
            </Link>
          </div>
          {stories.length ? (
            <div className="grid">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={toCard(story)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>No archive story for this date yet.</h2>
              <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
                When a story is published on {label}, it will be listed here with the milestones above.
              </p>
            </div>
          )}
        </section>
        <section className="side-card" style={{ marginTop: 28 }} aria-label="Share">
          <h2>Share this day</h2>
          <ShareButtons title={title} path={onThisDayPath(day.month, day.day)} />
        </section>
        <nav className="pager" aria-label="Days">
          <Link href={onThisDayPath(previous.month, previous.day)}>Previous day</Link>
          <Link href={ON_THIS_DAY_INDEX_PATH}>All days</Link>
          <Link href={onThisDayPath(next.month, next.day)}>Next day</Link>
        </nav>
      </div>
    </div>
  );
}
