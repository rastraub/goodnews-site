/**
 * Weekly Spanish Top 5. Each edition is a JSON file a person can read and correct.
 * Nothing here calls a translation API or writes Spanish at request time.
 */
import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { z } from "zod";
import { editionYear } from "./format";
import { editionLanguageAlternates, weekIndexLanguageAlternates } from "./i18n";
import { spanishPlaceLabel } from "./spanish-place";
import { absoluteUrl, pageAlternates, publishedIso, xHandle } from "./seo";
import { getStory, type Story } from "./stories";
import { addDays, getPublishedWeeks, parseIsoDate, weekStart, type WeekRoundup, type WeekSource } from "./weeks";
import { siteConfig } from "@/site.config";

export const SPANISH_TRANSLATION_NOTE =
  `Resúmenes traducidos del inglés por el equipo de ${siteConfig.name}. Las fuentes originales están en inglés.`;

export const SPANISH_EDITIONS_DIR = path.join(process.cwd(), "data", "es", "buenas-noticias");

const EDITION_STORY_COUNT = 5;

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const editionStorySchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    headline: z.string().trim().min(12).max(180),
    summary: z.string().trim().min(80).max(1400),
    kidLine: z.string().trim().min(20).max(320).optional(),
  })
  .strict();

const editionFileSchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    stories: z.array(editionStorySchema).length(EDITION_STORY_COUNT),
  })
  .strict();

export type SpanishEditionFile = z.infer<typeof editionFileSchema>;

export type SpanishEditionStory = {
  slug: string;
  headline: string;
  summary: string;
  kidLine?: string;
  place: string;
  sourceName: string;
  sourceUrl: string;
  storyPath: string;
  image: string;
  imageAlt: string;
  imageTreatment: Story["imageTreatment"];
  date: string;
};

export type SpanishEdition = {
  start: string;
  end: string;
  path: string;
  englishPath: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  intro: string;
  stories: SpanishEditionStory[];
  image: string;
  imageAlt: string;
  latest: string;
};

/** "del 5 al 11 de octubre de 2026" or "del 26 de octubre al 1 de noviembre de 2026". */
export function formatSpanishWeekRange(start: string, end: string): string {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (!from || !to) return `${start} al ${end}`;
  if (from.y === to.y && from.m === to.m) {
    return `del ${from.d} al ${to.d} de ${MONTHS[from.m - 1]} de ${from.y}`;
  }
  if (from.y === to.y) {
    return `del ${from.d} de ${MONTHS[from.m - 1]} al ${to.d} de ${MONTHS[to.m - 1]} de ${from.y}`;
  }
  return `del ${from.d} de ${MONTHS[from.m - 1]} de ${from.y} al ${to.d} de ${MONTHS[to.m - 1]} de ${to.y}`;
}

export function spanishSentenceCount(text: string): number {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function editionIntro(inProgress: boolean): string {
  const lead = inProgress ? "Hasta ahora, cinco noticias buenas de esta semana." : "Cinco noticias buenas de esta semana.";
  return `${lead} Cada resumen está en español y enlaza a la nota original en inglés.`;
}

function editionTitle(rangeLabel: string, inProgress: boolean): string {
  return inProgress ? `Las 5 buenas noticias, hasta ahora: ${rangeLabel}` : `Las 5 buenas noticias: ${rangeLabel}`;
}

/**
 * Kid-friendly stories first, then a story of the day, then Today's Top 5,
 * then the world pick, then cheers, then the newest.
 * The editor still drops anything violent, political, or upsetting before writing the file.
 */
export function compareSpanishCandidates(a: WeekSource, b: WeekSource): number {
  const tier = (story: WeekSource) => (story.kidFriendly ? 0 : 1);
  const byTier = tier(a) - tier(b);
  if (byTier !== 0) return byTier;
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  const rank = (a.top5 ?? 99) - (b.top5 ?? 99);
  if (rank !== 0) return rank;
  if (a.worldPick !== b.worldPick) return a.worldPick ? -1 : 1;
  const cheers = (b.cheers ?? 0) - (a.cheers ?? 0);
  if (cheers !== 0) return cheers;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.title.localeCompare(b.title);
}

export function suggestSpanishStories<T extends WeekSource>(stories: T[], limit = 8): T[] {
  return stories.slice().sort(compareSpanishCandidates).slice(0, limit);
}

function readEditionFile(filePath: string): SpanishEditionFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not parse JSON";
    throw new Error(`${path.basename(filePath)}: ${message}`);
  }
  const result = editionFileSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`${path.basename(filePath)}: ${details}`);
  }
  return result.data;
}

function buildEdition(file: SpanishEditionFile, weeks: Map<string, WeekRoundup<Story>>): SpanishEdition {
  const errors: string[] = [];
  const filename = `${file.start}.json`;
  if (weekStart(file.start) !== file.start) errors.push(`${filename}: ${file.start} is not a Monday`);
  const week = weeks.get(file.start);
  if (!week) errors.push(`${filename}: ${file.start} is not a published week page`);
  const slugs = new Set<string>();
  const stories: SpanishEditionStory[] = [];
  for (const entry of file.stories) {
    if (slugs.has(entry.slug)) errors.push(`${filename}: duplicate slug ${entry.slug}`);
    slugs.add(entry.slug);
    const story = getStory(entry.slug);
    if (!story) {
      errors.push(`${filename}: no published story for ${entry.slug}`);
      continue;
    }
    if (weekStart(story.date) !== file.start) {
      errors.push(`${filename}: ${entry.slug} is dated ${story.date}, outside ${file.start}`);
    }
    const summarySentences = spanishSentenceCount(entry.summary);
    if (summarySentences < 2 || summarySentences > 4) {
      errors.push(`${filename}: ${entry.slug} summary has ${summarySentences} sentences; write 2 to 4`);
    }
    if (/[.!?…]$/.test(entry.headline)) {
      errors.push(`${filename}: ${entry.slug} headline should not end with punctuation`);
    }
    const kidSentences = entry.kidLine ? spanishSentenceCount(entry.kidLine) : 0;
    if (story.kidFriendly && !entry.kidLine) {
      errors.push(`${filename}: ${entry.slug} is kid-friendly and needs kidLine`);
    }
    if (!story.kidFriendly && entry.kidLine) {
      errors.push(`${filename}: ${entry.slug} is not kid-friendly, so leave kidLine off`);
    }
    if (entry.kidLine && (kidSentences < 1 || kidSentences > 2)) {
      errors.push(`${filename}: ${entry.slug} kidLine should be 1 or 2 sentences`);
    }
    stories.push({
      slug: entry.slug,
      headline: entry.headline,
      summary: entry.summary,
      kidLine: entry.kidLine,
      place: spanishPlaceLabel(story),
      sourceName: story.sourceName,
      sourceUrl: story.sourceUrl,
      storyPath: `/story/${story.slug}`,
      image: story.image,
      imageAlt: story.imageAlt,
      imageTreatment: story.imageTreatment,
      date: story.date,
    });
  }
  if (errors.length || stories.length !== EDITION_STORY_COUNT) {
    throw new Error(`Spanish edition ${file.start} failed:\n- ${errors.join("\n- ") || "expected 5 stories"}`);
  }
  const end = addDays(file.start, 6);
  const inProgress = week?.inProgress ?? false;
  const rangeLabel = formatSpanishWeekRange(file.start, end);
  const latest = stories.reduce((max, story) => (story.date > max ? story.date : max), stories[0]?.date ?? file.start);
  const photo = stories[0];
  return {
    start: file.start,
    end,
    path: `/es/buenas-noticias/${file.start}`,
    englishPath: `/week/${file.start}`,
    inProgress,
    rangeLabel,
    title: editionTitle(rangeLabel, inProgress),
    heading: `${editionTitle(rangeLabel, inProgress)}.`,
    intro: editionIntro(inProgress),
    stories,
    image: photo.image,
    imageAlt: photo.imageAlt,
    latest,
  };
}

let cache: SpanishEdition[] | null = null;

export function loadSpanishEditions(): SpanishEdition[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  if (!fs.existsSync(SPANISH_EDITIONS_DIR)) {
    throw new Error(`Missing Spanish editions at ${SPANISH_EDITIONS_DIR}`);
  }
  const files = fs.readdirSync(SPANISH_EDITIONS_DIR).filter((file) => file.endsWith(".json")).sort();
  const weeks = new Map(getPublishedWeeks().map((week) => [week.start, week]));
  const editions: SpanishEdition[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const data = readEditionFile(path.join(SPANISH_EDITIONS_DIR, file));
    if (file !== `${data.start}.json`) {
      throw new Error(`${file}: filename must match start ${data.start}`);
    }
    if (seen.has(data.start)) throw new Error(`${file}: duplicate edition ${data.start}`);
    seen.add(data.start);
    editions.push(buildEdition(data, weeks));
  }
  const slugs = new Map<string, string>();
  for (const edition of editions) {
    for (const story of edition.stories) {
      const previous = slugs.get(story.slug);
      if (previous) throw new Error(`${story.slug} is in both ${previous} and ${edition.start}`);
      slugs.set(story.slug, edition.start);
    }
  }
  editions.sort((a, b) => (a.start < b.start ? -1 : 1));
  cache = editions;
  return editions;
}

export function getSpanishEdition(start: string): SpanishEdition | undefined {
  return loadSpanishEditions().find((edition) => edition.start === start);
}

/** Published English weeks that do not yet have a Spanish file. Oldest first. */
export function missingSpanishWeeks(): WeekRoundup<Story>[] {
  const have = new Set(loadSpanishEditions().map((edition) => edition.start));
  return getPublishedWeeks().filter((week) => !have.has(week.start));
}

export function spanishIndexTitle(): string {
  return "Las 5 buenas noticias de la semana";
}

export function spanishIndexDescription(count: number): string {
  if (!count) return "Cada semana, cinco buenas noticias en español. Las fuentes originales están en inglés.";
  const editions = count === 1 ? "1 edición semanal" : `${count} ediciones semanales`;
  return `${editions} de buenas noticias en español. Cada una tiene cinco historias y enlaza a la nota original en inglés.`;
}

export function spanishLandingDescription(): string {
  return "Buenas noticias en español para familias y salones de clase. Cada semana, cinco historias con enlace a la nota original en inglés.";
}

export function spanishPageMeta(options: {
  title: string;
  description: string;
  path: string;
  languages: Record<string, string>;
  image?: { url: string; alt: string };
}): Metadata {
  const title = options.title;
  return {
    title,
    description: options.description,
    alternates: pageAlternates(options.path, "/es/rss.xml", options.languages),
    openGraph: {
      type: "website",
      url: options.path,
      title,
      description: options.description,
      locale: "es_LA",
      alternateLocale: ["en_US"],
      siteName: siteConfig.name,
      ...(options.image
        ? { images: [{ url: options.image.url, alt: options.image.alt, type: "image/webp" as const }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: xHandle(),
      title,
      description: options.description,
      ...(options.image ? { images: [options.image.url] } : {}),
    },
  };
}

export function spanishIndexLanguages(): Record<string, string> {
  return weekIndexLanguageAlternates();
}

export function spanishEditionLanguages(start: string): Record<string, string> {
  return editionLanguageAlternates(start);
}

type Crumb = { name: string; path: string };

function breadcrumbNode(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function spanishLandingJsonLd() {
  const path = "/es";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${siteConfig.name} en español`,
        description: spanishLandingDescription(),
        url: absoluteUrl(path),
        inLanguage: "es",
        isPartOf: { "@id": `${siteConfig.url}/#website` },
      },
      breadcrumbNode([
        { name: "Inicio", path: "/es" },
      ]),
    ],
  };
}

export function spanishIndexJsonLd(editions: SpanishEdition[]) {
  const path = "/es/buenas-noticias";
  const description = spanishIndexDescription(editions.length);
  const newestFirst = editions.slice().reverse();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: spanishIndexTitle(),
        description,
        url: absoluteUrl(path),
        inLanguage: "es",
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        mainEntity: {
          "@type": "ItemList",
          inLanguage: "es",
          numberOfItems: newestFirst.length,
          itemListElement: newestFirst.map((edition, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: edition.title,
            url: absoluteUrl(edition.path),
          })),
        },
      },
      breadcrumbNode([
        { name: "Inicio", path: "/es" },
        { name: "Buenas noticias", path },
      ]),
    ],
  };
}

export function spanishEditionJsonLd(edition: SpanishEdition) {
  const url = absoluteUrl(edition.path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: edition.title,
        description: edition.intro,
        url,
        inLanguage: "es",
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        mainEntity: {
          "@type": "ItemList",
          inLanguage: "es",
          numberOfItems: edition.stories.length,
          itemListElement: edition.stories.map((story, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "NewsArticle",
              "@id": `${url}#${story.slug}`,
              headline: story.headline,
              description: story.summary,
              inLanguage: "es",
              image: [absoluteUrl(story.image)],
              datePublished: publishedIso(story.date),
              isAccessibleForFree: true,
              url: `${url}#${story.slug}`,
              mainEntityOfPage: { "@type": "WebPage", "@id": url },
              isBasedOn: absoluteUrl(story.storyPath),
              citation: story.sourceUrl,
              author: {
                "@type": "Organization",
                name: siteConfig.name,
                url: siteConfig.url,
              },
              publisher: {
                "@type": "NewsMediaOrganization",
                name: siteConfig.name,
                url: siteConfig.url,
              },
              contentLocation: {
                "@type": "Place",
                name: story.place,
              },
            },
          })),
        },
      },
      breadcrumbNode([
        { name: "Inicio", path: "/es" },
        { name: "Buenas noticias", path: "/es/buenas-noticias" },
        { name: edition.rangeLabel, path: edition.path },
      ]),
    ],
  };
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

/** One item per Spanish edition file, newest first. The file is the edition, including the open week. */
export function renderSpanishRss(editions: SpanishEdition[] = loadSpanishEditions()): string {
  const newestFirst = editions.slice().sort((a, b) => (a.start < b.start ? 1 : -1));
  const self = absoluteUrl("/es/rss.xml");
  const updated = newestFirst[0] ? new Date(publishedIso(newestFirst[0].latest)).toUTCString() : new Date().toUTCString();
  const items = newestFirst
    .map((edition) => {
      const link = absoluteUrl(edition.path);
      const image = absoluteUrl(edition.image);
      const stories = edition.stories
        .map((story) => {
          const kid = story.kidLine ? `<p><em>${escapeXml(story.kidLine)}</em></p>` : "";
          return `<h2>${escapeXml(story.headline)}</h2><p>${escapeXml(story.place)}</p><p>${escapeXml(story.summary)}</p>${kid}<p>Fuente: <a href="${escapeXml(story.sourceUrl)}">${escapeXml(story.sourceName)}</a></p><p><a href="${escapeXml(absoluteUrl(story.storyPath))}">Leer la nota en inglés</a></p>`;
        })
        .join("");
      const html = `<p>${escapeXml(edition.intro)}</p><p>${escapeXml(SPANISH_TRANSLATION_NOTE)}</p>${stories}`;
      return `<item>
      <title>${escapeXml(edition.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(publishedIso(edition.latest)).toUTCString()}</pubDate>
      <description>${escapeXml(edition.intro)}</description>
      <content:encoded>${cdata(html)}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.name)}</dc:creator>
      <media:content url="${escapeXml(image)}" medium="image" type="image/webp">
        <media:title>${escapeXml(edition.title)}</media:title>
        <media:description>${escapeXml(edition.imageAlt)}</media:description>
      </media:content>
      <enclosure url="${escapeXml(image)}" type="image/webp" />
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`${siteConfig.name}: Buenas noticias en español`)}</title>
    <link>${absoluteUrl("/es/buenas-noticias")}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml("Cinco buenas noticias por semana, en español. Cada edición enlaza a las notas originales en inglés.")}</description>
    <language>es</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <copyright>© ${editionYear()} ${escapeXml(siteConfig.name)}</copyright>
    <managingEditor>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.name})`)}</managingEditor>
    <webMaster>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.name})`)}</webMaster>
    ${items}
  </channel>
</rss>`;
}
