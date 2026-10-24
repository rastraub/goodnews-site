import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { SQUARE_LOGO } from "./brand";
import { explainerSchema, type ExplainerFrontmatter } from "./explainer-schema";
import { readingMinutes } from "./format";
import { absoluteUrl, PUBLISHER_LOGO, publishedIso } from "./seo";
import { compareStories, getPublishedStories, loadAllStories, type Story } from "./stories";
import { siteConfig } from "@/site.config";

/** How many archive stories an explainer page lists. */
export const EXPLAINER_ARCHIVE_LIMIT = 6;

/** How many "Learn how this works" links a story page shows. */
export const EXPLAINER_STORY_LINK_LIMIT = 2;

export const EXPLAINER_INDEX_PATH = "/explainers";

export const EXPLAINER_INDEX_TITLE = "Good News Explainers";

export const EXPLAINER_INDEX_DESCRIPTION =
  "Plain-language guides to the kinds of help that show up in the archive, from community fridges and Honor Flights to foster programs and home repair.";

export type Explainer = ExplainerFrontmatter & {
  slug: string;
  body: string;
  minutes: number;
};

const EXPLAINERS_DIR = path.join(process.cwd(), "explainers");

let cache: Explainer[] | null = null;

export function explainersDirectory(): string {
  return EXPLAINERS_DIR;
}

export function loadExplainers(): Explainer[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;

  if (!fs.existsSync(EXPLAINERS_DIR)) {
    throw new Error(`Missing explainers directory at ${EXPLAINERS_DIR}`);
  }

  const files = fs.readdirSync(EXPLAINERS_DIR).filter((file) => file.endsWith(".md"));
  const errors: string[] = [];
  const explainers: Explainer[] = [];
  const slugs = new Set<string>();
  const knownStories = new Set(loadAllStories().map((story) => story.slug));
  const published = new Set(getPublishedStories().map((story) => story.slug));

  for (const file of files) {
    const slug = file.slice(0, -3);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push(`${file}: filename must be kebab-case`);
      continue;
    }
    if (slugs.has(slug)) errors.push(`${file}: duplicate slug ${slug}`);
    slugs.add(slug);

    const raw = fs.readFileSync(path.join(EXPLAINERS_DIR, file), "utf8");
    const parsed = matter(raw);
    const result = explainerSchema.safeParse(parsed.data);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      errors.push(`${file}: ${details}`);
      continue;
    }

    const data = result.data;
    const body = parsed.content.trim();
    const words = body.split(/\s+/).filter(Boolean).length;
    if (words < 220) {
      errors.push(`${file}: body should be a real explainer (at least 220 words)`);
    }
    if (!body.includes("\n## ") && !body.startsWith("## ")) {
      errors.push(`${file}: body needs ## sections such as What it is and How it works`);
    }
    for (const storySlug of [...data.includeStories, ...data.excludeStories]) {
      if (!knownStories.has(storySlug)) {
        errors.push(`${file}: unknown story slug ${storySlug}`);
      }
    }
    for (const storySlug of data.includeStories) {
      if (knownStories.has(storySlug) && !published.has(storySlug)) {
        errors.push(`${file}: includeStories ${storySlug} is not a published story`);
      }
    }
    const allowed = new Set([...data.sources.map((source) => source.url), ...data.howToHelp.map((item) => item.url)]);
    for (const url of bodyLinks(body)) {
      if (url.startsWith("/")) {
        if (!url.startsWith("/explainers")) {
          errors.push(`${file}: internal link ${url} should stay under /explainers`);
        }
        continue;
      }
      if (!allowed.has(url)) {
        errors.push(`${file}: body link ${url} is not in sources or howToHelp`);
      }
    }

    explainers.push({
      ...data,
      slug,
      body,
      minutes: readingMinutes(`${data.dek}\n${body}\n${data.kidSummary}\n${data.safety.join(" ")}`),
    });
  }

  if (errors.length) {
    throw new Error(`Explainer validation failed:\n- ${errors.join("\n- ")}`);
  }

  explainers.sort((a, b) => a.title.localeCompare(b.title));
  cache = explainers;
  return explainers;
}

export function getPublishedExplainers(): Explainer[] {
  return loadExplainers().filter((explainer) => !explainer.draft);
}

export function getExplainer(slug: string): Explainer | undefined {
  return getPublishedExplainers().find((explainer) => explainer.slug === slug);
}

export function explainerPath(slug: string): string {
  return `${EXPLAINER_INDEX_PATH}/${slug}`;
}

export function explainerPaths(): string[] {
  return [EXPLAINER_INDEX_PATH, ...getPublishedExplainers().map((explainer) => explainerPath(explainer.slug))];
}

function bodyLinks(body: string): string[] {
  return [...body.matchAll(/\[[^\]]+\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g)].map((match) => match[1] ?? "");
}

type Hit = { title: boolean; dek: boolean; body: boolean };

function keywordHit(story: Story, keyword: string): Hit {
  const needle = keyword.toLowerCase();
  const title = `${story.title} ${story.shortTitle ?? ""}`.toLowerCase();
  return {
    title: title.includes(needle),
    dek: story.dek.toLowerCase().includes(needle),
    body: story.body.toLowerCase().includes(needle),
  };
}

/**
 * A published story is related when it is not excluded and any of these is true:
 * - its slug is pinned in includeStories
 * - a multi-word keyword appears in the title or deck
 * - any keyword appears in the title or deck and the story shares a tag
 * - a multi-word keyword appears in the body and the story shares a tag
 *
 * Single words are not matched in the body, so an incidental "foster" or "liver"
 * does not attach the wrong explainer. Image credits are not searched.
 */
export function explainerMatchesStory(explainer: Explainer, story: Story): boolean {
  if (explainer.excludeStories.includes(story.slug)) return false;
  if (explainer.includeStories.includes(story.slug)) return true;
  const shared = explainer.tags.some((tag) => story.tags.includes(tag));
  for (const keyword of explainer.keywords) {
    const phrase = keyword.includes(" ");
    const hit = keywordHit(story, keyword);
    if (phrase && (hit.title || hit.dek)) return true;
    if (shared && (hit.title || hit.dek)) return true;
    if (phrase && shared && hit.body) return true;
  }
  return false;
}

function matchScore(explainer: Explainer, story: Story): number {
  const pin = explainer.includeStories.indexOf(story.slug);
  if (pin >= 0) return 1_000 - pin;
  let score = 0;
  const shared = explainer.tags.filter((tag) => story.tags.includes(tag)).length;
  score += shared * 2;
  for (const keyword of explainer.keywords) {
    const phrase = keyword.includes(" ");
    const hit = keywordHit(story, keyword);
    if (hit.title) score += phrase ? 8 : 5;
    else if (hit.dek) score += phrase ? 4 : 3;
    else if (phrase && hit.body) score += 2;
  }
  return score;
}

export function storiesForExplainer(explainer: Explainer, limit = EXPLAINER_ARCHIVE_LIMIT): Story[] {
  const matched = getPublishedStories().filter((story) => explainerMatchesStory(explainer, story));
  const pins = explainer.includeStories.flatMap((slug) => matched.filter((story) => story.slug === slug));
  const pinned = new Set(pins.map((story) => story.slug));
  const rest = matched
    .filter((story) => !pinned.has(story.slug))
    .sort((a, b) => matchScore(explainer, b) - matchScore(explainer, a) || compareStories(a, b));
  return [...pins, ...rest].slice(0, limit);
}

export function explainersForStory(story: Story, limit = EXPLAINER_STORY_LINK_LIMIT): Explainer[] {
  return getPublishedExplainers()
    .filter((explainer) => explainerMatchesStory(explainer, story))
    .sort((a, b) => matchScore(b, story) - matchScore(a, story) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function explainersForTag(tag: string): Explainer[] {
  return getPublishedExplainers().filter((explainer) => explainer.tags.includes(tag));
}

export function explainerModifiedDate(explainer: Explainer): string {
  const newestStory = storiesForExplainer(explainer).reduce((latest, story) => (story.date > latest ? story.date : latest), explainer.date);
  const updated = explainer.updated ?? explainer.date;
  return newestStory > updated ? newestStory : updated;
}

function crumbList(crumbs: { name: string; path: string }[]) {
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

function publisherNode() {
  return {
    "@type": "NewsMediaOrganization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(PUBLISHER_LOGO.path),
      width: PUBLISHER_LOGO.width,
      height: PUBLISHER_LOGO.height,
    },
  };
}

function authorNode() {
  return {
    "@type": "Organization",
    name: siteConfig.editor.name,
    url: absoluteUrl("/about#masthead"),
  };
}

function explainerImage(explainer: Explainer) {
  return [
    {
      "@type": "ImageObject",
      url: absoluteUrl(SQUARE_LOGO.path),
      width: SQUARE_LOGO.width,
      height: SQUARE_LOGO.height,
    },
    absoluteUrl(`${explainerPath(explainer.slug)}/opengraph-image`),
  ];
}

export function explainerJsonLd(explainer: Explainer) {
  const url = absoluteUrl(explainerPath(explainer.slug));
  const published = publishedIso(explainer.date);
  const modified = publishedIso(explainer.updated ?? explainer.date);
  const crumbs = [
    { name: "Today", path: "/" },
    { name: "Explainers", path: EXPLAINER_INDEX_PATH },
    { name: explainer.title, path: explainerPath(explainer.slug) },
  ];
  const article = {
    "@type": explainer.schema === "HowTo" ? "HowTo" : "Article",
    "@id": `${url}#article`,
    headline: explainer.title,
    name: explainer.title,
    description: explainer.dek,
    image: explainerImage(explainer),
    datePublished: published,
    dateModified: modified,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    articleSection: "Explainers",
    keywords: explainer.keywords.join(", "),
    author: authorNode(),
    publisher: publisherNode(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    citation: explainer.sources.map((source) => source.url),
    ...(explainer.schema === "HowTo"
      ? {
          step: (explainer.steps ?? []).map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.name,
            text: step.text,
            url: `${url}#step-${index + 1}`,
          })),
        }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [article, crumbList(crumbs)],
  };
}

export function explainerIndexJsonLd(explainers = getPublishedExplainers()) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: EXPLAINER_INDEX_TITLE,
        description: EXPLAINER_INDEX_DESCRIPTION,
        url: absoluteUrl(EXPLAINER_INDEX_PATH),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: explainers.length,
          itemListElement: explainers.map((explainer, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: explainer.title,
            url: absoluteUrl(explainerPath(explainer.slug)),
          })),
        },
      },
      crumbList([
        { name: "Today", path: "/" },
        { name: "Explainers", path: EXPLAINER_INDEX_PATH },
      ]),
    ],
  };
}
