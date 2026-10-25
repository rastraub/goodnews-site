import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { allCalendarDays, monthDayLabel, mountainIsoDay, onThisDayPath, MONTHS } from "@/lib/calendar-day";
import {
  getOnThisDay,
  onThisDayIndexJsonLd,
  ON_THIS_DAY_INDEX_PATH,
  ON_THIS_DAY_TODAY_PATH,
  storiesForMonthDay,
} from "@/lib/on-this-day";
import { listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Good news on this day";

function indexDescription(): string {
  return `A page for every calendar day. Each one pairs verified good-news milestones with ${siteConfig.name} stories published on that date. Open today in Mountain Time, or pick a day.`;
}

export function generateMetadata(): Metadata {
  return listingMeta({
    title: TITLE,
    description: indexDescription(),
    base: ON_THIS_DAY_INDEX_PATH,
    page: 1,
    total: 1,
  });
}

export default function OnThisDayIndexPage() {
  const description = indexDescription();
  const today = mountainIsoDay();
  const todayParts = today.slice(5);
  const days = allCalendarDays();

  return (
    <div className="page-block">
      <JsonLd data={onThisDayIndexJsonLd(description)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <span>On this day</span>
        </p>
        <p className="kicker">Evergreen</p>
        <h1>Good news on this day.</h1>
        <p className="lede">{description}</p>
        <p className="byline" style={{ marginTop: 14 }}>
          By <Link href="/about#masthead">{siteConfig.editor.name}</Link>
        </p>
        <p className="link-pills">
          <Link href={ON_THIS_DAY_TODAY_PATH}>Open today</Link>
          <Link href="/kids">For classrooms</Link>
          <Link href="/stories">All stories</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <p className="otd-legend">
          <span className="swatch has" /> Has milestones
          <span className="swatch archive" /> Has archive stories
          <span className="swatch today" /> Today in Mountain Time
        </p>
        <div className="otd-months">
          {MONTHS.map((month, monthIndex) => {
            const monthNumber = monthIndex + 1;
            const monthDays = days.filter((day) => day.month === monthNumber);
            return (
              <section key={month.slug} aria-labelledby={`month-${month.slug}`}>
                <h2 id={`month-${month.slug}`}>{month.name}</h2>
                <div className="otd-days">
                  {monthDays.map((day) => {
                    const seeded = Boolean(getOnThisDay(day.month, day.day));
                    const archived = storiesForMonthDay(day.month, day.day).length > 0;
                    const isToday = todayParts === `${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
                    const className = [seeded ? "has" : "", archived ? "archive" : "", isToday ? "today" : ""].filter(Boolean).join(" ");
                    return (
                      <Link
                        key={day.day}
                        href={onThisDayPath(day.month, day.day)}
                        className={className || undefined}
                        aria-label={monthDayLabel(day.month, day.day)}
                      >
                        {day.day}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <p className="empty-note">February 29 is listed because it arrives in a leap year. A day without a milestone still has a page.</p>
      </div>
    </div>
  );
}
