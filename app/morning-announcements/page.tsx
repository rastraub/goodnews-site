import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import {
  MORNING_ANNOUNCEMENTS_PATH,
  featuredSchoolDate,
  indexableAnnouncementDays,
  loadAnnouncementDays,
  weekdayName,
  type AnnouncementDay,
} from "@/lib/morning-announcements";
import { formatLongDate, mountainDay } from "@/lib/weeks";
import { siteConfig } from "@/site.config";
import { TeacherAnnouncementSignup } from "./teacher-signup";

export const dynamic = "force-static";

const TITLE = "Good News Morning Announcements";

function indexDescription(): string {
  return `A ready-to-read good-news script for school morning announcements. About a minute, three kid-friendly stories, and free for teachers to use with credit to ${siteConfig.name}.`;
}

function dayNote(day: AnnouncementDay): string {
  if (day.kind === "script") return `${day.script.wordCount} words · ${day.script.readLabel}`;
  if (day.kind === "thin") return "Not enough kid-friendly stories for a full script";
  return "Weekend";
}

export function generateMetadata(): Metadata {
  const days = loadAnnouncementDays();
  const indexable = indexableAnnouncementDays(days);
  const featured = indexable[indexable.length - 1];
  const image = featured?.script.stories[0];
  return listingMeta({
    title: TITLE,
    description: indexDescription(),
    base: MORNING_ANNOUNCEMENTS_PATH,
    page: 1,
    total: 1,
    image: image?.image ? openGraphImage({ image: image.image, imageAlt: image.imageAlt || image.title }) : undefined,
  });
}

export default function MorningAnnouncementsIndex() {
  const today = mountainDay();
  const days = loadAnnouncementDays(today);
  const featuredDate = featuredSchoolDate(today);
  const featured = days.find((day) => day.date === featuredDate);
  const recent = days.filter((day) => day.kind !== "weekend" && day.date <= today).slice(-15).reverse();
  const indexable = indexableAnnouncementDays(days).slice().reverse();
  const description = indexDescription();

  return (
    <div className="page-block">
      <JsonLd
        data={listingJsonLd({
          name: TITLE,
          description,
          path: MORNING_ANNOUNCEMENTS_PATH,
          crumbs: [
            { name: "Today", path: "/" },
            { name: "Morning announcements", path: MORNING_ANNOUNCEMENTS_PATH },
          ],
          stories: [],
          items: indexable.map((day) => ({
            name: `Morning announcements for ${formatLongDate(day.date)}`,
            path: day.path,
          })),
        })}
      />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>Morning announcements</span>
        </p>
        <p className="kicker">For teachers · Mountain Time</p>
        <h1>Good news morning announcements.</h1>
        <p className="lede">{description}</p>
        <p className="link-pills">
          <Link href="/kids">Classroom stories</Link>
          <Link href="/kids/print">Story of the day</Link>
          <a href="#how-to">How to use this</a>
        </p>
        {featured && featured.kind !== "weekend" ? (
          <Link href={featured.path} className="announce-today">
            <span className="kicker">{featured.date === today ? "Today" : "Latest school day"}</span>
            <h2>
              {weekdayName(featured.date)}, {formatLongDate(featured.date)}
            </h2>
            <p>{dayNote(featured)}</p>
          </Link>
        ) : null}
        {featured && featured.date !== today ? (
          <p className="teacher-note" style={{ marginTop: 12 }}>
            Saturday and Sunday are not school days. This link opens Friday&apos;s script.
          </p>
        ) : null}
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <h2 className="announce-subhead">Recent school days</h2>
        {recent.length ? (
          <ul className="announce-list">
            {recent.map((day) => (
              <li key={day.date}>
                <Link href={day.path}>
                  <span className="kicker">{weekdayName(day.date)}</span>
                  <strong>{formatLongDate(day.date)}</strong>
                  <span>{dayNote(day)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <h2>No school-day script yet.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>A script appears when a weekday has three kid-friendly stories.</p>
          </div>
        )}
      </div>
      <section className="page-block" id="how-to" style={{ paddingBottom: 0 }}>
        <div className="wrap prose-page">
          <h2>How to use this at school</h2>
          <ol>
            <li>Open today&apos;s script. The date follows Mountain Time, the same clock as the morning edition.</li>
            <li>Read it yourself, or ask a student announcer to read it. It is written for about a minute.</li>
            <li>Print the page, or copy the script into your announcements notes.</li>
            <li>Please credit {siteConfig.name}. Each story links to the full report and names the original newsroom.</li>
            <li>Saturday and Sunday open the previous Friday. Those days are left off this list.</li>
          </ol>
          <p>
            Stories are chosen from that day&apos;s kid-friendly reports. Anything with crime, violence, injury details, politics, or anything scary is left out. {siteConfig.name} is published by {siteConfig.owner.name}.
          </p>
        </div>
      </section>
      <TeacherAnnouncementSignup />
    </div>
  );
}
