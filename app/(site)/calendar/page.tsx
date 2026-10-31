import type { Metadata } from "next";
import Link from "next/link";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { CALENDAR_ICS_PATH, CALENDAR_PATH } from "@/lib/calendar-path";
import {
  CALENDAR_INDEX_DESCRIPTION,
  CALENDAR_INDEX_TITLE,
  formatObservanceWhen,
  getCalendarView,
  monthAnchor,
} from "@/lib/good-news-calendar";
import { placeLabel } from "@/lib/present";
import { listingJsonLd, pageAlternates, xHandle } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: CALENDAR_INDEX_TITLE,
  description: CALENDAR_INDEX_DESCRIPTION,
  authors: [{ name: siteConfig.editor.name, url: "/about#masthead" }],
  alternates: pageAlternates(CALENDAR_PATH),
  openGraph: {
    title: CALENDAR_INDEX_TITLE,
    description: CALENDAR_INDEX_DESCRIPTION,
    url: CALENDAR_PATH,
  },
  twitter: {
    card: "summary_large_image",
    site: xHandle(),
    title: CALENDAR_INDEX_TITLE,
    description: CALENDAR_INDEX_DESCRIPTION,
  },
};

export default function CalendarPage() {
  const view = getCalendarView();

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: CALENDAR_INDEX_TITLE,
          description: CALENDAR_INDEX_DESCRIPTION,
          path: CALENDAR_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: CALENDAR_INDEX_TITLE, path: CALENDAR_PATH },
          ],
          stories: [],
          items: view.upcoming.map((item) => ({ name: item.observance.name, path: item.path })),
          listLimit: 80,
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>{CALENDAR_INDEX_TITLE}</span>
        </p>
        <p className="kicker">Plan ahead</p>
        <h1>Good News Calendar.</h1>
        <p className="lede">
          Kindness days, awareness dates, and positive observances for the next 12 months, grouped by month. The clock
          is Mountain Time, America/Denver. Each date is paired with stories already in the archive, plus a free idea
          a teacher can use.
        </p>
        <p className="byline" style={{ marginTop: 18 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <a href={CALENDAR_ICS_PATH}>Download the calendar</a>
          <a href={CALENDAR_ICS_PATH}>Subscribe in a calendar app</a>
          <Link href="/kids">For classrooms</Link>
          <Link href="/kindness-challenge">Kindness Challenge</Link>
        </p>
        <p className="cal-fine">
          The download is an .ics file from this site. Paste the same link into a calendar app to subscribe. No account
          and no paid service.
        </p>
      </div>

      <div className="wrap">
        {view.months.map((month) => (
          <section key={month.key} className="cal-month" id={monthAnchor(`${month.key}-01`)} aria-labelledby={`h-${month.key}`}>
            <h2 id={`h-${month.key}`}>{month.label}</h2>
            <div className="cal-list">
              {month.items.map((item) => (
                <article key={item.observance.slug} className="cal-item" id={item.observance.slug}>
                  <div className="cal-meta">
                    <time className="cal-date" dateTime={item.start}>
                      {formatObservanceWhen(item.start, item.end)}
                    </time>
                    {item.observance.kidFriendly ? <span className="kid-mark">Kid-friendly</span> : null}
                  </div>
                  <h3>
                    <Link href={item.path}>{item.observance.name}</Link>
                  </h3>
                  <p>{item.observance.description}</p>
                  <p className="cal-class">
                    <b>Classroom idea.</b> {item.observance.classroom}
                  </p>
                  {item.hubs.length ? (
                    <p className="link-pills">
                      {item.hubs.map((hub) => (
                        <Link key={hub.id} href={hub.path}>
                          {hub.label}
                        </Link>
                      ))}
                    </p>
                  ) : null}
                  {item.stories.length ? (
                    <ul className="cal-stories">
                      {item.stories.map((story) => (
                        <li key={story.slug}>
                          <Link href={`/story/${story.slug}`}>{story.title}</Link>
                          <span>{placeLabel(story)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cal-note">No matching archive story yet. The date stays on the calendar.</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <EmailSignup id="calendar-signup" />
    </div>
  );
}
