/**
 * Good News Calendar. Observances live in data/good-news-calendar.ts.
 * "Today" is the America/Denver calendar day, the same clock as the edition.
 * Story matches come from the published archive. This file does not invent any.
 */
import { z } from "zod";
import { OBSERVANCES } from "@/data/good-news-calendar";
import { CALENDAR_HUBS, CALENDAR_ICS_PATH, CALENDAR_PATH, type CalendarHubId } from "@/lib/calendar-path";
import { calendarIso, monthName, mountainIsoDay } from "@/lib/calendar-day";
import { formatLongDate } from "@/lib/format";
import { loadFirstRespondersEditorConfig, storyQualifies } from "@/lib/first-responders-day";
import { absoluteUrl, publishedIso } from "@/lib/seo";
import { getPublishedStories, type Story } from "@/lib/stories";
import { isTag } from "@/lib/tags";
import { siteConfig } from "@/site.config";

export const CALENDAR_INDEX_TITLE = "Good News Calendar";

export const CALENDAR_INDEX_DESCRIPTION =
  "Upcoming kindness days, awareness dates, and positive observances, each paired with stories already in the archive. Dates follow America/Denver.";

export const MIN_CALENDAR_STORIES = 2;
export const CALENDAR_STORY_LIMIT = 4;
export const CALENDAR_WINDOW_MONTHS = 12;
export const CALENDAR_COVERAGE_DAYS = 60;
export const CALENDAR_PREVIEW_COUNT = 3;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const weekdaySchema = z.enum(WEEKDAYS);

const ruleSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("fixed"),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
      endMonth: z.number().int().min(1).max(12).optional(),
      endDay: z.number().int().min(1).max(31).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("nthWeekday"),
      month: z.number().int().min(1).max(12),
      weekday: weekdaySchema,
      n: z.number().int().min(1).max(5),
      days: z.number().int().min(1).max(31).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("lastWeekday"),
      month: z.number().int().min(1).max(12),
      weekday: weekdaySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("nthWeekdayOffset"),
      month: z.number().int().min(1).max(12),
      weekday: weekdaySchema,
      n: z.number().int().min(1).max(5),
      offset: z.number().int().min(-21).max(21),
      days: z.number().int().min(1).max(31).optional(),
    })
    .strict(),
]);

const observanceSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().min(20).max(280),
    rule: ruleSchema,
    tags: z.array(z.string().trim().min(2)).min(1).max(6),
    keywords: z.array(z.string().trim().min(3).max(40)).max(8).optional().default([]),
    kidFriendly: z.boolean(),
    classroom: z.string().trim().min(20).max(420),
    takePart: z.array(z.string().trim().min(10).max(280)).min(2).max(4),
    infoUrl: z
      .string()
      .url()
      .refine((url) => url.startsWith("https://"), "Info links must use https")
      .optional(),
    infoLabel: z.string().trim().min(3).max(80).optional(),
    hubs: z.array(z.string()).max(3).optional().default([]),
    storyFilter: z.literal("first-responders").optional(),
  })
  .strict();

export type ObservanceRule = z.infer<typeof ruleSchema>;

export type Observance = {
  slug: string;
  name: string;
  description: string;
  rule: ObservanceRule;
  tags: string[];
  keywords: string[];
  kidFriendly: boolean;
  classroom: string;
  takePart: string[];
  infoUrl?: string;
  infoLabel?: string;
  hubs: CalendarHubId[];
  storyFilter?: "first-responders";
};

export type CalendarSpan = { start: string; end: string };

export type CalendarHubLink = { id: CalendarHubId; path: string; label: string };

export type CalendarOccurrence = {
  observance: Observance;
  start: string;
  end: string;
  path: string;
  stories: Story[];
  indexable: boolean;
  hubs: CalendarHubLink[];
  /** Newest selected story date, when the page has at least one. */
  latest?: string;
};

export type CalendarMonthGroup = {
  key: string;
  label: string;
  items: CalendarOccurrence[];
};

export type CalendarView = {
  today: string;
  windowEnd: string;
  upcoming: CalendarOccurrence[];
  months: CalendarMonthGroup[];
  bySlug: Map<string, CalendarOccurrence>;
};

const HUB_IDS = new Set<string>(Object.keys(CALENDAR_HUBS));

const COPY_BLOCK = /\b(election|elections|partisan|republican|democrat|killed|murder(?:ed|s)?|suicide|bomb(?:ing|s)?)\b/i;

const SPORTS_VETERAN = /\b(?:nba|nfl|mlb|nhl|wnba|mls)\b/i;

function daysInYearMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return calendarIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addIsoMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + months, 1));
  const nextYear = cursor.getUTCFullYear();
  const nextMonth = cursor.getUTCMonth() + 1;
  const capped = Math.min(day, daysInYearMonth(nextYear, nextMonth));
  return calendarIso(nextYear, nextMonth, capped);
}

function weekdayNumber(name: (typeof WEEKDAYS)[number]): number {
  return WEEKDAYS.indexOf(name);
}

function nthWeekday(year: number, month: number, weekday: number, n: number): number | undefined {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  if (day > daysInYearMonth(year, month)) return undefined;
  return day;
}

function lastWeekday(year: number, month: number, weekday: number): number {
  const count = daysInYearMonth(year, month);
  const last = new Date(Date.UTC(year, month - 1, count)).getUTCDay();
  return count - ((last - weekday + 7) % 7);
}

function spanFrom(start: string, days: number): CalendarSpan {
  return { start, end: addIsoDays(start, days - 1) };
}

/** The observance as it falls in `year` (the year of the anchor month). */
export function resolveRule(rule: ObservanceRule, year: number): CalendarSpan | undefined {
  if (rule.type === "fixed") {
    const endMonth = rule.endMonth ?? rule.month;
    const endDay = rule.endDay ?? rule.day;
    if (rule.day > daysInYearMonth(year, rule.month)) return undefined;
    if (endDay > daysInYearMonth(year, endMonth)) return undefined;
    const start = calendarIso(year, rule.month, rule.day);
    const end = calendarIso(year, endMonth, endDay);
    if (end < start) return undefined;
    return { start, end };
  }
  const weekday = weekdayNumber(rule.weekday);
  if (rule.type === "lastWeekday") {
    return spanFrom(calendarIso(year, rule.month, lastWeekday(year, rule.month, weekday)), 1);
  }
  const day = nthWeekday(year, rule.month, weekday, rule.n);
  if (!day) return undefined;
  const anchor = calendarIso(year, rule.month, day);
  if (rule.type === "nthWeekday") return spanFrom(anchor, rule.days ?? 1);
  return spanFrom(addIsoDays(anchor, rule.offset), rule.days ?? 1);
}

export function nextSpan(rule: ObservanceRule, today: string): CalendarSpan {
  const year = Number(today.slice(0, 4));
  const found: CalendarSpan[] = [];
  for (let cursor = year - 1; cursor <= year + 2; cursor += 1) {
    const span = resolveRule(rule, cursor);
    if (span && span.end >= today) found.push(span);
  }
  found.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const span = found[0];
  if (!span) throw new Error(`No upcoming date for a rule anchored near ${today}.`);
  return span;
}

export function calendarObservancePath(slug: string): string {
  return `${CALENDAR_PATH}/${slug}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthAnchor(iso: string): string {
  const month = Number(iso.slice(5, 7));
  const names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  return `${names[month - 1]}-${iso.slice(0, 4)}`;
}

export function monthHeading(iso: string): string {
  return `${monthName(Number(iso.slice(5, 7)))} ${iso.slice(0, 4)}`;
}

export function formatObservanceWhen(start: string, end: string): string {
  if (start === end) return formatLongDate(start);
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  if (startYear === endYear && startMonth === endMonth) {
    return `${monthName(startMonth)} ${startDay}–${endDay}, ${startYear}`;
  }
  if (startYear === endYear) {
    return `${monthName(startMonth)} ${startDay} – ${monthName(endMonth)} ${endDay}, ${startYear}`;
  }
  return `${formatLongDate(start)} – ${formatLongDate(end)}`;
}

export function formatObservanceShort(start: string, end: string, today: string): string {
  if (start <= today && today <= end) return "Now";
  const short = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${iso}T12:00:00Z`));
  if (start === end) return short(start);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${short(start)}–${Number(end.slice(8))}`;
  return `${short(start)}–${short(end)}`;
}

function hasPhrase(text: string, phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(text);
}

function parseObservances(): Observance[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const rows: Observance[] = [];
  for (const [index, raw] of OBSERVANCES.entries()) {
    const parsed = observanceSchema.safeParse(raw);
    if (!parsed.success) {
      const slug = typeof raw === "object" && raw && "slug" in raw ? String(raw.slug) : `#${index + 1}`;
      errors.push(
        `${slug}: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ")}`,
      );
      continue;
    }
    const row = parsed.data;
    if (slugs.has(row.slug)) errors.push(`${row.slug}: duplicate slug`);
    slugs.add(row.slug);
    for (const tag of row.tags) {
      if (!isTag(tag)) errors.push(`${row.slug}: unknown tag ${tag}`);
    }
    if (new Set(row.tags).size !== row.tags.length) errors.push(`${row.slug}: duplicate tag`);
    if (row.infoUrl && !row.infoLabel) errors.push(`${row.slug}: infoUrl needs infoLabel`);
    if (!row.infoUrl && row.infoLabel) errors.push(`${row.slug}: infoLabel needs infoUrl`);
    const hubs: CalendarHubId[] = [];
    for (const hub of row.hubs) {
      if (!HUB_IDS.has(hub)) errors.push(`${row.slug}: unknown hub ${hub}`);
      else hubs.push(hub as CalendarHubId);
    }
    const copy = [row.name, row.description, row.classroom, ...row.takePart].join("\n");
    if (COPY_BLOCK.test(copy)) errors.push(`${row.slug}: copy includes a blocked word`);
    if (copy.includes("@")) errors.push(`${row.slug}: copy includes an email-like @`);
    for (let year = 2026; year <= 2032; year += 1) {
      const span = resolveRule(row.rule, year);
      if (!span) errors.push(`${row.slug}: no date in ${year}`);
    }
    rows.push({
      ...row,
      keywords: row.keywords.map((keyword) => keyword.toLowerCase()),
      hubs,
    });
  }
  if (errors.length) {
    throw new Error(`Good News Calendar data:\n- ${errors.join("\n- ")}`);
  }
  assertKnownDates(rows);
  assertMonthsCovered(rows);
  return rows;
}

function expectSpan(rows: Observance[], slug: string, year: number, start: string, end = start) {
  const observance = rows.find((row) => row.slug === slug);
  const span = observance ? resolveRule(observance.rule, year) : undefined;
  if (!span || span.start !== start || span.end !== end) {
    throw new Error(`${slug} in ${year} resolved to ${span?.start ?? "nothing"}–${span?.end ?? ""}, expected ${start}–${end}.`);
  }
}

function assertKnownDates(rows: Observance[]) {
  expectSpan(rows, "veterans-day", 2026, "2026-11-11");
  expectSpan(rows, "world-kindness-day", 2026, "2026-11-13");
  expectSpan(rows, "thanksgiving", 2026, "2026-11-26");
  expectSpan(rows, "thanksgiving", 2027, "2027-11-25");
  expectSpan(rows, "giving-tuesday", 2026, "2026-12-01");
  expectSpan(rows, "giving-tuesday", 2027, "2027-11-30");
  expectSpan(rows, "international-volunteer-day", 2026, "2026-12-05");
  expectSpan(rows, "random-acts-of-kindness-day", 2027, "2027-02-17");
  expectSpan(rows, "random-acts-of-kindness-week", 2027, "2027-02-14", "2027-02-20");
  expectSpan(rows, "earth-day", 2027, "2027-04-22");
  expectSpan(rows, "national-pet-day", 2027, "2027-04-11");
  expectSpan(rows, "teacher-appreciation-week", 2026, "2026-05-04", "2026-05-08");
  expectSpan(rows, "teacher-appreciation-week", 2027, "2027-05-03", "2027-05-07");
  expectSpan(rows, "national-nurses-week", 2027, "2027-05-06", "2027-05-12");
  expectSpan(rows, "international-day-of-friendship", 2027, "2027-07-30");
  expectSpan(rows, "world-gratitude-day", 2027, "2027-09-21");
  expectSpan(rows, "national-volunteer-week", 2026, "2026-04-19", "2026-04-25");
  expectSpan(rows, "national-volunteer-week", 2027, "2027-04-18", "2027-04-24");
  expectSpan(rows, "be-kind-to-animals-week", 2026, "2026-05-03", "2026-05-09");
  expectSpan(rows, "be-kind-to-animals-week", 2027, "2027-05-02", "2027-05-08");
  expectSpan(rows, "arbor-day", 2026, "2026-04-24");
  expectSpan(rows, "arbor-day", 2027, "2027-04-30");
  expectSpan(rows, "mothers-day", 2026, "2026-05-10");
  expectSpan(rows, "mothers-day", 2027, "2027-05-09");
  expectSpan(rows, "fathers-day", 2027, "2027-06-20");
  expectSpan(rows, "national-grandparents-day", 2026, "2026-09-13");
  expectSpan(rows, "national-grandparents-day", 2027, "2027-09-12");
  expectSpan(rows, "national-adoption-day", 2026, "2026-11-21");
  expectSpan(rows, "world-smile-day", 2026, "2026-10-02");
  expectSpan(rows, "world-smile-day", 2027, "2027-10-01");
  expectSpan(rows, "make-a-difference-day", 2026, "2026-10-24");
  expectSpan(rows, "make-a-difference-day", 2027, "2027-10-23");
  expectSpan(rows, "national-first-responders-day", 2027, "2027-10-28");
  expectSpan(rows, "national-public-lands-day", 2026, "2026-09-26");
  expectSpan(rows, "national-trails-day", 2027, "2027-06-05");
  expectSpan(rows, "international-day-of-play", 2027, "2027-06-11");
}

function assertMonthsCovered(rows: Observance[]) {
  const today = "2026-10-31";
  const windowEnd = addIsoMonths(today, CALENDAR_WINDOW_MONTHS);
  const covered = new Set<string>();
  for (const row of rows) {
    const span = nextSpan(row.rule, today);
    if (span.end >= today && span.start <= windowEnd) covered.add(monthKey(span.start));
  }
  let cursor = "2026-11";
  while (cursor <= monthKey(windowEnd)) {
    if (!covered.has(cursor)) {
      throw new Error(`Good News Calendar has no observance in ${cursor}.`);
    }
    cursor = monthKey(addIsoMonths(`${cursor}-01`, 1));
  }
}

const observances = parseObservances();

const bySlug = new Map(observances.map((row) => [row.slug, row]));

export function listObservances(): Observance[] {
  return observances;
}

export function getObservance(slug: string): Observance | undefined {
  return bySlug.get(slug);
}

function hubsFor(observance: Observance): CalendarHubLink[] {
  return observance.hubs.map((id) => ({ id, ...CALENDAR_HUBS[id] }));
}

export function matchObservanceStories(
  observance: Observance,
  stories: Story[],
  responderConfig?: ReturnType<typeof loadFirstRespondersEditorConfig>,
): Story[] {
  const ranked: { story: Story; score: number; keywordHits: number }[] = [];
  for (const story of stories) {
    if (story.draft) continue;
    if (observance.storyFilter === "first-responders") {
      if (!responderConfig || !storyQualifies(story, responderConfig)) continue;
    }
    let score = 0;
    let tagHits = 0;
    for (const tag of story.tags) {
      if (observance.tags.includes(tag)) {
        tagHits += 1;
        score += 6;
      }
    }
    const title = story.title;
    const lead = `${story.title}\n${story.dek}`;
    let keywordHits = 0;
    for (const keyword of observance.keywords) {
      if (hasPhrase(title, keyword)) {
        keywordHits += 1;
        score += 20;
      } else if (hasPhrase(lead, keyword)) {
        keywordHits += 1;
        score += 10;
      }
    }
    if (tagHits === 0 && keywordHits === 0) continue;
    if (observance.slug === "veterans-day" && !story.tags.includes("veterans") && SPORTS_VETERAN.test(lead)) continue;
    if (observance.kidFriendly && story.kidFriendly) score += 1;
    ranked.push({ story, score, keywordHits });
  }
  const byFit = (a: (typeof ranked)[number], b: (typeof ranked)[number]) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.story.date !== b.story.date) return a.story.date < b.story.date ? 1 : -1;
    return a.story.slug.localeCompare(b.story.slug);
  };
  const keywordFirst = ranked.filter((item) => item.keywordHits > 0).sort(byFit);
  const tagOnly = ranked.filter((item) => item.keywordHits === 0).sort(byFit);
  return [...keywordFirst, ...tagOnly].slice(0, CALENDAR_STORY_LIMIT).map((item) => item.story);
}

function materialize(
  observance: Observance,
  today: string,
  stories: Story[],
  responderConfig: ReturnType<typeof loadFirstRespondersEditorConfig>,
): CalendarOccurrence {
  const span = nextSpan(observance.rule, today);
  const selected = matchObservanceStories(observance, stories, responderConfig);
  const latest = selected.reduce<string | undefined>((best, story) => (!best || story.date > best ? story.date : best), undefined);
  return {
    observance,
    start: span.start,
    end: span.end,
    path: calendarObservancePath(observance.slug),
    stories: selected,
    indexable: selected.length >= MIN_CALENDAR_STORIES,
    hubs: hubsFor(observance),
    latest,
  };
}

const viewCache = new Map<string, CalendarView>();

export function getCalendarView(today = mountainIsoDay()): CalendarView {
  const cached = viewCache.get(today);
  if (cached) return cached;
  const stories = getPublishedStories();
  const responderConfig = loadFirstRespondersEditorConfig();
  const windowEnd = addIsoMonths(today, CALENDAR_WINDOW_MONTHS);
  const occurrences = observances.map((observance) => materialize(observance, today, stories, responderConfig));
  const upcoming = occurrences
    .filter((item) => item.end >= today && item.start <= windowEnd)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.observance.name.localeCompare(b.observance.name)));
  const months: CalendarMonthGroup[] = [];
  for (const item of upcoming) {
    const key = monthKey(item.start);
    const current = months[months.length - 1];
    if (!current || current.key !== key) {
      months.push({ key, label: monthHeading(item.start), items: [item] });
    } else {
      current.items.push(item);
    }
  }
  const view: CalendarView = {
    today,
    windowEnd,
    upcoming,
    months,
    bySlug: new Map(occurrences.map((item) => [item.observance.slug, item])),
  };
  viewCache.set(today, view);
  return view;
}

export function getObservancePage(slug: string, today = mountainIsoDay()): CalendarOccurrence | undefined {
  return getCalendarView(today).bySlug.get(slug);
}

export function comingUp(limit = CALENDAR_PREVIEW_COUNT, today = mountainIsoDay()): CalendarOccurrence[] {
  return getCalendarView(today).upcoming.slice(0, limit);
}

/** Observances in the next `days` with fewer than two matching stories. */
export function calendarCoverageGaps(days = CALENDAR_COVERAGE_DAYS, today = mountainIsoDay()): CalendarOccurrence[] {
  const end = addIsoDays(today, days);
  return getCalendarView(today).upcoming.filter((item) => item.start <= end && item.stories.length < MIN_CALENDAR_STORIES);
}

export function indexableCalendarPaths(today = mountainIsoDay()): string[] {
  return [CALENDAR_PATH, ...getCalendarView(today).upcoming.filter((item) => item.indexable).map((item) => item.path)];
}

export function calendarSitemapEntries(today = mountainIsoDay()) {
  const view = getCalendarView(today);
  const newest = view.upcoming.reduce<string | undefined>((best, item) => {
    if (!item.latest) return best;
    return !best || item.latest > best ? item.latest : best;
  }, undefined);
  return [
    {
      url: absoluteUrl(CALENDAR_PATH),
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...view.upcoming
      .filter((item) => item.indexable)
      .map((item) => ({
        url: absoluteUrl(item.path),
        ...(item.latest ? { lastModified: item.latest } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
  ];
}

function icsStamp(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function icsText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(/\r?\n/g, "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function icsDate(iso: string): string {
  return iso.replaceAll("-", "");
}

function foldIcs(lines: string[]): string {
  const folded: string[] = [];
  for (const line of lines) {
    if (line.length <= 73) {
      folded.push(line);
      continue;
    }
    folded.push(line.slice(0, 73));
    let rest = line.slice(73);
    while (rest.length > 72) {
      folded.push(` ${rest.slice(0, 72)}`);
      rest = rest.slice(72);
    }
    if (rest) folded.push(` ${rest}`);
  }
  return `${folded.join("\r\n")}\r\n`;
}

/** A static iCalendar file for the upcoming window. Regenerated on each deploy. */
export function buildIcs(today = mountainIsoDay(), now = new Date()): string {
  const view = getCalendarView(today);
  const stamp = icsStamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${siteConfig.owner.name.replaceAll(",", "")}//${siteConfig.name} Good News Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(`${siteConfig.name} Good News Calendar`)}`,
    `X-WR-CALDESC:${icsText(CALENDAR_INDEX_DESCRIPTION)}`,
    `X-WR-TIMEZONE:America/Denver`,
  ];
  for (const item of view.upcoming) {
    const page = absoluteUrl(item.path);
    const details = `${item.observance.description} Ways to take part: ${page}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.observance.slug}-${icsDate(item.start)}@${siteConfig.domain}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(item.start)}`,
      `DTEND;VALUE=DATE:${icsDate(addIsoDays(item.end, 1))}`,
      `SUMMARY:${icsText(item.observance.name)}`,
      `DESCRIPTION:${icsText(details)}`,
      `URL:${page}`,
      "TRANSP:TRANSPARENT",
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return foldIcs(lines);
}

export function observanceJsonLd(item: CalendarOccurrence) {
  const url = absoluteUrl(item.path);
  const image = item.stories[0]?.image;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        "@id": `${url}#observance`,
        name: item.observance.name,
        description: item.observance.description,
        startDate: item.start,
        endDate: item.end,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        isAccessibleForFree: true,
        inLanguage: "en-US",
        url,
        ...(image ? { image: absoluteUrl(image) } : {}),
        location: {
          "@type": "VirtualLocation",
          url: item.observance.infoUrl ?? url,
        },
      },
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: item.observance.name,
        description: item.observance.description,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        ...(item.latest
          ? { datePublished: publishedIso(item.latest), dateModified: publishedIso(item.latest) }
          : {}),
        ...(image ? { image: absoluteUrl(image) } : {}),
        author: { "@id": `${siteConfig.url}/#editorial-team` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        mainEntityOfPage: url,
        about: { "@id": `${url}#observance` },
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: CALENDAR_INDEX_TITLE, item: absoluteUrl(CALENDAR_PATH) },
          { "@type": "ListItem", position: 3, name: item.observance.name, item: url },
        ],
      },
    ],
  };
}

export { CALENDAR_ICS_PATH, CALENDAR_PATH };
