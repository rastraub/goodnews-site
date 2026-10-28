import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CopyLink } from "@/components/copy-link";
import { JsonLd } from "@/components/json-ld";
import { PrintButton } from "@/app/kids/print-button";
import { openGraphImage } from "@/lib/feed-image";
import {
  MORNING_ANNOUNCEMENTS_PATH,
  announcementJsonLd,
  announcementPath,
  indexableAnnouncementDays,
  isWeekend,
  loadAnnouncementDays,
  previousSchoolDay,
  weekdayName,
  type AnnouncementDay,
} from "@/lib/morning-announcements";
import { listingMeta, pageAlternates } from "@/lib/seo";
import { formatLongDate, parseIsoDate } from "@/lib/weeks";
import { siteConfig } from "@/site.config";
import { TeacherAnnouncementSignup } from "../teacher-signup";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ date: string }> };

export function generateStaticParams() {
  return loadAnnouncementDays().map((day) => ({ date: day.date }));
}

function lookup(date: string): AnnouncementDay | undefined {
  return loadAnnouncementDays().find((day) => day.date === date);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!parseIsoDate(date)) return {};
  if (isWeekend(date)) permanentRedirect(announcementPath(previousSchoolDay(date)));
  const day = lookup(date);
  if (!day || day.kind === "weekend") return {};
  const title = `Morning announcements for ${formatLongDate(date)}`;
  if (day.kind === "thin") {
    return {
      title,
      description: `${formatLongDate(date)} does not have three kid-friendly stories ready for a school morning announcement.`,
      alternates: pageAlternates(day.path),
      robots: { index: false, follow: true },
    };
  }
  const image = day.script.stories.find((story) => story.image);
  return {
    ...listingMeta({
      title,
      description: `${day.script.readLabel} of kid-friendly good news for a school morning announcement on ${formatLongDate(date)}. Three stories, a kindness thought, and a sign-off.`,
      base: day.path,
      page: 1,
      total: 1,
      image: image?.image ? openGraphImage({ image: image.image, imageAlt: image.imageAlt || image.title }) : undefined,
    }),
    ...(day.script.indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function MorningAnnouncementPage({ params }: Props) {
  const { date } = await params;
  if (!parseIsoDate(date)) notFound();
  if (isWeekend(date)) permanentRedirect(announcementPath(previousSchoolDay(date)));
  const days = loadAnnouncementDays();
  const day = days.find((item) => item.date === date);
  if (!day || day.kind === "weekend") notFound();

  const schoolDays = days.filter((item) => item.kind !== "weekend");
  const index = schoolDays.findIndex((item) => item.date === date);
  const previous = index > 0 ? schoolDays[index - 1] : undefined;
  const next = index >= 0 && index < schoolDays.length - 1 ? schoolDays[index + 1] : undefined;
  const nearest = nearestScript(days, date);

  return (
    <div className="page-block">
      {day.kind === "script" ? <JsonLd data={announcementJsonLd(day.script)} /> : null}
      <div className="wrap page-hero print-sheet announce-sheet">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={MORNING_ANNOUNCEMENTS_PATH}>Morning announcements</Link>
          <span aria-hidden="true">/</span>
          <span>{formatLongDate(date)}</span>
        </p>
        <p className="kicker">For teachers · {weekdayName(date)}</p>
        <h1>Good news for {formatLongDate(date)}.</h1>
        {day.kind === "script" ? <Script day={day} /> : <Thin day={day} nearest={nearest} />}
        <nav className="pager no-print" aria-label="School days">
          {previous ? <Link href={previous.path}>Previous school day</Link> : <span className="muted">Previous school day</span>}
          <Link href={MORNING_ANNOUNCEMENTS_PATH}>All announcements</Link>
          {next ? <Link href={next.path}>Next school day</Link> : <span className="muted">Next school day</span>}
        </nav>
      </div>
      <TeacherAnnouncementSignup />
    </div>
  );
}

function nearestScript(days: AnnouncementDay[], date: string) {
  const scripts = indexableAnnouncementDays(days);
  const earlier = scripts.filter((item) => item.date < date);
  if (earlier.length) return earlier[earlier.length - 1];
  return scripts.find((item) => item.date > date);
}

function Script({ day }: { day: Extract<AnnouncementDay, { kind: "script" }> }) {
  const script = day.script;
  return (
    <>
      <p className="announce-meta">
        {script.readLabel} · {script.wordCount} words. For a teacher or a student announcer to read aloud.
      </p>
      <div className="announce-actions no-print">
        <CopyLink value={script.plainText} label="Copy script" />
        <PrintButton label="Print this script" />
      </div>
      <article className="announce-script" id="script">
        <p>{script.opening}</p>
        {script.stories.map((story) => (
          <p key={story.slug}>
            {story.lead}, in {story.place}:{" "}
            <Link href={`/story/${story.slug}`}>{story.blurb}</Link>{" "}
            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
              {story.sourceName}
            </a>{" "}
            reported it.
          </p>
        ))}
        {script.bridges.map((bridge) => (
          <p key={bridge}>{bridge}</p>
        ))}
        <p className="announce-kindness">{script.kindness}</p>
        <p className="announce-signoff">{script.signoff}</p>
      </article>
      <p className="teacher-note">
        {siteConfig.name} is published by {siteConfig.owner.name}. Free for schools to read with credit to {siteConfig.name}.
      </p>
    </>
  );
}

function Thin({
  day,
  nearest,
}: {
  day: Extract<AnnouncementDay, { kind: "thin" }>;
  nearest?: Extract<AnnouncementDay, { kind: "script" }>;
}) {
  return (
    <>
      <p className="lede">
        This school day does not have three kid-friendly stories that are ready for a morning announcement. We skip crime, violence, injury details, politics, and anything scary.
      </p>
      {day.links.length ? (
        <>
          <h2 className="announce-subhead">Stories from this day that are a fit</h2>
          <ul className="announce-list">
            {day.links.map((story) => (
              <li key={story.slug}>
                <Link href={`/story/${story.slug}`}>{story.title}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {nearest ? (
        <p className="link-pills">
          <Link href={nearest.path}>Open the script for {formatLongDate(nearest.date)}</Link>
        </p>
      ) : null}
    </>
  );
}
