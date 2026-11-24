/**
 * SEO and site-health audit for the generated routes.
 * It reads the same story files, hub rules, and page metadata the build uses.
 * No network calls and no paid APIs.
 *
 * Rules that match the site:
 * - City pages are noindex below MIN_CITY_INDEX_STORIES. Other hubs publish at MIN_HUB_STORIES.
 * - Country pages are noindex below MIN_HUB_STORIES.
 * - Calendar pages are indexable only inside the 12-month window and with MIN_CALENDAR_STORIES.
 * - Morning-announcement scripts are indexable only inside the word-count window. Weekends redirect.
 * - Empty shoutout months are noindex.
 * - Listing page 2 and later stay out of the sitemap, so they are noindex, follow.
 * - The news sitemap is the last 48 hours of stories and web stories.
 * - Spanish hreflang is only the weekly Top 5 paired with /week, never a blanket /es prefix.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type { Metadata } from "next";
import { AMBASSADOR_CERTIFICATE_PATH, AMBASSADORS_PATH, shoutoutsPath } from "./ambassador-tip";
import { CATEGORIES } from "./categories";
import { CALENDAR_ICS_PATH, CALENDAR_PATH } from "./calendar-path";
import { CLASSROOM_INDEX_PATH, packsToPrerender } from "./classroom-pack";
import { COUNTRIES } from "./countries";
import { EXPLAINER_INDEX_PATH, explainerJsonLd, explainerPath, explainersForStory, getPublishedExplainers, storiesForExplainer } from "./explainers";
import { storyFeedImage } from "./feed-image";
import { FOLLOW_UPS_PATH } from "./follow-ups";
import { GIVING_TUESDAY_PATH } from "./giving-tuesday";
import { ballotJsonLd, ballotMonths, getBallot } from "./good-neighbor-data";
import { editionMonth } from "./good-neighbor";
import {
  getCalendarView,
  getObservancePage,
  listObservances,
  MIN_CALENDAR_STORIES,
  observanceJsonLd,
} from "./good-news-calendar";
import { indexJsonLd, indexesToPrerender } from "./good-news-index";
import { countryIsIndexable, getHubIndex, hubPageParams, hubPathsForStory, MIN_CITY_INDEX_STORIES, MIN_HUB_STORIES, storiesForHub } from "./hubs";
import { storyThumbPath } from "./images";
import { getKidStories, kidPlaces, kidStoriesInCountry, kidStoriesInState } from "./kids";
import { classesForMonth, shoutoutMonthsToPrerender, shoutoutsJsonLd } from "./kindness-ambassadors";
import { getKindnessChallenges, kindnessJsonLd, KINDNESS_INDEX_PATH } from "./kindness";
import { GOOD_NEWS_MAP_PATH } from "./map-path";
import {
  announcementJsonLd,
  indexableAnnouncementDays,
  isWeekend,
  loadAnnouncementDays,
  MORNING_ANNOUNCEMENTS_PATH,
  previousSchoolDay,
} from "./morning-announcements";
import { FIRST_RESPONDERS_DAY_PATH } from "./first-responders-day";
import { allOnThisDayPaths, onThisDayJsonLd, ON_THIS_DAY_INDEX_PATH, ON_THIS_DAY_TODAY_PATH, storiesForMonthDay } from "./on-this-day";
import { parseMonthDaySlug } from "./calendar-day";
import { getOutletForStory, getOutlets } from "./outlets";
import { archivePageParams, listingPageParams, pageCount, pagePath, pageSlice, STORY_PAGE_SIZE } from "./paging";
import { quizJsonLd, quizzesToPrerender } from "./quiz";
import { absoluteUrl, isWithinHours, listingJsonLd, siteGraphJsonLd, storyJsonLd } from "./seo";
import { getSpanishEdition, loadSpanishEditions, spanishEditionJsonLd } from "./spanish-editions";
import { getByCategory, getByCountry, getByState, getPublishedStories, relatedStories } from "./stories";
import { STATES } from "./states";
import { TABLE_TALK_PATH } from "./table-talk";
import { THANKS_PATH } from "./thanks";
import { VETERANS_DAY_PATH } from "./veterans-day";
import { listWebStories, renderWebStoryDocument } from "./web-stories";
import { weeksToPrerender } from "./weeks";
import { WORLD_KINDNESS_PATH } from "./world-kindness-day";
import { newsBreakBanner, siteConfig } from "@/site.config";

const NEWS_WINDOW_HOURS = 48;
const TITLE_EXTREME = 140;
const DESCRIPTION_EXTREME = 360;
const DESCRIPTION_TINY = 25;

export type SeoIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  count?: number;
  examples?: string[];
  path?: string;
};

export type SeoReport = {
  generatedAt: string;
  site: string;
  routeCount: number;
  indexableCount: number;
  sitemapCount: number;
  newsSitemapCount: number;
  errorCount: number;
  warningCount: number;
  byCode: Record<string, { severity: "error" | "warning"; count: number }>;
  length: {
    indexedTitles: number;
    titlesOver60: number;
    titlesOver70: number;
    titlesUnder30: number;
    indexedDescriptions: number;
    descriptionsOver160: number;
    descriptionsUnder50: number;
    longestTitles: { path: string; length: number; title: string }[];
    shortestTitles: { path: string; length: number; title: string }[];
  };
  issues: SeoIssue[];
};

type Expectation = "index" | "noindex" | "redirect" | "alias";

type RouteSpec = {
  path: string;
  kind: string;
  expect: Expectation;
  aliasTarget?: string;
  file?: string;
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
  home?: boolean;
  amp?: boolean;
  sourceFile?: string;
  schema?: "listing" | "news" | "entity";
};

type Evaluated = RouteSpec & {
  title: string;
  rawTitle: string;
  description: string;
  canonical?: string;
  canonicalExternal?: string;
  indexed: boolean;
  languages: Record<string, string>;
  ogImages: string[];
  ogConvention: boolean;
  redirectTo?: string;
  failed?: string;
};

type PageModule = {
  metadata?: Metadata;
  generateMetadata?: (props: {
    params?: Promise<Record<string, string>>;
    searchParams?: Promise<Record<string, string>>;
  }) => Promise<Metadata> | Metadata;
  GET?: (request: Request, context?: { params: Promise<Record<string, string>> }) => Response | Promise<Response>;
  default?: unknown;
};

const moduleCache = new Map<string, Promise<PageModule>>();

function loadModule(file: string): Promise<PageModule> {
  let pending = moduleCache.get(file);
  if (!pending) {
    const href = pathToFileURL(path.join(process.cwd(), file)).href;
    pending = import(href) as Promise<PageModule>;
    moduleCache.set(file, pending);
  }
  return pending;
}

function redirectTarget(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("digest" in error)) return undefined;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT;")) return undefined;
  const parts = digest.split(";");
  return parts[2];
}

class Collector {
  issues: SeoIssue[] = [];
  private groups = new Map<string, { severity: "error" | "warning"; code: string; message: string; count: number; examples: string[] }>();

  add(issue: SeoIssue) {
    this.issues.push(issue);
  }

  group(severity: "error" | "warning", code: string, example: string, message: string) {
    const key = `${severity}\0${code}\0${message}`;
    const bucket = this.groups.get(key);
    if (bucket) {
      bucket.count += 1;
      if (bucket.examples.length < 12) bucket.examples.push(example);
      return;
    }
    this.groups.set(key, { severity, code, message, count: 1, examples: [example] });
  }

  finish() {
    for (const bucket of this.groups.values()) {
      this.issues.push({
        severity: bucket.severity,
        code: bucket.code,
        message: bucket.message,
        count: bucket.count,
        examples: bucket.examples,
      });
    }
  }
}

function normalizePath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/)[0] || "/";
  if (pathOnly.length > 1 && pathOnly.endsWith("/")) return pathOnly.slice(0, -1);
  return pathOnly || "/";
}

function locate(value: unknown): { path: string; external?: string } | undefined {
  let raw = "";
  if (typeof value === "string") raw = value.trim();
  else if (value instanceof URL) raw = value.toString();
  else if (Array.isArray(value)) return locate(value[0]);
  else return undefined;
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return undefined;
    }
    const path = normalizePath(url.pathname);
    if (url.origin !== siteConfig.url) return { path, external: url.origin };
    return { path };
  }
  if (raw.startsWith("//")) return { path: raw, external: "protocol-relative" };
  if (!raw.startsWith("/")) return undefined;
  return { path: normalizePath(raw) };
}

function allowsIndex(robots: Metadata["robots"] | undefined): boolean {
  if (robots == null) return true;
  if (typeof robots === "string") return !/\bnoindex\b/i.test(robots);
  if (Array.isArray(robots)) return robots.every((entry) => allowsIndex(entry));
  return robots.index !== false;
}

function renderTitle(title: Metadata["title"] | undefined, home: boolean): { raw: string; rendered: string } {
  if (home) {
    const rendered = `${siteConfig.name} · ${siteConfig.seoTitle}`;
    return { raw: rendered, rendered };
  }
  if (!title) return { raw: "", rendered: "" };
  if (typeof title === "string") return { raw: title, rendered: `${title} · ${siteConfig.name}` };
  if (typeof title === "object" && "absolute" in title && title.absolute) return { raw: title.absolute, rendered: title.absolute };
  if (typeof title === "object" && "default" in title && typeof title.default === "string") {
    return { raw: title.default, rendered: title.default };
  }
  return { raw: "", rendered: "" };
}

function imageList(images: unknown): string[] {
  if (!images) return [];
  const list = Array.isArray(images) ? images : [images];
  const urls: string[] = [];
  for (const image of list) {
    if (typeof image === "string") urls.push(image);
    else if (image instanceof URL) urls.push(image.toString());
    else if (image && typeof image === "object" && "url" in image) {
      const url = (image as { url: unknown }).url;
      if (typeof url === "string") urls.push(url);
      else if (url instanceof URL) urls.push(url.toString());
    }
  }
  return urls;
}

function languageMap(alternates: Metadata["alternates"] | undefined): Record<string, string> {
  const languages: Record<string, string> = {};
  if (!alternates?.languages) return languages;
  for (const [key, value] of Object.entries(alternates.languages)) {
    const located = locate(value);
    if (located && !located.external) languages[key] = located.path;
    else if (located?.external) languages[key] = `external:${located.external}${located.path}`;
  }
  return languages;
}

function nodeTypes(node: Record<string, unknown>): string[] {
  const value = node["@type"];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function graphNodes(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  if (Array.isArray(root["@graph"])) return root["@graph"].filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  return [root];
}

function jsonLdProblems(data: unknown, required: string[]): string[] {
  const problems: string[] = [];
  if (!data || typeof data !== "object") return ["JSON-LD is empty"];
  const root = data as Record<string, unknown>;
  if (root["@context"] !== "https://schema.org") problems.push("@context is not https://schema.org");
  const nodes = graphNodes(data);
  const types = new Set<string>();
  for (const node of nodes) for (const type of nodeTypes(node)) types.add(type);
  for (const type of required) {
    if (!types.has(type)) problems.push(`missing ${type}`);
  }
  if (required.includes("BreadcrumbList")) {
    const crumbs = nodes.find((node) => nodeTypes(node).includes("BreadcrumbList"));
    const items = crumbs?.itemListElement;
    if (!Array.isArray(items) || items.length === 0) problems.push("BreadcrumbList has no items");
    else {
      items.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          problems.push("breadcrumb item is empty");
          return;
        }
        const row = item as Record<string, unknown>;
        if (row.position !== index + 1) problems.push("breadcrumb positions are not 1..n");
        if (typeof row.name !== "string" || !row.name.trim()) problems.push("breadcrumb item missing a name");
        const crumbUrl = row.item;
        const onSite = typeof crumbUrl === "string" && (crumbUrl === siteConfig.url || crumbUrl.startsWith(`${siteConfig.url}/`));
        if (!onSite) problems.push("breadcrumb item is not an absolute URL on this site");
      });
    }
  }
  const article = nodes.find((node) => nodeTypes(node).some((type) => type === "NewsArticle" || type === "Article" || type === "HowTo"));
  if (article && required.some((type) => type === "NewsArticle" || type === "Article" || type === "HowTo")) {
    if (!article.headline && !article.name) problems.push("article missing a headline");
    if (typeof article.datePublished !== "string" || Number.isNaN(Date.parse(article.datePublished))) problems.push("article datePublished is missing or not a date");
    if (!article.image) problems.push("article missing an image");
    const author = article.author;
    const authorOk = author && typeof author === "object" && ("name" in author || "@id" in author);
    if (!authorOk) problems.push("article missing an author");
    const publisher = article.publisher;
    const publisherOk = publisher && typeof publisher === "object" && ("name" in publisher || "@id" in publisher);
    if (!publisherOk) problems.push("article missing a publisher");
    if (required.includes("NewsArticle")) {
      const logo = publisher && typeof publisher === "object" ? (publisher as Record<string, unknown>).logo : undefined;
      if (!logo) problems.push("NewsArticle publisher is missing a logo");
    }
    if (required.includes("HowTo")) {
      const steps = article.step;
      if (!Array.isArray(steps) || steps.length === 0) problems.push("HowTo has no steps");
    }
  }
  if (required.includes("Quiz")) {
    const quiz = nodes.find((node) => nodeTypes(node).includes("Quiz"));
    const parts = quiz?.hasPart;
    if (!Array.isArray(parts) || parts.length === 0) problems.push("Quiz has no questions");
    else if (parts.some((part) => !part || typeof part !== "object" || !(part as Record<string, unknown>).acceptedAnswer)) {
      problems.push("Quiz question is missing an accepted answer");
    }
  }
  if (required.includes("Event")) {
    const event = nodes.find((node) => nodeTypes(node).includes("Event"));
    if (!event?.name || !event.startDate || !event.location) problems.push("Event is missing a name, start date, or location");
  }
  if (required.includes("Dataset")) {
    const dataset = nodes.find((node) => nodeTypes(node).includes("Dataset"));
    if (!dataset?.name || !dataset.description) problems.push("Dataset is missing a name or description");
  }
  if (required.includes("FAQPage")) {
    const faq = nodes.find((node) => nodeTypes(node).includes("FAQPage"));
    const questions = faq?.mainEntity;
    if (!Array.isArray(questions) || questions.length === 0) problems.push("FAQPage has no questions");
  }
  return [...new Set(problems)];
}

function publicFiles(): Set<string> {
  const root = path.join(process.cwd(), "public");
  const files = new Set<string>();
  if (!fs.existsSync(root)) return files;
  const entries = fs.readdirSync(root, { recursive: true, encoding: "utf8" });
  for (const entry of entries) {
    const rel = String(entry).split(path.sep).join("/");
    const absolute = path.join(root, rel);
    if (fs.statSync(absolute).isFile()) files.add(`/${rel}`);
  }
  return files;
}

function isGeneratedAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/images/web-stories/") ||
    pathname === "/publisher-logo.png" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname === "/opengraph-image" ||
    pathname.endsWith("/opengraph-image") ||
    pathname.endsWith("/twitter-image")
  );
}

function buildRoutes(): RouteSpec[] {
  const routes: RouteSpec[] = [];
  const seen = new Set<string>();
  function add(route: RouteSpec) {
    if (seen.has(route.path)) throw new Error(`Duplicate route in the audit catalog: ${route.path}`);
    seen.add(route.path);
    routes.push(route);
  }

  const pages: Array<Omit<RouteSpec, "kind"> & { kind?: string }> = [
    { path: "/", kind: "home", expect: "index", home: true, schema: "listing", sourceFile: "components/site-frame.tsx" },
    { path: "/about", kind: "about", expect: "index", file: "app/(site)/about/page.tsx" },
    { path: "/editorial-standards", kind: "standards", expect: "index", file: "app/(site)/editorial-standards/page.tsx" },
    { path: "/corrections", kind: "corrections", expect: "index", file: "app/(site)/corrections/page.tsx" },
    { path: "/contact", kind: "contact", expect: "index", file: "app/(site)/contact/page.tsx" },
    { path: "/submit", kind: "submit", expect: "index", file: "app/(site)/submit/page.tsx", searchParams: {} },
    { path: "/subscribe", kind: "subscribe", expect: "index", file: "app/(site)/subscribe/page.tsx" },
    { path: "/help", kind: "help", expect: "index", file: "app/(site)/help/page.tsx" },
    { path: "/feeds", kind: "feeds", expect: "index", file: "app/(site)/feeds/page.tsx" },
    { path: "/featured", kind: "featured", expect: "index", file: "app/(site)/featured/page.tsx" },
    { path: "/widgets", kind: "widgets", expect: "index", file: "app/(site)/widgets/page.tsx" },
    { path: "/membership", kind: "membership", expect: "index", file: "app/(site)/membership/page.tsx" },
    { path: "/partner", kind: "partner", expect: "index", file: "app/(site)/partner/page.tsx" },
    { path: "/privacy", kind: "privacy", expect: "index", file: "app/(site)/privacy/page.tsx" },
    { path: "/terms", kind: "terms", expect: "index", file: "app/(site)/terms/page.tsx" },
    { path: "/search", kind: "search", expect: "noindex", file: "app/(site)/search/page.tsx" },
    { path: "/local", kind: "local", expect: "index", file: "app/(site)/local/page.tsx", schema: "listing", sourceFile: "app/(site)/local/page.tsx" },
    { path: "/world", kind: "world", expect: "index", file: "app/(site)/world/page.tsx", schema: "listing", sourceFile: "app/(site)/world/page.tsx" },
    { path: "/topics", kind: "topics", expect: "index", file: "app/(site)/topics/page.tsx", schema: "listing", sourceFile: "app/(site)/topics/page.tsx" },
    { path: "/stories", kind: "stories", expect: "index", file: "app/(site)/stories/page.tsx", schema: "listing", sourceFile: "app/(site)/stories/browse.tsx" },
    { path: "/heroes", kind: "heroes", expect: "index", file: "app/(site)/heroes/page.tsx", searchParams: {}, schema: "listing", sourceFile: "app/(site)/heroes/page.tsx" },
    { path: "/kids", kind: "kids", expect: "index", file: "app/(site)/kids/page.tsx", schema: "listing", sourceFile: "app/(site)/kids/browse.tsx" },
    { path: "/kids/print", kind: "kids-print", expect: "index", file: "app/(site)/kids/print/page.tsx", schema: "entity", sourceFile: "app/(site)/kids/print/page.tsx" },
    { path: newsBreakBanner.path, kind: "news-break", expect: "index", file: "app/(site)/news-break/page.tsx", schema: "entity", sourceFile: "app/(site)/news-break/page.tsx" },
    { path: "/week", kind: "week-index", expect: "index", file: "app/(site)/week/page.tsx", schema: "listing", sourceFile: "app/(site)/week/page.tsx" },
    { path: "/quiz", kind: "quiz-index", expect: "index", file: "app/(site)/quiz/page.tsx", schema: "entity", sourceFile: "app/(site)/quiz/page.tsx" },
    { path: CLASSROOM_INDEX_PATH, kind: "classroom-index", expect: "index", file: "app/(site)/classroom/page.tsx", schema: "entity", sourceFile: "app/(site)/classroom/page.tsx" },
    { path: EXPLAINER_INDEX_PATH, kind: "explainer-index", expect: "index", file: "app/(site)/explainers/page.tsx", schema: "entity", sourceFile: "app/(site)/explainers/page.tsx" },
    { path: ON_THIS_DAY_INDEX_PATH, kind: "on-this-day-index", expect: "index", file: "app/(site)/on-this-day/page.tsx", schema: "entity", sourceFile: "app/(site)/on-this-day/page.tsx" },
    { path: ON_THIS_DAY_TODAY_PATH, kind: "on-this-day-today", expect: "noindex", file: "app/(site)/on-this-day/today/page.tsx" },
    { path: "/web-stories", kind: "web-stories", expect: "index", file: "app/(site)/web-stories/page.tsx", schema: "listing", sourceFile: "app/(site)/web-stories/page.tsx" },
    { path: CALENDAR_PATH, kind: "calendar-index", expect: "index", file: "app/(site)/calendar/page.tsx", schema: "listing", sourceFile: "app/(site)/calendar/page.tsx" },
    { path: MORNING_ANNOUNCEMENTS_PATH, kind: "announcements", expect: "index", file: "app/(site)/morning-announcements/page.tsx", schema: "listing", sourceFile: "app/(site)/morning-announcements/page.tsx" },
    { path: KINDNESS_INDEX_PATH, kind: "kindness-index", expect: "index", file: "app/(site)/kindness-challenge/page.tsx", schema: "listing", sourceFile: "app/(site)/kindness-challenge/page.tsx" },
    { path: AMBASSADORS_PATH, kind: "ambassadors", expect: "index", file: "app/(site)/kindness-ambassadors/page.tsx", schema: "entity", sourceFile: "app/(site)/kindness-ambassadors/page.tsx" },
    { path: AMBASSADOR_CERTIFICATE_PATH, kind: "certificate", expect: "index", file: "app/(site)/kindness-ambassadors/certificate/page.tsx", schema: "entity", sourceFile: "app/(site)/kindness-ambassadors/certificate/page.tsx" },
    { path: "/good-neighbor", kind: "good-neighbor", expect: "index", file: "app/(site)/good-neighbor/page.tsx", schema: "entity", sourceFile: "components/good-neighbor-view.tsx" },
    { path: "/good-neighbor/winners", kind: "winners", expect: "index", file: "app/(site)/good-neighbor/winners/page.tsx", schema: "listing", sourceFile: "app/(site)/good-neighbor/winners/page.tsx" },
    { path: "/good-news-index", kind: "index-home", expect: "index", file: "app/(site)/good-news-index/page.tsx", schema: "listing", sourceFile: "app/(site)/good-news-index/page.tsx" },
    { path: "/sources", kind: "sources", expect: "index", file: "app/(site)/sources/page.tsx", schema: "listing", sourceFile: "app/(site)/sources/page.tsx" },
    { path: FOLLOW_UPS_PATH, kind: "follow-ups", expect: "index", file: "app/(site)/follow-ups/page.tsx", schema: "listing", sourceFile: "app/(site)/follow-ups/page.tsx" },
    { path: GIVING_TUESDAY_PATH, kind: "giving-tuesday", expect: "index", file: "app/(site)/giving-tuesday/page.tsx", schema: "listing", sourceFile: "app/(site)/giving-tuesday/page.tsx" },
    { path: VETERANS_DAY_PATH, kind: "veterans", expect: "index", file: "app/(site)/veterans-day/page.tsx", schema: "listing", sourceFile: "app/(site)/veterans-day/page.tsx" },
    { path: WORLD_KINDNESS_PATH, kind: "world-kindness", expect: "index", file: "app/(site)/world-kindness-day/page.tsx", schema: "entity", sourceFile: "app/(site)/world-kindness-day/page.tsx" },
    { path: FIRST_RESPONDERS_DAY_PATH, kind: "responders", expect: "index", file: "app/(site)/first-responders-day/page.tsx", schema: "listing", sourceFile: "app/(site)/first-responders-day/page.tsx" },
    { path: THANKS_PATH, kind: "thanks", expect: "index", file: "app/(site)/50-states-of-thanks/page.tsx", schema: "listing", sourceFile: "app/(site)/50-states-of-thanks/page.tsx" },
    { path: TABLE_TALK_PATH, kind: "table-talk", expect: "index", file: "app/(site)/table-talk/page.tsx", schema: "listing", sourceFile: "app/(site)/table-talk/page.tsx" },
    { path: GOOD_NEWS_MAP_PATH, kind: "map", expect: "index", file: "app/(site)/map/page.tsx", schema: "listing", sourceFile: "app/(site)/map/page.tsx" },
    { path: "/es", kind: "spanish-home", expect: "index", file: "app/es/page.tsx", schema: "entity", sourceFile: "app/es/page.tsx" },
    { path: "/es/buenas-noticias", kind: "spanish-index", expect: "index", file: "app/es/buenas-noticias/page.tsx", schema: "listing", sourceFile: "app/es/buenas-noticias/page.tsx" },
  ];
  for (const page of pages) add({ kind: page.kind ?? "page", ...page });

  for (const story of getPublishedStories()) {
    add({
      path: `/story/${story.slug}`,
      kind: "story",
      expect: "index",
      file: "app/(site)/story/[slug]/page.tsx",
      params: { slug: story.slug },
      schema: "news",
      sourceFile: "app/(site)/story/[slug]/page.tsx",
    });
    add({
      path: `/featured/${story.slug}`,
      kind: "featured-story",
      expect: "noindex",
      file: "app/(site)/featured/[slug]/page.tsx",
      params: { slug: story.slug },
    });
  }

  for (const category of CATEGORIES) {
    const total = getByCategory(category.slug).length;
    add({
      path: `/category/${category.slug}`,
      kind: "category",
      expect: "index",
      file: "app/(site)/category/[slug]/page.tsx",
      params: { slug: category.slug },
      schema: "listing",
      sourceFile: "app/(site)/category/[slug]/browse.tsx",
    });
    for (const page of listingPageParams([{ slug: category.slug, total }])) {
      add({
        path: `/category/${category.slug}/page/${page.page}`,
        kind: "category-page",
        expect: "noindex",
        file: "app/(site)/category/[slug]/page/[page]/page.tsx",
        params: { slug: category.slug, page: page.page },
      });
    }
  }

  for (const state of STATES) {
    const total = getByState(state.code).length;
    add({
      path: `/state/${state.slug}`,
      kind: "state",
      expect: "index",
      file: "app/(site)/state/[slug]/page.tsx",
      params: { slug: state.slug },
      schema: "listing",
      sourceFile: "app/(site)/state/[slug]/browse.tsx",
    });
    for (const page of listingPageParams([{ slug: state.slug, total }])) {
      add({
        path: `/state/${state.slug}/page/${page.page}`,
        kind: "state-page",
        expect: "noindex",
        file: "app/(site)/state/[slug]/page/[page]/page.tsx",
        params: { slug: state.slug, page: page.page },
      });
    }
  }

  for (const country of COUNTRIES) {
    const total = getByCountry(country.code).length;
    add({
      path: `/country/${country.slug}`,
      kind: "country",
      expect: countryIsIndexable(country.code) ? "index" : "noindex",
      file: "app/(site)/country/[slug]/page.tsx",
      params: { slug: country.slug },
      schema: countryIsIndexable(country.code) ? "listing" : undefined,
      sourceFile: "app/(site)/country/[slug]/browse.tsx",
    });
    for (const page of listingPageParams([{ slug: country.slug, total }])) {
      add({
        path: `/country/${country.slug}/page/${page.page}`,
        kind: "country-page",
        expect: "noindex",
        file: "app/(site)/country/[slug]/page/[page]/page.tsx",
        params: { slug: country.slug, page: page.page },
      });
    }
  }

  const hubs = getHubIndex();
  for (const hub of [...hubs.stateCategories, ...hubs.cities, ...hubs.topics]) {
    const file = hubFile(hub.path, false);
    const params = { ...hub.params };
    add({
      path: hub.path,
      kind: hub.kind,
      expect: hub.indexable ? "index" : "noindex",
      file,
      params,
      schema: hub.indexable ? "listing" : undefined,
      sourceFile: "components/hub-browse.tsx",
    });
  }
  for (const { hub, page } of [
    ...hubPageParams(hubs.stateCategories),
    ...hubPageParams(hubs.cities),
    ...hubPageParams(hubs.topics),
  ]) {
    add({
      path: pagePath(hub.path, Number(page)),
      kind: `${hub.kind}-page`,
      expect: "noindex",
      file: hubFile(hub.path, true),
      params: { ...hub.params, page },
    });
  }

  const kidTotal = getKidStories().length;
  for (const page of archivePageParams(kidTotal)) {
    add({
      path: `/kids/page/${page.page}`,
      kind: "kids-page",
      expect: "noindex",
      file: "app/(site)/kids/page/[page]/page.tsx",
      params: { page: page.page },
    });
  }
  for (const place of kidPlaces()) {
    const file = place.kind === "state" ? "app/(site)/kids/state/[slug]/page.tsx" : "app/(site)/kids/country/[slug]/page.tsx";
    const pageFile = place.kind === "state" ? "app/(site)/kids/state/[slug]/page/[page]/page.tsx" : "app/(site)/kids/country/[slug]/page/[page]/page.tsx";
    add({
      path: place.path,
      kind: "kid-place",
      expect: "index",
      file,
      params: { slug: place.slug },
      schema: "listing",
      sourceFile: "app/(site)/kids/place-browse.tsx",
    });
    const total = place.kind === "state" ? kidStoriesInState(place.code).length : kidStoriesInCountry(place.code).length;
    for (const page of listingPageParams([{ slug: place.slug, total }])) {
      add({
        path: `${place.path}/page/${page.page}`,
        kind: "kid-place-page",
        expect: "noindex",
        file: pageFile,
        params: { slug: place.slug, page: page.page },
      });
    }
  }

  const storyTotal = getPublishedStories().length;
  for (const page of archivePageParams(storyTotal)) {
    add({
      path: `/stories/page/${page.page}`,
      kind: "stories-page",
      expect: "noindex",
      file: "app/(site)/stories/page/[page]/page.tsx",
      params: { page: page.page },
    });
  }

  for (const week of weeksToPrerender()) {
    add({
      path: week.path,
      kind: "week",
      expect: "index",
      file: "app/(site)/week/[start]/page.tsx",
      params: { start: week.start },
      schema: "listing",
      sourceFile: "app/(site)/week/[start]/page.tsx",
    });
  }
  for (const quiz of quizzesToPrerender()) {
    add({
      path: quiz.path,
      kind: "quiz",
      expect: "index",
      file: "app/(site)/quiz/[start]/page.tsx",
      params: { start: quiz.start },
      schema: "entity",
      sourceFile: "app/(site)/quiz/[start]/page.tsx",
    });
  }
  for (const pack of packsToPrerender()) {
    add({
      path: pack.path,
      kind: "classroom",
      expect: "index",
      file: "app/(site)/classroom/week/[start]/page.tsx",
      params: { start: pack.start },
      schema: "entity",
      sourceFile: "app/(site)/classroom/week/[start]/page.tsx",
    });
  }
  for (const edition of loadSpanishEditions()) {
    add({
      path: edition.path,
      kind: "spanish-edition",
      expect: "index",
      file: "app/es/buenas-noticias/[start]/page.tsx",
      params: { start: edition.start },
      schema: "listing",
      sourceFile: "app/es/buenas-noticias/[start]/page.tsx",
    });
  }
  for (const explainer of getPublishedExplainers()) {
    add({
      path: explainerPath(explainer.slug),
      kind: "explainer",
      expect: "index",
      file: "app/(site)/explainers/[slug]/page.tsx",
      params: { slug: explainer.slug },
      schema: "entity",
      sourceFile: "app/(site)/explainers/[slug]/page.tsx",
    });
  }
  for (const dayPath of allOnThisDayPaths()) {
    add({
      path: dayPath,
      kind: "on-this-day",
      expect: "index",
      file: "app/(site)/on-this-day/[monthDay]/page.tsx",
      params: { monthDay: dayPath.slice("/on-this-day/".length) },
      schema: "entity",
      sourceFile: "app/(site)/on-this-day/[monthDay]/page.tsx",
    });
  }
  for (const edition of listWebStories()) {
    add({
      path: edition.path,
      kind: "web-story",
      expect: "index",
      amp: true,
      schema: "news",
      sourceFile: "lib/web-stories.ts",
    });
  }

  const calendar = getCalendarView();
  const calendarWindow = new Set(calendar.upcoming.map((item) => item.path));
  for (const observance of listObservances()) {
    const page = getObservancePage(observance.slug);
    const indexable = Boolean(page && page.stories.length >= MIN_CALENDAR_STORIES && calendarWindow.has(page.path));
    add({
      path: `${CALENDAR_PATH}/${observance.slug}`,
      kind: "calendar",
      expect: indexable ? "index" : "noindex",
      file: "app/(site)/calendar/[slug]/page.tsx",
      params: { slug: observance.slug },
      schema: indexable ? "entity" : undefined,
      sourceFile: "app/(site)/calendar/[slug]/page.tsx",
    });
  }

  for (const day of loadAnnouncementDays()) {
    if (day.kind === "weekend" || isWeekend(day.date)) {
      add({
        path: `${MORNING_ANNOUNCEMENTS_PATH}/${day.date}`,
        kind: "announcement-weekend",
        expect: "redirect",
        file: "app/(site)/morning-announcements/[date]/page.tsx",
        params: { date: day.date },
      });
      continue;
    }
    const indexable = day.kind === "script" && day.script.indexable;
    add({
      path: day.path,
      kind: "announcement",
      expect: indexable ? "index" : "noindex",
      file: "app/(site)/morning-announcements/[date]/page.tsx",
      params: { date: day.date },
      schema: indexable ? "entity" : undefined,
      sourceFile: "app/(site)/morning-announcements/[date]/page.tsx",
    });
  }

  for (const challenge of getKindnessChallenges()) {
    add({
      path: challenge.path,
      kind: "kindness",
      expect: "index",
      file: "app/(site)/kindness-challenge/[start]/page.tsx",
      params: { start: challenge.week },
      schema: "entity",
      sourceFile: "app/(site)/kindness-challenge/[start]/page.tsx",
    });
  }
  for (const month of shoutoutMonthsToPrerender()) {
    const indexable = classesForMonth(month).length > 0;
    add({
      path: shoutoutsPath(month),
      kind: "shoutouts",
      expect: indexable ? "index" : "noindex",
      file: "app/(site)/kindness-ambassadors/shoutouts/[month]/page.tsx",
      params: { month },
      schema: indexable ? "entity" : undefined,
      sourceFile: "app/(site)/kindness-ambassadors/shoutouts/[month]/page.tsx",
    });
  }
  for (const month of ballotMonths()) {
    const ballot = getBallot(month);
    const dated = `/good-neighbor/${month}`;
    const alias = ballot && ballot.canonicalPath !== dated;
    add({
      path: dated,
      kind: "good-neighbor-month",
      expect: alias ? "alias" : "index",
      aliasTarget: alias ? ballot.canonicalPath : undefined,
      file: "app/(site)/good-neighbor/[month]/page.tsx",
      params: { month },
      schema: alias ? undefined : "entity",
      sourceFile: "components/good-neighbor-view.tsx",
    });
  }
  for (const edition of indexesToPrerender()) {
    add({
      path: edition.path,
      kind: "index-edition",
      expect: "index",
      file: "app/(site)/good-news-index/[month]/page.tsx",
      params: { month: edition.month },
      schema: "entity",
      sourceFile: "components/good-news-edition.tsx",
    });
  }
  for (const outlet of getOutlets()) {
    if (!outlet.pagePath) continue;
    add({
      path: outlet.pagePath,
      kind: "outlet",
      expect: "index",
      file: "app/(site)/sources/[slug]/page.tsx",
      params: { slug: outlet.slug },
      schema: "listing",
      sourceFile: "app/(site)/sources/[slug]/page.tsx",
    });
  }
  return routes;
}

function hubFile(hubPath: string, paged: boolean): string {
  if (hubPath.startsWith("/topic/")) {
    return paged ? "app/(site)/topic/[slug]/page/[page]/page.tsx" : "app/(site)/topic/[slug]/page.tsx";
  }
  if (hubPath.includes("/city/")) {
    if (hubPath.startsWith("/country/")) {
      return paged
        ? "app/(site)/country/[slug]/city/[city]/page/[page]/page.tsx"
        : "app/(site)/country/[slug]/city/[city]/page.tsx";
    }
    return paged ? "app/(site)/state/[slug]/city/[city]/page/[page]/page.tsx" : "app/(site)/state/[slug]/city/[city]/page.tsx";
  }
  return paged ? "app/(site)/state/[slug]/[category]/page/[page]/page.tsx" : "app/(site)/state/[slug]/[category]/page.tsx";
}

async function evaluateRoute(route: RouteSpec): Promise<Evaluated> {
  const base: Evaluated = {
    ...route,
    title: "",
    rawTitle: "",
    description: "",
    indexed: route.expect !== "noindex" && route.expect !== "redirect",
    languages: {},
    ogImages: [],
    ogConvention: true,
  };
  if (route.home) {
    base.rawTitle = `${siteConfig.name} · ${siteConfig.seoTitle}`;
    base.title = base.rawTitle;
    base.description = siteConfig.description;
    base.canonical = "/";
    base.languages = { en: "/", "x-default": "/" };
    base.indexed = true;
    base.ogImages = ["/opengraph-image"];
    return base;
  }
  if (route.amp) {
    const edition = listWebStories().find((item) => item.path === route.path);
    if (!edition) {
      base.failed = "missing web story";
      return base;
    }
    let html = "";
    try {
      html = renderWebStoryDocument(edition);
    } catch (error) {
      base.failed = error instanceof Error ? error.message : "web story render failed";
      return base;
    }
    base.rawTitle = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    base.title = base.rawTitle;
    base.description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const located = locate(canonical);
    base.canonical = located?.path;
    base.canonicalExternal = located?.external;
    base.indexed = /<meta name="robots" content="([^"]*)"/.test(html) ? !html.match(/<meta name="robots" content="([^"]*)"/)?.[1]?.includes("noindex") : true;
    const languages: Record<string, string> = {};
    for (const match of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)) {
      const alternate = locate(match[2]);
      if (alternate && !alternate.external && match[1]) languages[match[1]] = alternate.path;
    }
    base.languages = languages;
    const poster = html.match(/poster-portrait-src="([^"]+)"/)?.[1];
    base.ogImages = poster ? [poster] : [];
    base.ogConvention = false;
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!json) base.failed = "web story is missing JSON-LD";
    else {
      try {
        const data = JSON.parse(json.replace(/\\u003c/g, "<"));
        const problems = jsonLdProblems(data, ["NewsArticle"]);
        if (problems.length) base.failed = problems.join("; ");
      } catch {
        base.failed = "web story JSON-LD does not parse";
      }
    }
    return base;
  }
  if (!route.file) {
    base.failed = "no page module";
    return base;
  }
  try {
    const mod = await loadModule(route.file);
    let meta: Metadata;
    if (mod.generateMetadata && (route.params || route.searchParams || !mod.metadata)) {
      meta = await mod.generateMetadata({
        params: route.params ? Promise.resolve(route.params) : undefined,
        searchParams: route.searchParams ? Promise.resolve(route.searchParams) : undefined,
      });
    } else if (mod.metadata) meta = mod.metadata;
    else throw new Error("page does not export metadata");
    const title = renderTitle(meta.title, false);
    base.rawTitle = title.raw;
    base.title = title.rendered;
    base.description = typeof meta.description === "string" ? meta.description : "";
    const canonical = locate(meta.alternates?.canonical);
    base.canonical = canonical?.path;
    base.canonicalExternal = canonical?.external;
    base.indexed = allowsIndex(meta.robots);
    base.languages = languageMap(meta.alternates);
    const images = [...imageList(meta.openGraph?.images), ...imageList(meta.twitter?.images)];
    base.ogImages = images.length ? images : ["/opengraph-image"];
    base.ogConvention = images.length === 0;
    return base;
  } catch (error) {
    const target = redirectTarget(error);
    if (target) {
      const located = locate(target);
      base.redirectTo = located?.path ?? target;
      base.indexed = false;
      return base;
    }
    base.failed = error instanceof Error ? error.message : "metadata threw";
    return base;
  }
}

function resourcePaths(): Set<string> {
  const paths = new Set<string>([
    "/sitemap.xml",
    "/robots.txt",
    "/news-sitemap.xml",
    "/rss.xml",
    "/atom.xml",
    "/smartnews.xml",
    "/world/rss.xml",
    "/kids/rss.xml",
    "/week/rss.xml",
    "/follow-ups/rss.xml",
    "/es/rss.xml",
    "/embed.js",
    CALENDAR_ICS_PATH,
    "/api/subscribe",
    "/api/submit",
    "/api/cheer",
    "/api/good-neighbor",
    "/api/search",
    "/publisher-logo.png",
    "/icon",
    "/apple-icon",
    "/opengraph-image",
  ]);
  for (const category of CATEGORIES) paths.add(`/category/${category.slug}/rss.xml`);
  for (const state of STATES) {
    paths.add(`/state/${state.slug}/rss.xml`);
    paths.add(`/embed/${state.slug}`);
  }
  paths.add("/embed/latest");
  for (const country of COUNTRIES) paths.add(`/country/${country.slug}/rss.xml`);
  for (const edition of indexesToPrerender()) paths.add(edition.csvPath);
  return paths;
}

function redirectSources(): Map<string, string> {
  const redirects = new Map<string, string>();
  for (const state of STATES) {
    const source = `/state/${state.code.toLowerCase()}`;
    const target = `/state/${state.slug}`;
    if (source !== target) redirects.set(source, target);
  }
  for (const country of COUNTRIES) {
    const source = `/country/${country.code.toLowerCase()}`;
    const target = `/country/${country.slug}`;
    if (source !== target) redirects.set(source, target);
  }
  return redirects;
}

function walkFiles(dir: string, acc: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else if (/\.(tsx|ts|md|mdx)$/.test(entry.name)) acc.push(full);
  }
}

function scanHrefs(files: string[], accept: (from: string, href: string) => void) {
  const attr = /(?:href|src)\s*=\s*(?:\{\s*)?["']([^"']+)["']/g;
  const markdown = /\[[^\]]*\]\(([^)\s]+)\)/g;
  // SVG maps rewrite `href="/state/…"` prefixes. Those strings are not links.
  function consider(from: string, href: string) {
    if (!href || href.includes("${")) return;
    const pathOnly = href.split(/[?#]/)[0] ?? "";
    if (pathOnly.length > 1 && pathOnly.endsWith("/")) return;
    accept(from, href);
  }
  for (const file of files) {
    if (file.endsWith(`${path.sep}lib${path.sep}seo-audit.ts`) || file.endsWith(`${path.sep}scripts${path.sep}seo-audit.ts`)) continue;
    if (file.includes(`${path.sep}scripts${path.sep}validate-stories.ts`)) continue;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(process.cwd(), file).split(path.sep).join("/");
    for (const match of text.matchAll(attr)) consider(rel, match[1] ?? "");
    if (file.endsWith(".md") || file.endsWith(".mdx")) {
      for (const match of text.matchAll(markdown)) consider(rel, match[1] ?? "");
    }
  }
}

function checkEntityJsonLd(collector: Collector) {
  const stories = getPublishedStories();
  for (const story of stories) {
    const problems = jsonLdProblems(storyJsonLd(story), ["NewsArticle", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", `/story/${story.slug}`, `NewsArticle JSON-LD: ${problems.join("; ")}`);
  }
  for (const explainer of getPublishedExplainers()) {
    const data = explainerJsonLd(explainer);
    const required = explainer.schema === "HowTo" ? ["HowTo", "BreadcrumbList"] : ["Article", "BreadcrumbList"];
    const problems = jsonLdProblems(data, required);
    if (problems.length) collector.group("error", "jsonld-invalid", explainerPath(explainer.slug), `Explainer JSON-LD: ${problems.join("; ")}`);
  }
  for (const quiz of quizzesToPrerender()) {
    const problems = jsonLdProblems(quizJsonLd(quiz), ["Quiz", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", quiz.path, `Quiz JSON-LD: ${problems.join("; ")}`);
  }
  for (const edition of loadSpanishEditions()) {
    const problems = jsonLdProblems(spanishEditionJsonLd(edition), ["CollectionPage", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", edition.path, `Spanish edition JSON-LD: ${problems.join("; ")}`);
  }
  for (const dayPath of allOnThisDayPaths()) {
    const slug = dayPath.slice("/on-this-day/".length);
    const day = parseMonthDaySlug(slug);
    if (!day) continue;
    const problems = jsonLdProblems(onThisDayJsonLd(day), ["Article", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", dayPath, `On-this-day JSON-LD: ${problems.join("; ")}`);
  }
  for (const observance of listObservances()) {
    const page = getObservancePage(observance.slug);
    if (!page || page.stories.length < MIN_CALENDAR_STORIES) continue;
    const problems = jsonLdProblems(observanceJsonLd(page), ["Event", "Article", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", page.path, `Calendar JSON-LD: ${problems.join("; ")}`);
  }
  for (const day of indexableAnnouncementDays(loadAnnouncementDays())) {
    const problems = jsonLdProblems(announcementJsonLd(day.script), ["LearningResource", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", day.path, `Announcement JSON-LD: ${problems.join("; ")}`);
  }
  for (const challenge of getKindnessChallenges()) {
    const problems = jsonLdProblems(kindnessJsonLd(challenge), ["LearningResource", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", challenge.path, `Kindness JSON-LD: ${problems.join("; ")}`);
  }
  for (const month of ballotMonths()) {
    const ballot = getBallot(month);
    if (!ballot || ballot.canonicalPath !== `/good-neighbor/${month}`) continue;
    const problems = jsonLdProblems(ballotJsonLd(ballot), ["CollectionPage", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", ballot.canonicalPath, `Good Neighbor JSON-LD: ${problems.join("; ")}`);
  }
  const currentBallot = getBallot(editionMonth());
  if (currentBallot) {
    const problems = jsonLdProblems(ballotJsonLd(currentBallot), ["CollectionPage", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", "/good-neighbor", `Good Neighbor JSON-LD: ${problems.join("; ")}`);
  }
  for (const edition of indexesToPrerender()) {
    const problems = jsonLdProblems(indexJsonLd(edition), ["Dataset", "BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", edition.path, `Good News Index JSON-LD: ${problems.join("; ")}`);
  }
  for (const month of shoutoutMonthsToPrerender()) {
    const classes = classesForMonth(month);
    if (!classes.length) continue;
    const problems = jsonLdProblems(shoutoutsJsonLd(month, classes), ["BreadcrumbList"]);
    if (problems.length) collector.group("error", "jsonld-invalid", shoutoutsPath(month), `Shoutouts JSON-LD: ${problems.join("; ")}`);
  }
  const siteProblems = jsonLdProblems(siteGraphJsonLd(), ["NewsMediaOrganization", "WebSite"]);
  if (siteProblems.length) collector.add({ severity: "error", code: "jsonld-invalid", path: "/", message: `Site graph JSON-LD: ${siteProblems.join("; ")}` });
  const sample = listingJsonLd({
    name: "Audit sample",
    description: "A collection page used to check the shared listing schema helper.",
    path: "/stories",
    crumbs: [
      { name: "Today", path: "/" },
      { name: "Stories", path: "/stories" },
    ],
    stories: getPublishedStories().slice(0, 1),
  });
  const listingProblems = jsonLdProblems(sample, ["CollectionPage", "BreadcrumbList"]);
  if (listingProblems.length) collector.add({ severity: "error", code: "jsonld-invalid", path: "/stories", message: `Listing JSON-LD helper: ${listingProblems.join("; ")}` });
}

function checkSchemaSources(collector: Collector, routes: RouteSpec[]) {
  const files = new Set<string>();
  for (const route of routes) {
    if (route.sourceFile && (route.schema || route.sourceFile === "components/site-frame.tsx")) files.add(route.sourceFile);
  }
  files.add("components/site-frame.tsx");
  for (const file of files) {
    const text = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    if (!text.includes("JsonLd") && !text.includes("application/ld+json") && !text.includes("jsonLd")) {
      collector.add({
        severity: "error",
        code: "jsonld-missing",
        path: file,
        message: `${file} is a page type that should render JSON-LD, and it does not.`,
      });
    }
  }
}

async function loadSitemap(): Promise<{ url: string }[]> {
  const mod = (await loadModule("app/sitemap.ts")) as PageModule & { default?: () => { url: string }[] };
  if (!mod.default) throw new Error("app/sitemap.ts has no default export");
  return mod.default();
}

async function loadNewsSitemap(): Promise<string> {
  const mod = await loadModule("app/(site)/news-sitemap.xml/route.ts");
  if (!mod.GET) throw new Error("news sitemap has no GET");
  const response = await mod.GET(new Request(siteConfig.url));
  return response.text();
}

function xmlProblems(xml: string, required: string[]): string[] {
  const problems: string[] = [];
  if (!xml.startsWith("<?xml")) problems.push("missing XML declaration");
  const stripped = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(stripped)) problems.push("unescaped ampersand");
  const stack: string[] = [];
  const tags = stripped.match(/<\/?[A-Za-z0-9:_-]+(?:\s[^<>]*?)?\/?>/g) ?? [];
  for (const tag of tags) {
    if (tag.startsWith("<?") || tag.startsWith("<!")) continue;
    const name = tag.match(/<\/?([A-Za-z0-9:_-]+)/)?.[1];
    if (!name) continue;
    if (tag.startsWith("</")) {
      const open = stack.pop();
      if (open !== name) problems.push(`mismatched </${name}>`);
    } else if (!tag.endsWith("/>")) stack.push(name);
  }
  if (stack.length) problems.push(`unclosed <${stack[0]}>`);
  for (const name of required) {
    if (!stripped.includes(`<${name}`) && !stripped.includes(`<${name}>`)) problems.push(`missing <${name}>`);
  }
  return [...new Set(problems)];
}

function internalUrls(xml: string): string[] {
  const found: string[] = [];
  for (const match of xml.matchAll(/(?:href|url)="(https?:\/\/[^"]+)"/g)) found.push(match[1] ?? "");
  for (const match of xml.matchAll(/<(?:link|loc|guid)>([^<]+)<\/(?:link|loc|guid)>/g)) found.push(match[1] ?? "");
  return found;
}

async function checkFeeds(collector: Collector, valid: (pathname: string) => boolean): Promise<number> {
  const jobs: { name: string; file: string; params?: Record<string, string>; required: string[] }[] = [
    { name: "rss", file: "app/(site)/rss.xml/route.ts", required: ["rss", "channel", "title", "link"] },
    { name: "atom", file: "app/(site)/atom.xml/route.ts", required: ["feed", "title", "updated"] },
    { name: "smartnews", file: "app/(site)/smartnews.xml/route.ts", required: ["rss", "channel", "snf:logo"] },
    { name: "world-rss", file: "app/(site)/world/rss.xml/route.ts", required: ["rss", "channel"] },
    { name: "kids-rss", file: "app/(site)/kids/rss.xml/route.ts", required: ["rss", "channel"] },
    { name: "week-rss", file: "app/(site)/week/rss.xml/route.ts", required: ["rss", "channel"] },
    { name: "follow-ups", file: "app/(site)/follow-ups/rss.xml/route.ts", required: ["rss", "channel"] },
    { name: "spanish-rss", file: "app/es/rss.xml/route.ts", required: ["rss", "channel"] },
  ];
  for (const category of CATEGORIES) {
    jobs.push({
      name: `category-${category.slug}`,
      file: "app/(site)/category/[slug]/rss.xml/route.ts",
      params: { slug: category.slug },
      required: ["rss", "channel"],
    });
  }
  for (const state of STATES) {
    jobs.push({
      name: `state-${state.slug}`,
      file: "app/(site)/state/[slug]/rss.xml/route.ts",
      params: { slug: state.slug },
      required: ["rss", "channel"],
    });
  }
  for (const country of COUNTRIES) {
    jobs.push({
      name: `country-${country.slug}`,
      file: "app/(site)/country/[slug]/rss.xml/route.ts",
      params: { slug: country.slug },
      required: ["rss", "channel"],
    });
  }
  let checked = 0;
  for (const job of jobs) {
    const mod = await loadModule(job.file);
    if (!mod.GET) {
      collector.add({ severity: "error", code: "feed-invalid", message: `${job.name} has no GET handler` });
      continue;
    }
    const response = await mod.GET(new Request(siteConfig.url), job.params ? { params: Promise.resolve(job.params) } : undefined);
    const xml = await response.text();
    checked += 1;
    const problems = xmlProblems(xml, job.required);
    if (problems.length) collector.group("error", "feed-invalid", job.name, `${job.name} XML: ${problems.join("; ")}`);
    for (const href of internalUrls(xml)) {
      const located = locate(href);
      if (!located || located.external) continue;
      if (!valid(located.path)) collector.group("error", "feed-invalid", `${job.name} ${located.path}`, `Feed links to ${located.path}, which is not a page or file`);
    }
  }
  return checked;
}

function checkNewsSitemap(xml: string, collector: Collector) {
  const problems = xmlProblems(xml, ["urlset", "news:news", "news:publication"]);
  if (problems.length) collector.add({ severity: "error", code: "news-sitemap", message: `News sitemap XML: ${problems.join("; ")}` });
  const actual = new Map<string, { date?: string; title?: string; name?: string; language?: string }>();
  for (const block of xml.split("<url>").slice(1)) {
    const loc = locate(block.match(/<loc>([^<]+)<\/loc>/)?.[1])?.path;
    if (!loc) continue;
    actual.set(loc, {
      date: block.match(/<news:publication_date>([^<]+)<\/news:publication_date>/)?.[1],
      title: block.match(/<news:title>([^<]*)<\/news:title>/)?.[1],
      name: block.match(/<news:name>([^<]*)<\/news:name>/)?.[1],
      language: block.match(/<news:language>([^<]*)<\/news:language>/)?.[1],
    });
  }
  const expected = new Set<string>();
  for (const story of getPublishedStories()) {
    if (isWithinHours(story.date, NEWS_WINDOW_HOURS)) expected.add(`/story/${story.slug}`);
  }
  for (const edition of listWebStories()) {
    if (isWithinHours(edition.date, NEWS_WINDOW_HOURS)) expected.add(edition.path);
  }
  for (const path of expected) {
    if (!actual.has(path)) collector.group("error", "news-sitemap", path, `News sitemap is missing a URL from the last ${NEWS_WINDOW_HOURS} hours`);
  }
  for (const [path, item] of actual) {
    if (!expected.has(path)) collector.group("error", "news-sitemap", path, `News sitemap includes a URL outside the last ${NEWS_WINDOW_HOURS} hours`);
    if (!item.date || Number.isNaN(Date.parse(item.date))) collector.group("error", "news-sitemap", path, "News sitemap item is missing a publication date");
    if (!item.title) collector.group("error", "news-sitemap", path, "News sitemap item is missing a title");
    if (item.name !== siteConfig.name) collector.group("error", "news-sitemap", path, "News sitemap publication name does not match the site");
    if (item.language !== "en") collector.group("error", "news-sitemap", path, "News sitemap language is not en");
  }
  if (actual.size > 1000) {
    collector.add({ severity: "error", code: "news-sitemap", message: `News sitemap has ${actual.size} URLs. Google accepts at most 1,000.` });
  }
  const recentWithoutLarge = getPublishedStories().filter((story) => isWithinHours(story.date, NEWS_WINDOW_HOURS) && !storyFeedImage(story.image).large);
  if (recentWithoutLarge.length) {
    collector.add({
      severity: "warning",
      code: "discover-image",
      count: recentWithoutLarge.length,
      examples: recentWithoutLarge.slice(0, 12).map((story) => story.slug),
      message: `${recentWithoutLarge.length} stories in the news window do not have a JPEG at least 1200 pixels wide. Feeds fall back to the WebP. Large JPEGs are optional and come from npm run feed-images when the source photo is big enough.`,
    });
  }
  return actual.size;
}

function contentEdges(link: (from: string, href: string) => void) {
  const chrome = [
    "/",
    "/local",
    "/world",
    "/submit",
    "/search",
    "/subscribe",
    "/heroes",
    KINDNESS_INDEX_PATH,
    MORNING_ANNOUNCEMENTS_PATH,
    "/kids",
    "/topics",
    EXPLAINER_INDEX_PATH,
    ON_THIS_DAY_INDEX_PATH,
    CALENDAR_PATH,
    "/good-neighbor",
    newsBreakBanner.path,
    "/week",
    FOLLOW_UPS_PATH,
    "/good-news-index",
    GOOD_NEWS_MAP_PATH,
    THANKS_PATH,
    TABLE_TALK_PATH,
    "/web-stories",
    ON_THIS_DAY_TODAY_PATH,
    CLASSROOM_INDEX_PATH,
    AMBASSADORS_PATH,
    WORLD_KINDNESS_PATH,
    VETERANS_DAY_PATH,
    FIRST_RESPONDERS_DAY_PATH,
    "/rss.xml",
    "/feeds",
    "/atom.xml",
    "/about",
    "/editorial-standards",
    "/sources",
    "/corrections",
    GIVING_TUESDAY_PATH,
    "/membership",
    "/partner",
    "/featured",
    "/es",
    "/privacy",
    "/terms",
    "/contact",
    ...CATEGORIES.map((category) => `/category/${category.slug}`),
  ];
  const quiz = quizzesToPrerender().at(-1);
  if (quiz) chrome.push(quiz.path);
  for (const href of chrome) link("__chrome__", href);

  for (const state of STATES) link("/local", `/state/${state.slug}`);
  for (const country of COUNTRIES) link("/world", `/country/${country.slug}`);
  for (const topic of getHubIndex().topics) link("/topics", topic.path);
  for (const place of kidPlaces()) link("/kids", place.path);
  for (const week of weeksToPrerender()) link("/week", week.path);
  for (const item of quizzesToPrerender()) link("/quiz", item.path);
  for (const pack of packsToPrerender()) link(CLASSROOM_INDEX_PATH, pack.path);
  link("/es", "/es/buenas-noticias");
  for (const edition of loadSpanishEditions()) link("/es/buenas-noticias", edition.path);
  for (const explainer of getPublishedExplainers()) link(EXPLAINER_INDEX_PATH, explainerPath(explainer.slug));
  for (const dayPath of allOnThisDayPaths()) link(ON_THIS_DAY_INDEX_PATH, dayPath);
  for (const edition of listWebStories()) link("/web-stories", edition.path);
  for (const item of getCalendarView().upcoming) link(CALENDAR_PATH, item.path);
  for (const challenge of getKindnessChallenges()) link(KINDNESS_INDEX_PATH, challenge.path);
  for (const month of shoutoutMonthsToPrerender()) link(AMBASSADORS_PATH, shoutoutsPath(month));
  link(AMBASSADORS_PATH, AMBASSADOR_CERTIFICATE_PATH);
  for (const edition of indexesToPrerender()) link("/good-news-index", edition.path);
  for (const outlet of getOutlets()) if (outlet.pagePath) link("/sources", outlet.pagePath);

  const months = ballotMonths();
  const current = editionMonth();
  for (const month of months) link("/good-neighbor", month === current ? "/good-neighbor" : `/good-neighbor/${month}`);
  link("/good-neighbor", "/good-neighbor/winners");

  const stories = getPublishedStories();
  linkPaged("/stories", stories, (story) => `/story/${story.slug}`);
  for (const category of CATEGORIES) linkPaged(`/category/${category.slug}`, getByCategory(category.slug), (story) => `/story/${story.slug}`);
  for (const state of STATES) {
    const list = getByState(state.code);
    linkPaged(`/state/${state.slug}`, list, (story) => `/story/${story.slug}`);
    const group = getHubIndex().byStateSlug.get(state.slug);
    for (const hub of group?.categories ?? []) link(`/state/${state.slug}`, hub.path);
    for (const hub of group?.cities ?? []) link(`/state/${state.slug}`, hub.path);
    if (kidStoriesInState(state.code).length) link(`/state/${state.slug}`, `/kids/state/${state.slug}`);
  }
  for (const country of COUNTRIES) {
    linkPaged(`/country/${country.slug}`, getByCountry(country.code), (story) => `/story/${story.slug}`);
    for (const hub of getHubIndex().byCountrySlug.get(country.slug) ?? []) link(`/country/${country.slug}`, hub.path);
    if (country.code !== "US" && kidStoriesInCountry(country.code).length) link(`/country/${country.slug}`, `/kids/country/${country.slug}`);
  }
  for (const hub of [...getHubIndex().stateCategories, ...getHubIndex().cities, ...getHubIndex().topics]) {
    linkPaged(hub.path, storiesForHub(hub), (story) => `/story/${story.slug}`);
    for (const crumb of hub.crumbs) link(hub.path, crumb.path);
  }
  for (const place of kidPlaces()) {
    const list = place.kind === "state" ? kidStoriesInState(place.code) : kidStoriesInCountry(place.code);
    linkPaged(place.path, list, (story) => `/story/${story.slug}`);
    link(place.path, "/kids");
  }
  linkPaged("/kids", getKidStories(), (story) => `/story/${story.slug}`);

  for (const story of stories) {
    const from = `/story/${story.slug}`;
    if (story.category) link(from, `/category/${story.category}`);
    if (story.country === "US" && story.state) {
      const state = STATES.find((item) => item.code === story.state);
      if (state) link(from, `/state/${state.slug}`);
    } else {
      const country = COUNTRIES.find((item) => item.code === story.country);
      if (country) link(from, `/country/${country.slug}`);
    }
    for (const hubPath of hubPathsForStory(story)) link(from, hubPath);
    for (const related of relatedStories(story)) link(from, `/story/${related.slug}`);
    for (const explainer of explainersForStory(story)) link(from, explainerPath(explainer.slug));
    const outlet = getOutletForStory(story);
    if (outlet?.pagePath) link(from, outlet.pagePath);
    link(from, `/featured/${story.slug}`);
  }
  for (const explainer of getPublishedExplainers()) {
    for (const story of storiesForExplainer(explainer)) link(explainerPath(explainer.slug), `/story/${story.slug}`);
  }
  for (const edition of loadSpanishEditions()) {
    link(edition.path, edition.englishPath);
    for (const story of edition.stories) link(edition.path, story.storyPath);
  }
  for (const week of weeksToPrerender()) {
    for (const story of week.stories) link(week.path, `/story/${story.slug}`);
    if (getSpanishEdition(week.start)) link(week.path, `/es/buenas-noticias/${week.start}`);
  }
  for (const edition of listWebStories()) {
    for (const story of edition.stories) link(edition.path, `/story/${story.slug}`);
    link(edition.path, "/subscribe");
  }
  for (const observance of listObservances()) {
    const page = getObservancePage(observance.slug);
    if (!page) continue;
    for (const story of page.stories) link(page.path, `/story/${story.slug}`);
    for (const hub of page.hubs) link(page.path, hub.path);
  }
  const schoolDays = loadAnnouncementDays().filter((day) => day.kind !== "weekend");
  for (let index = 0; index < schoolDays.length; index += 1) {
    const day = schoolDays[index];
    if (!day) continue;
    const previous = schoolDays[index - 1];
    const next = schoolDays[index + 1];
    if (previous) link(day.path, previous.path);
    if (next) link(day.path, next.path);
    link(MORNING_ANNOUNCEMENTS_PATH, day.path);
  }
  for (const challenge of getKindnessChallenges()) link(challenge.path, `/story/${challenge.story.slug}`);
  for (const dayPath of allOnThisDayPaths()) {
    const slug = dayPath.slice("/on-this-day/".length);
    const day = parseMonthDaySlug(slug);
    if (!day) continue;
    for (const story of storiesForMonthDay(day.month, day.day)) link(dayPath, `/story/${story.slug}`);
  }

  function linkPaged<T>(base: string, items: T[], href: (item: T) => string) {
    const pages = pageCount(items.length);
    for (let page = 1; page <= pages; page += 1) {
      const from = pagePath(base, page);
      for (const item of pageSlice(items, page, STORY_PAGE_SIZE)) link(from, href(item));
      if (page > 1) link(from, pagePath(base, page - 1));
      if (page < pages) link(from, pagePath(base, page + 1));
    }
  }
}

export async function runSeoAudit(log: (message: string) => void = () => {}): Promise<SeoReport> {
  log("Cataloging routes");
  const routes = buildRoutes();
  const files = publicFiles();
  const resources = resourcePaths();
  const redirects = redirectSources();
  const routePaths = new Set(routes.map((route) => route.path));

  function valid(pathname: string): boolean {
    return routePaths.has(pathname) || resources.has(pathname) || redirects.has(pathname) || files.has(pathname) || isGeneratedAsset(pathname);
  }

  log(`Reading metadata for ${routes.length} routes`);
  const evaluated: Evaluated[] = [];
  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    if (!route) continue;
    if (index > 0 && index % 400 === 0) log(`Metadata ${index}/${routes.length}`);
    evaluated.push(await evaluateRoute(route));
  }

  const collector = new Collector();
  const sitemap = await loadSitemap();
  const sitemapSet = new Set<string>();
  const sitemapDupes = new Set<string>();
  for (const entry of sitemap) {
    const located = locate(entry.url);
    const pathname = located?.path ?? "";
    if (!pathname) {
      collector.add({ severity: "error", code: "sitemap-unknown", message: `Sitemap URL is not usable: ${entry.url}` });
      continue;
    }
    if (located?.external) collector.add({ severity: "error", code: "sitemap-unknown", path: pathname, message: `Sitemap URL is not on ${siteConfig.url}` });
    if (sitemapSet.has(pathname)) sitemapDupes.add(pathname);
    sitemapSet.add(pathname);
  }
  for (const pathname of sitemapDupes) {
    collector.add({ severity: "error", code: "sitemap-duplicate", path: pathname, message: `${pathname} is listed more than once in the sitemap` });
  }

  const lengthRows: { path: string; title: string; description: string; kind: string }[] = [];

  for (const route of evaluated) {
    if (route.failed && route.expect !== "redirect") {
      collector.add({ severity: "error", code: "metadata-error", path: route.path, message: `${route.path} metadata failed: ${route.failed}` });
    }
    if (route.expect === "redirect") {
      if (!route.redirectTo) collector.add({ severity: "error", code: "redirect-missing", path: route.path, message: `${route.path} should redirect and does not` });
      else if (!valid(route.redirectTo)) collector.add({ severity: "error", code: "redirect-missing", path: route.path, message: `${route.path} redirects to ${route.redirectTo}, which is not a page` });
      if (sitemapSet.has(route.path)) collector.add({ severity: "error", code: "noindex-in-sitemap", path: route.path, message: `${route.path} redirects and is still in the sitemap` });
      continue;
    }
    if (route.expect === "alias") {
      if (route.canonical !== route.aliasTarget) {
        collector.add({
          severity: "error",
          code: "canonical-mismatch",
          path: route.path,
          message: `${route.path} should canonicalize to ${route.aliasTarget}, not ${route.canonical ?? "nothing"}`,
        });
      }
      if (sitemapSet.has(route.path)) collector.add({ severity: "error", code: "non-canonical-in-sitemap", path: route.path, message: `${route.path} is an alias and is still in the sitemap` });
      continue;
    }
    if (!route.title) collector.group("error", "missing-title", route.path, "Indexable or noindex page is missing a title");
    if (!route.description) collector.group("error", "missing-description", route.path, "Page is missing a meta description");
    if (!route.canonical) collector.group("error", "missing-canonical", route.path, "Page is missing a canonical URL");
    if (route.canonicalExternal) collector.group("error", "canonical-mismatch", route.path, `Canonical URL uses ${route.canonicalExternal} instead of ${siteConfig.url}`);
    if (!route.ogImages.length) collector.group("error", "missing-og-image", route.path, "Page is missing an og:image");
    for (const image of route.ogImages) {
      const located = locate(image);
      if (!located || located.external) continue;
      if (!valid(located.path)) collector.group("error", "missing-og-image", `${route.path} ${located.path}`, `og:image ${located.path} is not a file or generated image`);
    }

    if (route.expect === "index") {
      if (!route.indexed) collector.group("error", "unexpected-noindex", route.path, "Page should be indexable and is marked noindex");
      if (route.canonical && route.canonical !== route.path) {
        collector.group("error", "canonical-mismatch", route.path, `Indexable page canonical is ${route.canonical} instead of itself`);
      }
      if (!sitemapSet.has(route.path)) collector.group("error", "missing-from-sitemap", route.path, "Indexable page is missing from the sitemap");
      lengthRows.push({ path: route.path, title: route.title, description: route.description, kind: route.kind });
    } else if (route.expect === "noindex") {
      if (route.indexed) collector.group("error", "should-noindex", route.path, "Thin, filtered, or paginated page is indexable and should be noindex");
      if (sitemapSet.has(route.path)) collector.group("error", "noindex-in-sitemap", route.path, "Noindex page is in the sitemap");
    }
  }

  for (const pathname of sitemapSet) {
    if (!routePaths.has(pathname)) collector.add({ severity: "error", code: "sitemap-unknown", path: pathname, message: `${pathname} is in the sitemap and is not a generated page` });
  }

  const indexable = evaluated.filter((route) => route.expect === "index" && route.indexed && route.canonical === route.path);
  const indexByPath = new Map(indexable.map((route) => [route.path, route]));
  for (const route of indexable) {
    const own = route.path.startsWith("/es") ? "es" : "en";
    if (route.languages[own] !== route.path) {
      collector.group("error", "hreflang-self", route.path, `hreflang ${own} should be this page and is ${route.languages[own] ?? "missing"}`);
    }
    if (!route.languages["x-default"]) collector.group("error", "hreflang-x-default", route.path, "Indexable page is missing x-default");
    else if (!routePaths.has(route.languages["x-default"])) {
      collector.group("error", "hreflang-x-default", route.path, `x-default points at ${route.languages["x-default"]}, which is not a page`);
    }
    for (const [lang, target] of Object.entries(route.languages)) {
      if (target.startsWith("external:")) {
        collector.group("error", "hreflang-target", route.path, `hreflang ${lang} points off the site`);
        continue;
      }
      if (!routePaths.has(target)) collector.group("error", "hreflang-target", `${route.path} -> ${target}`, `hreflang ${lang} points at ${target}, which is not a page`);
    }
    const paired = route.path === "/week" || route.path === "/es/buenas-noticias" || route.path.startsWith("/week/") || route.path.startsWith("/es/buenas-noticias/");
    const spanishPage = route.path === "/es" || route.path.startsWith("/es/");
    if (!paired && !spanishPage && route.languages.es) {
      collector.group("error", "hreflang-scope", route.path, "hreflang pairs a page that is not a weekly English or Spanish edition");
    }
    if (!paired && spanishPage && route.languages.en && route.languages.en !== route.path) {
      collector.group("error", "hreflang-scope", route.path, "Spanish hreflang points at an English page that is not the weekly edition");
    }
    for (const lang of ["en", "es"] as const) {
      const target = route.languages[lang];
      if (!target || target === route.path) continue;
      const other = indexByPath.get(target);
      if (!other) continue;
      const back = route.path.startsWith("/es") ? "es" : "en";
      if (other.languages[back] !== route.path) {
        collector.group("error", "hreflang-reciprocal", `${route.path} -> ${target}`, `${route.path} hreflang ${lang} points at ${target}, which does not point back`);
      }
    }
  }

  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  for (const row of lengthRows) {
    if (row.title) {
      const list = titles.get(row.title) ?? [];
      list.push(row.path);
      titles.set(row.title, list);
    }
    if (row.description) {
      const list = descriptions.get(row.description) ?? [];
      list.push(row.path);
      descriptions.set(row.description, list);
    }
    if (row.kind !== "home" && row.description === siteConfig.description) {
      collector.group("error", "duplicate-description", row.path, "Page reuses the homepage meta description");
    }
    if (row.title && row.title.length < 12) collector.group("warning", "title-length", row.path, "Rendered title is under 12 characters");
    if (row.title.length > TITLE_EXTREME) collector.group("warning", "title-length", row.path, `Rendered title is over ${TITLE_EXTREME} characters`);
    if (row.description && row.description.length < DESCRIPTION_TINY) collector.group("warning", "description-length", row.path, `Meta description is under ${DESCRIPTION_TINY} characters`);
    if (row.description.length > DESCRIPTION_EXTREME) collector.group("warning", "description-length", row.path, `Meta description is over ${DESCRIPTION_EXTREME} characters`);
  }
  for (const [title, paths] of titles) {
    if (paths.length < 2) continue;
    collector.add({
      severity: "error",
      code: "duplicate-title",
      count: paths.length,
      examples: paths.slice(0, 12),
      message: `${paths.length} indexable pages share the title “${title.slice(0, 140)}”`,
    });
  }
  for (const [description, paths] of descriptions) {
    if (paths.length < 2 || description === siteConfig.description) continue;
    collector.add({
      severity: "warning",
      code: "duplicate-description",
      count: paths.length,
      examples: paths.slice(0, 8),
      message: `${paths.length} indexable pages share one meta description: “${description.slice(0, 120)}”`,
    });
  }

  log("Checking links, images, structured data, and feeds");
  const inbound = new Set<string>();
  function link(from: string, href: string) {
    const located = locate(href);
    if (!located || located.external) return;
    const target = redirects.get(located.path) ?? located.path;
    if (valid(located.path) || valid(target)) {
      if (from !== target) inbound.add(target);
      if (redirects.has(located.path)) inbound.add(redirects.get(located.path)!);
      return;
    }
    collector.group("error", "broken-link", `${from} -> ${located.path}`, `Internal link target ${located.path} is not a page, file, feed, or redirect`);
  }
  contentEdges(link);
  const scanRoots = ["app", "components", "stories", "explainers"].map((dir) => path.join(process.cwd(), dir));
  const scanList: string[] = [];
  for (const root of scanRoots) walkFiles(root, scanList);
  scanHrefs(scanList, link);

  for (const route of evaluated) {
    if (route.expect !== "index") continue;
    if (!inbound.has(route.path)) collector.group("error", "orphan", route.path, "Indexable page has no internal link pointing at it");
  }

  for (const story of getPublishedStories()) {
    if (!files.has(story.image)) collector.group("error", "missing-image", story.image, `Story image ${story.image} is not in public/`);
    const thumb = storyThumbPath(story.image);
    if (!files.has(thumb)) collector.group("error", "missing-image", thumb, `Story thumbnail ${thumb} is not in public/`);
  }

  checkSchemaSources(collector, routes);
  checkEntityJsonLd(collector);

  const newsXml = await loadNewsSitemap();
  const newsCount = checkNewsSitemap(newsXml, collector);
  await checkFeeds(collector, valid);

  const thinCities = getHubIndex().cities.filter((hub) => hub.count < MIN_CITY_INDEX_STORIES && hub.indexable);
  for (const hub of thinCities) collector.add({ severity: "error", code: "should-noindex", path: hub.path, message: `${hub.path} has ${hub.count} stories and should stay noindex below ${MIN_CITY_INDEX_STORIES}` });
  const thinHubs = [...getHubIndex().stateCategories, ...getHubIndex().topics].filter((hub) => hub.count < MIN_HUB_STORIES);
  for (const hub of thinHubs) collector.add({ severity: "error", code: "should-noindex", path: hub.path, message: `${hub.path} has ${hub.count} stories and should not be a hub below ${MIN_HUB_STORIES}` });

  collector.finish();
  const byCode: SeoReport["byCode"] = {};
  let errorCount = 0;
  let warningCount = 0;
  for (const issue of collector.issues) {
    const count = issue.count ?? issue.examples?.length ?? 1;
    const bucket = byCode[issue.code] ?? { severity: issue.severity, count: 0 };
    bucket.count += count;
    byCode[issue.code] = bucket;
    if (issue.severity === "error") errorCount += count;
    else warningCount += count;
  }

  const sortedTitles = lengthRows
    .filter((row) => row.title)
    .map((row) => ({ path: row.path, length: row.title.length, title: row.title }))
    .sort((a, b) => a.length - b.length);

  return {
    generatedAt: new Date().toISOString(),
    site: siteConfig.url,
    routeCount: routes.length,
    indexableCount: evaluated.filter((route) => route.expect === "index").length,
    sitemapCount: sitemapSet.size,
    newsSitemapCount: newsCount,
    errorCount,
    warningCount,
    byCode,
    length: {
      indexedTitles: lengthRows.length,
      titlesOver60: lengthRows.filter((row) => row.title.length > 60).length,
      titlesOver70: lengthRows.filter((row) => row.title.length > 70).length,
      titlesUnder30: lengthRows.filter((row) => row.title.length > 0 && row.title.length < 30).length,
      indexedDescriptions: lengthRows.filter((row) => row.description).length,
      descriptionsOver160: lengthRows.filter((row) => row.description.length > 160).length,
      descriptionsUnder50: lengthRows.filter((row) => row.description.length > 0 && row.description.length < 50).length,
      longestTitles: sortedTitles.slice(-8).reverse(),
      shortestTitles: sortedTitles.slice(0, 8),
    },
    issues: collector.issues,
  };
}

export function formatSeoReport(report: SeoReport): string {
  const lines = [
    `SEO audit for ${report.site}`,
    `${report.routeCount} routes, ${report.indexableCount} indexable, ${report.sitemapCount} sitemap URLs, ${report.newsSitemapCount} news-sitemap URLs`,
    `${report.errorCount} errors, ${report.warningCount} warnings`,
    "",
    "Title length among indexable pages (rendered, including the site suffix when the template adds it):",
    `  under 30 characters: ${report.length.titlesUnder30}`,
    `  over 60: ${report.length.titlesOver60}`,
    `  over 70: ${report.length.titlesOver70}`,
    `Descriptions under 50: ${report.length.descriptionsUnder50}; over 160: ${report.length.descriptionsOver160}`,
    "Story headlines are full sentences, so crossing 60 characters is recorded here and is not, by itself, a failure.",
    "",
  ];
  const codes = Object.entries(report.byCode).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [code, info] of codes) lines.push(`${info.severity.toUpperCase()} ${code}: ${info.count}`);
  lines.push("");
  for (const issue of report.issues) {
    const count = issue.count ?? issue.examples?.length;
    lines.push(`- [${issue.severity}] ${issue.code}${count && count > 1 ? ` (${count})` : ""}: ${issue.message}`);
    for (const example of issue.examples ?? []) lines.push(`    ${example}`);
    if (issue.path && !issue.examples?.length) lines.push(`    ${issue.path}`);
  }
  return `${lines.join("\n")}\n`;
}
