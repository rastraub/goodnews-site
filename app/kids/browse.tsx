import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { getKidStories, kidPlaces } from "@/lib/kids";
import { pageCount, pageSlice } from "@/lib/paging";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";

const TITLE = "Good news for kids";
const DESCRIPTION =
  "Classroom stories for teachers: a short summary and a few discussion questions. Written for an adult to read with a class.";

export function kidsPageMetadata(page: number): Metadata {
  const stories = getKidStories();
  if (page > pageCount(stories.length)) return {};
  const image = stories[0];
  return listingMeta({
    title: TITLE,
    description: DESCRIPTION,
    base: "/kids",
    page,
    total: stories.length,
    feedPath: "/kids/rss.xml",
    image: image ? openGraphImage(image) : undefined,
  });
}

export function KidsBrowse({ page }: { page: number }) {
  const stories = getKidStories();
  if (page > pageCount(stories.length)) notFound();
  const places = kidPlaces(stories);
  const path = page <= 1 ? "/kids" : `/kids/page/${page}`;

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          path,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "For classrooms", path: "/kids" },
          ],
          stories: pageSlice(stories, page),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>For classrooms</span>
        </p>
        <p className="kicker">For teachers</p>
        <h1>Good news for kids.</h1>
        <p className="lede">
          {stories.length
            ? `${stories.length} verified ${stories.length === 1 ? "story" : "stories"} a teacher can read with a class. Each one has a short summary and discussion questions. This page is for adults.`
            : "Classroom stories will show up here when a report is a good fit to read aloud. This page is for teachers and other adults."}
        </p>
        <p className="link-pills">
          <Link href="/kids/print">Print the story of the day</Link>
          <Link href="/morning-announcements">Morning announcements</Link>
          <a href="#teachers">Teacher email</a>
        </p>
        {places.length ? (
          <div className="chips">
            {places.map((place) => (
              <Link key={place.path} href={place.path} className="chip">
                {place.name}
                <b>{place.count}</b>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {stories.length ? (
          <StoryGrid stories={stories} page={page} base="/kids" />
        ) : (
          <div className="empty">
            <h2>No classroom story yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>
              The morning edition adds a kid-friendly story when one is appropriate. Nothing here is written for a child to sign up.
            </p>
          </div>
        )}
      </div>
      <section className="page-block no-print" id="teachers" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>Teacher email</h2>
          <p>
            This list is for adults and educators. It sends a classroom story to your own email. Do not enter a student&apos;s address. We do not ask for a child&apos;s name, age, or school.
          </p>
          <EmailSignup variant="inline" interest="teachers" id="teacher-email" />
        </div>
      </section>
    </div>
  );
}
