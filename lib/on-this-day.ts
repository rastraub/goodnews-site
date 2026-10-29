/**
 * Good news on this day. Historical milestones live in data/on-this-day.json.
 * Every calendar day has a static page. A day with no milestones still renders.
 * Archive stories are the ones published on that month and day in any year.
 */
import fs from "fs";
import path from "path";
import {
  allCalendarDays,
  calendarIso,
  monthDayFromIso,
  monthDayLabel,
  onThisDayPath,
  type CalendarDay,
} from "./calendar-day";
import { auditOnThisDay, onThisDayFileSchema, type OnThisDayEntry, type OnThisDayFile, type OnThisDayRecord } from "./on-this-day-schema";
import { absoluteUrl } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { siteConfig } from "@/site.config";

export type { OnThisDayEntry, OnThisDayRecord };

const DATA_FILE = path.join(process.cwd(), "data", "on-this-day.json");

export const ON_THIS_DAY_INDEX_PATH = "/on-this-day";
export const ON_THIS_DAY_TODAY_PATH = "/on-this-day/today";

const EMPTY_PROMPTS: [string, string] = [
  "What is one kind thing people in your town could do on a day like today?",
  "If your class wrote a good-news headline for this date, what would it be about?",
];

let fileCache: OnThisDayFile | undefined;
let byKey: Map<string, OnThisDayRecord> | undefined;
let storiesByKey: Map<string, Story[]> | undefined;

export function loadOnThisDay(): OnThisDayFile {
  if (fileCache) return fileCache;
  const raw: unknown = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const parsed = onThisDayFileSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`data/on-this-day.json: ${details}`);
  }
  const problems = auditOnThisDay(parsed.data);
  if (problems.length) {
    throw new Error(`data/on-this-day.json:\n- ${problems.join("\n- ")}`);
  }
  fileCache = parsed.data;
  return fileCache;
}

function keyFor(month: number, day: number): string {
  return `${month}-${day}`;
}

function recordsByKey(): Map<string, OnThisDayRecord> {
  if (!byKey) {
    byKey = new Map(loadOnThisDay().days.map((record) => [keyFor(record.month, record.day), record]));
  }
  return byKey;
}

export function getOnThisDay(month: number, day: number): OnThisDayRecord | undefined {
  const record = recordsByKey().get(keyFor(month, day));
  if (!record) return undefined;
  return {
    ...record,
    entries: record.entries.slice().sort((a, b) => a.year - b.year),
  };
}

export function onThisDayUpdated(): string {
  return loadOnThisDay().updated;
}

export function storiesForMonthDay(month: number, day: number): Story[] {
  if (!storiesByKey) {
    const map = new Map<string, Story[]>();
    for (const story of getPublishedStories()) {
      const parts = monthDayFromIso(story.date);
      if (!parts) continue;
      const key = keyFor(parts.month, parts.day);
      const list = map.get(key);
      if (list) list.push(story);
      else map.set(key, [story]);
    }
    storiesByKey = map;
  }
  return storiesByKey.get(keyFor(month, day)) ?? [];
}

export function promptsFor(month: number, day: number): [string, string] {
  return getOnThisDay(month, day)?.prompts ?? EMPTY_PROMPTS;
}

export function onThisDayTitle(month: number, day: number): string {
  return `Good news on ${monthDayLabel(month, day)}`;
}

export function onThisDayDescription(month: number, day: number): string {
  const label = monthDayLabel(month, day);
  const entries = getOnThisDay(month, day)?.entries.length ?? 0;
  const stories = storiesForMonthDay(month, day).length;
  const milestones = entries
    ? `${entries} verified ${entries === 1 ? "milestone" : "milestones"}`
    : "verified milestones as they are checked";
  const archive = stories
    ? `${stories} ${stories === 1 ? "story" : "stories"} from the archive published on this date`
    : "archive stories from this date when the edition has them";
  return `Positive things that happened on ${label}: ${milestones}, plus ${archive}.`;
}

export function onThisDayLastModified(month: number, day: number): string {
  const updated = onThisDayUpdated();
  const newest = storiesForMonthDay(month, day)[0]?.date;
  if (!newest || newest < updated) return updated;
  return newest;
}

export function allOnThisDayPaths(): string[] {
  return allCalendarDays().map((day) => onThisDayPath(day.month, day.day));
}

function crumbs(month: number, day: number) {
  const label = monthDayLabel(month, day);
  return [
    { name: "Today", path: "/" },
    { name: "On this day", path: ON_THIS_DAY_INDEX_PATH },
    { name: label, path: onThisDayPath(month, day) },
  ];
}

function breadcrumbNode(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function onThisDayIndexJsonLd(description: string) {
  const days = allCalendarDays();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Good news on this day",
        description,
        url: absoluteUrl(ON_THIS_DAY_INDEX_PATH),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        inLanguage: "en-US",
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: days.length,
          itemListElement: days.map((day, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: onThisDayTitle(day.month, day.day),
            url: absoluteUrl(onThisDayPath(day.month, day.day)),
          })),
        },
      },
      breadcrumbNode([
        { name: "Today", path: "/" },
        { name: "On this day", path: ON_THIS_DAY_INDEX_PATH },
      ]),
    ],
  };
}

export function onThisDayJsonLd(day: CalendarDay) {
  const record = getOnThisDay(day.month, day.day);
  const entries = record?.entries ?? [];
  const url = absoluteUrl(onThisDayPath(day.month, day.day));
  const title = onThisDayTitle(day.month, day.day);
  const description = onThisDayDescription(day.month, day.day);
  const citations = entries.flatMap((entry) => entry.sources.map((source) => source.url));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: title,
        description,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        dateModified: `${onThisDayLastModified(day.month, day.day)}T09:00:00.000Z`,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          description: siteConfig.editor.blurb,
          url: absoluteUrl("/about#masthead"),
        },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        ...(citations.length ? { citation: citations } : {}),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: entries.length,
          itemListElement: entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${entry.year}`,
            description: entry.text,
            url: `${url}#${calendarIso(entry.year, day.month, day.day)}-${index + 1}`,
          })),
        },
      },
      breadcrumbNode(crumbs(day.month, day.day)),
    ],
  };
}
