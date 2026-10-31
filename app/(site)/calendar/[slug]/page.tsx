import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { CALENDAR_ICS_PATH, CALENDAR_PATH } from "@/lib/calendar-path";
import { openGraphImage } from "@/lib/feed-image";
import {
  CALENDAR_INDEX_TITLE,
  formatObservanceWhen,
  getObservancePage,
  listObservances,
  observanceJsonLd,
} from "@/lib/good-news-calendar";
import { toCard } from "@/lib/present";
import { pageAlternates, xHandle } from "@/lib/seo";
import { siteConfig } from "@/site.config";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listObservances().map((observance) => ({ slug: observance.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getObservancePage(slug);
  if (!page) return {};
  const image = page.stories[0] ? openGraphImage(page.stories[0]) : undefined;
  const title = page.observance.name;
  const description = page.observance.description;
  return {
    title,
    description,
    authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
    alternates: pageAlternates(page.path),
    robots: page.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: page.path,
      ...(image
        ? {
            images: [
              {
                url: image.url,
                alt: image.alt,
                type: image.type,
                ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: xHandle(),
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export default async function ObservancePage({ params }: Props) {
  const { slug } = await params;
  const page = getObservancePage(slug);
  if (!page) notFound();
  const { observance } = page;
  const when = formatObservanceWhen(page.start, page.end);

  return (
    <div className="page-block">
      <JsonLd data={observanceJsonLd(page)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={CALENDAR_PATH}>{CALENDAR_INDEX_TITLE}</Link>
          <span aria-hidden="true">/</span>
          <span>{observance.name}</span>
        </p>
        <div className="cal-meta">
          <p className="kicker">
            <time dateTime={page.start}>{when}</time>
          </p>
          {observance.kidFriendly ? <span className="kid-mark">Kid-friendly</span> : null}
        </div>
        <h1>{observance.name}</h1>
        <p className="lede">{observance.description}</p>
        <p className="lede" style={{ marginTop: 12 }}>
          The next date is {when}. Dates follow Mountain Time, America/Denver. Stories below are from the archive.
        </p>
        <p className="byline" style={{ marginTop: 18 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          {observance.infoUrl && observance.infoLabel ? (
            <a href={observance.infoUrl} target="_blank" rel="noopener noreferrer">
              {observance.infoLabel}
            </a>
          ) : null}
          {page.hubs.map((hub) => (
            <Link key={hub.id} href={hub.path}>
              {hub.label}
            </Link>
          ))}
          <a href={CALENDAR_ICS_PATH}>Add to your calendar</a>
          <Link href={CALENDAR_PATH}>All dates</Link>
          <Link href="/kids">For classrooms</Link>
        </p>
      </div>

      <div className="wrap">
        <section className="classroom-box" id="take-part">
          <h2>How to take part</h2>
          <p className="teacher-note">Free and safe. No fee, no student email, and no trip taken alone.</p>
          <ul>
            {observance.takePart.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>

        <section className="classroom-box" id="classroom">
          <h2>For classrooms</h2>
          <p className="teacher-note">A short prompt for a teacher to use with children. This page is for adults.</p>
          <p>{observance.classroom}</p>
          <p>
            More stories a teacher can read aloud are in the <Link href="/kids">Kids section</Link>.
          </p>
        </section>

        <h2 className="side-title" id="stories">
          Stories from the archive
        </h2>
        {page.stories.length ? (
          <>
            {page.stories.length < 2 ? (
              <p className="cal-note">The archive has one matching story so far.</p>
            ) : null}
            <div className="grid">
              {page.stories.map((story) => (
                <StoryCard key={story.slug} story={toCard(story)} />
              ))}
            </div>
          </>
        ) : (
          <div className="empty">
            <h2>No matching story yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              This date stays on the calendar. A matching story will show here when one is published.{" "}
              <Link href="/submit">Know one? Send a tip.</Link>
            </p>
          </div>
        )}
      </div>
      <EmailSignup id={`calendar-${observance.slug}`} />
    </div>
  );
}
