import type { Metadata } from "next";
import { SQUARE_LOGO } from "./brand";
import { getCategory } from "./categories";
import { getCountry } from "./countries";
import { storyFeedImage } from "./feed-image";
import { hreflangAlternates } from "./i18n";
import { pageCount, pagePath } from "./paging";
import { getStateByCode } from "./states";
import { compareStories, getPublishedStories, type Story } from "./stories";
import { ownerPlace, siteConfig, socialLinks } from "@/site.config";

/** About 3:00 a.m. Mountain Daylight Time, when the morning edition goes out. */
export function publishedIso(date: string): string {
  return `${date}T09:00:00.000Z`;
}

/**
 * Stories filed on the same calendar day share one edition time.
 * The batch is staggered by one second so two items never share atom:updated.
 * A correction has no clock time in the file, so dateModified is 12 hours later.
 */
export function storyPublishedIso(story: Pick<Story, "date" | "slug">): string {
  const base = Date.parse(publishedIso(story.date));
  return new Date(base + editionIndex(story.slug) * 1000).toISOString();
}

export function storyModifiedIso(story: Pick<Story, "date" | "slug" | "correction">): string {
  const published = Date.parse(storyPublishedIso(story));
  if (!story.correction) return new Date(published).toISOString();
  return new Date(published + 12 * 60 * 60 * 1000).toISOString();
}

let editionStories: Story[] | undefined;
let editionIndexes: Map<string, number> | undefined;

function editionIndex(slug: string): number {
  const stories = getPublishedStories();
  if (stories !== editionStories || !editionIndexes) {
    const map = new Map<string, number>();
    const groups = new Map<string, Story[]>();
    for (const story of stories) {
      const list = groups.get(story.date);
      if (list) list.push(story);
      else groups.set(story.date, [story]);
    }
    for (const list of groups.values()) {
      list.sort(compareStories);
      list.forEach((story, index) => map.set(story.slug, index));
    }
    editionStories = stories;
    editionIndexes = map;
  }
  return editionIndexes.get(slug) ?? 0;
}

export function isWithinHours(date: string, hours: number, now = Date.now()): boolean {
  const published = Date.parse(publishedIso(date));
  if (Number.isNaN(published)) return false;
  const age = now - published;
  return age >= 0 && age <= hours * 60 * 60 * 1000;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return siteConfig.url;
  return `${siteConfig.url}${normalized}`;
}

export const PUBLISHER_LOGO = {
  path: "/publisher-logo.png",
  width: 600,
  height: 60,
} as const;

const feedTypes = {
  "application/rss+xml": "/rss.xml",
  "application/atom+xml": "/atom.xml",
} as const;

/**
 * Canonical, hreflang, and feed links.
 * Setting canonical alone would drop the layout feed tags.
 * `feedPath` points a section at its own RSS file.
 */
export function pageAlternates(path: string, feedPath?: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: path === "" ? "/" : path,
    languages: hreflangAlternates(path),
    types: feedPath
      ? { "application/rss+xml": feedPath, "application/atom+xml": "/atom.xml" }
      : feedTypes,
  };
}

export function xHandle(): string {
  return `@${siteConfig.social.x}`;
}

export function listingMeta(options: {
  title: string;
  description: string;
  base: string;
  page: number;
  total: number;
  feedPath?: string;
  image?: { url: string; alt: string; width?: number; height?: number; type?: "image/jpeg" | "image/webp" };
}): Metadata {
  const path = pagePath(options.base, options.page);
  const pages = pageCount(options.total);
  const title = options.page > 1 ? `${options.title} (page ${options.page})` : options.title;
  const pagination: { previous?: string; next?: string } = {};
  if (options.page > 1) pagination.previous = pagePath(options.base, options.page - 1);
  if (options.page < pages) pagination.next = pagePath(options.base, options.page + 1);
  return {
    title,
    description: options.description,
    alternates: pageAlternates(path, options.feedPath),
    ...(pagination.previous || pagination.next ? { pagination } : {}),
    ...(options.image
      ? {
          openGraph: {
            url: path,
            title,
            description: options.description,
            images: [
              {
                url: options.image.url,
                alt: options.image.alt,
                type: options.image.type ?? "image/webp",
                ...(options.image.width && options.image.height
                  ? { width: options.image.width, height: options.image.height }
                  : {}),
              },
            ],
          },
          twitter: {
            card: "summary_large_image" as const,
            site: xHandle(),
            title,
            description: options.description,
            images: [options.image.url],
          },
        }
      : {}),
  };
}

type Crumb = { name: string; path: string };

function ownerAddress() {
  const place = ownerPlace();
  if (!place) return undefined;
  return {
    "@type": "PostalAddress" as const,
    addressLocality: place.city,
    addressRegion: place.state,
  };
}

/** SBBnet, Inc. News apps read this as the publication's parent organization. */
function ownerOrganization(withId: boolean) {
  const address = ownerAddress();
  return {
    "@type": "Organization" as const,
    ...(withId ? { "@id": `${siteConfig.url}/#owner` } : {}),
    name: siteConfig.owner.name,
    email: siteConfig.contactEmail,
    ...(address ? { address } : {}),
  };
}

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

export function siteGraphJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        email: siteConfig.contactEmail,
        logo: [
          {
            "@type": "ImageObject",
            url: absoluteUrl(SQUARE_LOGO.path),
            width: SQUARE_LOGO.width,
            height: SQUARE_LOGO.height,
          },
          {
            "@type": "ImageObject",
            url: absoluteUrl(PUBLISHER_LOGO.path),
            width: PUBLISHER_LOGO.width,
            height: PUBLISHER_LOGO.height,
          },
        ],
        sameAs: socialLinks().map((social) => social.href),
        parentOrganization: { "@id": `${siteConfig.url}/#owner` },
        publishingPrinciples: absoluteUrl("/editorial-standards"),
        correctionsPolicy: absoluteUrl("/corrections"),
        actionableFeedbackPolicy: absoluteUrl("/contact"),
        masthead: absoluteUrl("/about#masthead"),
        ownershipFundingInfo: absoluteUrl("/about#funding"),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "editorial",
          email: siteConfig.contactEmail,
          url: absoluteUrl("/contact"),
        },
      },
      ownerOrganization(true),
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#editorial-team`,
        name: siteConfig.editor.name,
        description: siteConfig.editor.blurb,
        url: absoluteUrl("/about#masthead"),
        parentOrganization: { "@id": `${siteConfig.url}/#organization` },
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en-US",
        publisher: { "@id": `${siteConfig.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function storyJsonLd(story: Story) {
  const category = getCategory(story.category);
  const state = getStateByCode(story.state);
  const country = getCountry(story.country);
  const url = absoluteUrl(`/story/${story.slug}`);
  const served = storyFeedImage(story.image);
  const image = absoluteUrl(served.path);
  const published = storyPublishedIso(story);
  const modified = storyModifiedIso(story);
  const crumbs: Crumb[] = [{ name: "Today", path: "/" }];
  if (category) crumbs.push({ name: category.label, path: `/category/${category.slug}` });
  if (story.country !== "US" && country) crumbs.push({ name: country.name, path: `/country/${country.slug}` });
  else if (state) crumbs.push({ name: state.name, path: `/state/${state.slug}` });
  crumbs.push({ name: story.title, path: `/story/${story.slug}` });
  const placeName = story.country === "US" && state ? `${story.city}, ${state.name}` : `${story.city}, ${country?.name ?? story.country}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        headline: story.title,
        description: story.dek,
        image: [
          served.width > 0
            ? { "@type": "ImageObject", url: image, width: served.width, height: served.height }
            : image,
        ],
        thumbnailUrl: image,
        datePublished: published,
        dateModified: modified,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        articleSection: category?.label,
        keywords: [story.country === "US" ? state?.name : country?.name, story.city, category?.label].filter(Boolean).join(", "),
        contentLocation: {
          "@type": "Place",
          name: placeName,
          address: {
            "@type": "PostalAddress",
            addressLocality: story.city,
            ...(state ? { addressRegion: state.code } : {}),
            addressCountry: story.country,
          },
        },
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          description: siteConfig.editor.blurb,
          url: absoluteUrl("/about#masthead"),
        },
        publisher: {
          "@type": "NewsMediaOrganization",
          name: siteConfig.name,
          url: siteConfig.url,
          email: siteConfig.contactEmail,
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl(PUBLISHER_LOGO.path),
            width: PUBLISHER_LOGO.width,
            height: PUBLISHER_LOGO.height,
          },
          parentOrganization: ownerOrganization(false),
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        citation: story.sourceUrl,
        isBasedOn: story.sourceUrl,
      },
      breadcrumbNode(crumbs),
    ],
  };
}

export function listingJsonLd(options: {
  name: string;
  description: string;
  path: string;
  crumbs: Crumb[];
  stories: Pick<Story, "slug" | "title">[];
  /** When set, the list is these pages instead of stories. Used by the week index. */
  items?: { name: string; path: string }[];
  /** Defaults to 40 so a long archive does not emit a huge list. */
  listLimit?: number;
}) {
  const entries = options.items
    ? options.items.map((item) => ({ name: item.name, url: absoluteUrl(item.path) }))
    : options.stories.map((story) => ({ name: story.title, url: absoluteUrl(`/story/${story.slug}`) }));
  const listed = entries.slice(0, options.listLimit ?? 40);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: options.name,
        description: options.description,
        url: absoluteUrl(options.path),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: entries.length,
          itemListElement: listed.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.name,
            url: entry.url,
          })),
        },
      },
      breadcrumbNode(options.crumbs),
    ],
  };
}
