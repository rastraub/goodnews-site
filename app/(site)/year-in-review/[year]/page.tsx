import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { StoryImage } from "@/components/story-image";
import { UsMap } from "@/components/us-map";
import { VerifiedBadge } from "@/components/verified-badge";
import { getCategory } from "@/lib/categories";
import { countryName } from "@/lib/countries";
import { FIRST_RESPONDERS_DAY_PATH } from "@/lib/first-responders-day";
import { formatLongDate, formatStoryDate } from "@/lib/format";
import { placeLabel } from "@/lib/present";
import { pageAlternates } from "@/lib/seo";
import type { Story } from "@/lib/stories";
import {
  getYearInReview,
  isYearInReviewEdition,
  YEAR_IN_REVIEW_EDITIONS,
  YEAR_IN_REVIEW_INDEX_PATH,
  yearInReviewDescription,
  yearInReviewEdition,
  yearInReviewIndexable,
  yearInReviewJsonLd,
  yearInReviewPath,
  yearInReviewRobots,
  yearInReviewShare,
  yearInReviewTitle,
  type YearInReviewNumbers,
} from "@/lib/year-in-review";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

type Params = { year: string };
type Query = { preview?: string | string[] };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

export function generateStaticParams() {
  return YEAR_IN_REVIEW_EDITIONS.map((edition) => ({ year: String(edition.year) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { year: raw } = await params;
  const year = Number(raw);
  if (!isYearInReviewEdition(year)) return { robots: { index: false, follow: false } };
  const review = getYearInReview(year);
  const title = yearInReviewTitle(year);
  const description = yearInReviewDescription(review);
  const path = yearInReviewPath(year);
  return {
    title,
    description,
    alternates: pageAlternates(path),
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
    robots: yearInReviewRobots(year),
    openGraph: {
      url: path,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function StoryTile({
  story,
  kicker,
  pinned,
  priority = false,
  id,
  readAloud = false,
}: {
  story: Story;
  kicker: string;
  pinned: boolean;
  priority?: boolean;
  id?: string;
  readAloud?: boolean;
}) {
  const category = getCategory(story.category);
  return (
    <article className="card" id={id}>
      <Link href={`/story/${story.slug}`} className="ph">
        <StoryImage
          src={story.image}
          alt={story.imageAlt}
          sizes="(max-width: 700px) 100vw, 25vw"
          priority={priority}
          treatment={story.imageTreatment}
        />
        <span className="cat" style={{ color: category?.color ?? "#24537F" }}>
          {kicker}
        </span>
      </Link>
      <div className="body">
        <div className="place">
          {placeLabel(story)}
          {pinned ? " · Pinned" : ""}
        </div>
        <h3>
          <Link href={`/story/${story.slug}`}>{story.title}</Link>
        </h3>
        <p>{story.dek}</p>
        {readAloud && story.kidSummary ? (
          <p className="gn-kid">
            <span>Read aloud</span>
            {story.kidSummary}
          </p>
        ) : null}
        <VerifiedBadge source={story.sourceName} />
      </div>
    </article>
  );
}

function numberCards(numbers: YearInReviewNumbers): { label: string; value: number }[] {
  const items = [
    { label: "Stories", value: numbers.stories },
    { label: "States and D.C.", value: numbers.places },
    { label: "Countries", value: numbers.countries },
    { label: "Months", value: numbers.months },
  ];
  if (numbers.classroom > 0) items.push({ label: "Classroom stories", value: numbers.classroom });
  if (numbers.world > 0) items.push({ label: "Stories outside the U.S.", value: numbers.world });
  return items;
}

function GapCard({ title, text, href, label }: { title: string; text: string; href: string; label: string }) {
  return (
    <article className="card fr-gap">
      <div className="body">
        <h3>{title}</h3>
        <p>{text}</p>
        <Link className="btn btn-ink" href={href}>
          {label}
        </Link>
      </div>
    </article>
  );
}

export default async function YearInReviewPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}) {
  const { year: raw } = await params;
  const year = Number(raw);
  if (!isYearInReviewEdition(year)) notFound();
  const edition = yearInReviewEdition(year);
  if (!edition) notFound();

  const query = await searchParams;
  const preview = first(query.preview) === "1";
  const indexable = yearInReviewIndexable(year);
  const review = getYearInReview(year);
  const lead = review.imageStory?.slug;
  const stats = numberCards(review.numbers);

  return (
    <>
      <div className="page-block">
        <JsonLd data={yearInReviewJsonLd(review)} />
        <div className="wrap page-hero yir-screen">
          <p className="crumbs">
            <Link href="/">Today</Link>
            <span aria-hidden="true">/</span>
            <Link href={YEAR_IN_REVIEW_INDEX_PATH}>Year in Review</Link>
            <span aria-hidden="true">/</span>
            <span>{year}</span>
          </p>
          <p className="kicker">Good news {year}</p>
          <h1>{yearInReviewTitle(year)}</h1>
          <p className="lede">
            The best good news stories of {year}, chosen from reports already in the archive. Positive news this year,
            one story for each month and state the archive can match, plus the world, classrooms, first responders, and
            animals. Each story is checked and linked to the original source. Political, use-of-force, and shooting
            stories stay off.
          </p>
          <p className="byline">
            By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
          </p>
          {indexable ? null : (
            <p className="yir-note">
              Preview. This page is readable now. Search engines are asked to skip it until {formatLongDate(edition.publishOn)}.
              It stays out of the sitemap and the navigation until then.{" "}
              {preview ? (
                "You opened the preview link."
              ) : (
                <Link href={`${yearInReviewPath(year)}?preview=1`}>Open the preview link</Link>
              )}
            </p>
          )}
          <p className="link-pills">
            <a href="#numbers">By the numbers</a>
            <a href="#months">Months</a>
            <a href="#states">States</a>
            <a href="#world">World</a>
            <a href="#classroom">Classrooms</a>
            <a href="#responders">First responders</a>
            <a href="#animals">Animals and nature</a>
            <a href="#share">Share</a>
          </p>
        </div>

        <div className="wrap yir-screen" id="numbers">
          <h2 className="side-title">By the numbers</h2>
          <p className="lede">
            Counted from published {year} stories that clear the content filter. A month with no qualifying story is not
            in the month count, and it is not given a stand-in story.
          </p>
          <dl className="yir-numbers">
            {stats.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="wrap yir-screen" id="months">
          <h2 className="side-title">Best story of each month</h2>
          <p className="lede">
            {review.months.length
              ? `${review.months.map((month) => month.name).join(", ")} ${review.months.length === 1 ? "is" : "are"} the ${review.months.length === 1 ? "month" : "months"} with a qualifying story. Months with none are left off.`
              : `No qualifying ${year} story is in the archive yet.`}
          </p>
          {review.months.length ? (
            <div className="grid">
              {review.months.map((month) => (
                <StoryTile
                  key={month.key}
                  story={month.story}
                  kicker={month.name}
                  pinned={month.pinned}
                  priority={month.story.slug === lead}
                />
              ))}
            </div>
          ) : (
            <GapCard
              title={`No ${year} stories yet`}
              text="This page fills in as the daily run publishes stories. It will not invent a month."
              href="/stories"
              label="Browse the archive"
            />
          )}
        </div>

        <div className="wrap yir-screen" id="states">
          <h2 className="side-title">Best story from each state</h2>
          <p className="lede">
            One story for each state the {year} archive can match, including Washington, D.C. An open state links to
            that state&apos;s hub. {review.covered.length} of {review.slots.length} places have a story.
          </p>
          <div className="fr-map-wrap">
            <UsMap
              highlighted={review.covered.map((slot) => slot.state.code)}
              legend={[{ swatch: "#FFD36E", label: "Story on this page" }]}
              labels={false}
            />
          </div>
          <nav className="state-index" aria-label="States">
            {review.slots.map((slot) => (
              <a key={slot.state.code} href={`#yir-${slot.state.slug}`} className={slot.story ? "has" : undefined}>
                <span>{slot.state.name}</span>
                {slot.story ? <span className="count">Story</span> : <span className="open">Open</span>}
              </a>
            ))}
          </nav>
          <div className="grid">
            {review.slots.map((slot) => {
              const story = slot.story;
              if (!story) {
                return (
                  <article key={slot.state.code} id={`yir-${slot.state.slug}`} className="card fr-gap">
                    <div className="body">
                      <div className="place">{slot.state.name}</div>
                      <h3>No {year} story yet</h3>
                      <p>The archive does not have a qualifying {year} story filed in {slot.state.name}.</p>
                      <Link className="btn btn-ink" href={`/state/${slot.state.slug}`}>
                        {slot.state.name} stories
                      </Link>
                    </div>
                  </article>
                );
              }
              return (
                <StoryTile
                  key={slot.state.code}
                  id={`yir-${slot.state.slug}`}
                  story={story}
                  kicker={slot.state.name}
                  pinned={slot.pinned}
                  priority={story.slug === lead}
                />
              );
            })}
          </div>
        </div>

        <div className="wrap yir-screen" id="world">
          <h2 className="side-title">Around the world</h2>
          <p className="lede">One strong {year} story from each country outside the United States that already has one.</p>
          {review.world.length ? (
            <div className="grid">
              {review.world.map((item) => (
                <StoryTile
                  key={item.story.slug}
                  story={item.story}
                  kicker={countryName(item.story.country)}
                  pinned={item.pinned}
                  priority={item.story.slug === lead}
                />
              ))}
            </div>
          ) : (
            <GapCard
              title="No world story yet"
              text={`The ${year} archive does not have a qualifying story filed outside the United States.`}
              href="/world"
              label="World stories"
            />
          )}
        </div>

        <div className="wrap yir-screen" id="responders">
          <h2 className="side-title">First responders</h2>
          <p className="lede">
            Rescues and kindness from firefighters, EMS, dispatch, search and rescue, and police. Use-of-force and
            shooting stories stay off.
          </p>
          {review.firstResponders.length ? (
            <div className="grid">
              {review.firstResponders.map((item) => (
                <StoryTile
                  key={item.story.slug}
                  story={item.story}
                  kicker="First responders"
                  pinned={item.pinned}
                />
              ))}
            </div>
          ) : (
            <GapCard
              title="No first responder story yet"
              text={`No qualifying ${year} first responder story clears this page.`}
              href={FIRST_RESPONDERS_DAY_PATH}
              label="First Responders Day"
            />
          )}
        </div>

        <div className="wrap yir-screen" id="animals">
          <h2 className="side-title">Animals and nature</h2>
          <p className="lede">Rescues, wildlife, parks, trees, rivers, and the people who look after them.</p>
          {review.animals.length ? (
            <div className="grid">
              {review.animals.map((item) => (
                <StoryTile
                  key={item.story.slug}
                  story={item.story}
                  kicker="Animals and nature"
                  pinned={item.pinned}
                />
              ))}
            </div>
          ) : (
            <GapCard
              title="No animal or nature story yet"
              text={`No qualifying ${year} animal or nature story clears this page.`}
              href="/category/animals"
              label="Animal stories"
            />
          )}
        </div>

        <div className="wrap print-sheet yir-print" id="classroom">
          <h1 className="print-only">{yearInReviewTitle(year)}</h1>
          <p className="kicker">For teachers · {year}</p>
          <h2 className="side-title">For classrooms</h2>
          <p className="teacher-note">
            Print this sheet and read it with a class. These are a short set of classroom stories from the archive, not
            every classroom story in the count above. A story stays off this sheet when it does not clear the kid-safe
            filter.
          </p>
          <dl className="yir-numbers">
            {stats.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          {review.kids.length ? (
            review.kids.map((item) => {
              const story = item.story;
              return (
                <article key={story.slug} className="yir-class-story">
                  <h3>
                    <Link href={`/story/${story.slug}`}>{story.title}</Link>
                  </h3>
                  <p className="teacher-note">
                    {placeLabel(story)} · {formatStoryDate(story.date)}
                    {item.pinned ? " · Pinned" : ""}
                  </p>
                  {story.kidSummary ? <p className="read-aloud">{story.kidSummary}</p> : null}
                  {story.kidQuestions?.length ? (
                    <ol className="questions">
                      {story.kidQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ol>
                  ) : null}
                  <p className="print-source">
                    Source: <a href={story.sourceUrl}>{story.sourceName}</a>
                    {" · "}
                    <a href={`${siteConfig.url}/story/${story.slug}`}>Full story</a>
                  </p>
                </article>
              );
            })
          ) : (
            <GapCard
              title="No classroom story yet"
              text={`No qualifying ${year} story clears the classroom filter. The daily story of the day is still available to print.`}
              href="/kids/print"
              label="Story of the Day"
            />
          )}
          <div className="print-actions no-print">
            <PrintButton label="Print the classroom sheet" />
            <Link href="/kids">All classroom stories</Link>
            <Link href="/kids#teachers">Teacher email</Link>
            <Link href="/classroom">Good News Friday</Link>
          </div>
        </div>

        <div className="wrap yir-screen" id="share">
          <h2 className="side-title">Share the year</h2>
          <p className="lede">{yearInReviewShare(year)}</p>
          <ShareButtons title={yearInReviewTitle(year)} path={yearInReviewPath(year)} text={yearInReviewShare(year)} />
        </div>
      </div>
      <div className="yir-screen">
        <EmailSignup id="year-in-review-email" />
      </div>
    </>
  );
}
