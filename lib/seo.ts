import type { Metadata } from "next";
import { getCategory } from "./categories";
import { getStateByCode } from "./states";
import type { Story } from "./stories";
import { siteConfig, socialLinks } from "@/site.config";

/** About 3:00 a.m. Mountain Daylight Time, when the morning edition goes out. */
export function publishedIso(date: string): string {
  return `${date}T09:00:00.000Z`;
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

/** Canonical plus feed links. Setting canonical alone would drop the layout feed tags. */
export function pageAlternates(path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: path === "" ? "/" : path,
    types: feedTypes,
  };
}

export function xHandle(): string {
  return `@${siteConfig.social.x}`;
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
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(PUBLISHER_LOGO.path),
          width: PUBLISHER_LOGO.width,
          height: PUBLISHER_LOGO.height,
        },
        sameAs: socialLinks().map((social) => social.href),
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
  const url = absoluteUrl(`/story/${story.slug}`);
  const image = absoluteUrl(story.image);
  const published = publishedIso(story.date);
  const crumbs: Crumb[] = [{ name: "Today", path: "/" }];
  if (category) crumbs.push({ name: category.label, path: `/category/${category.slug}` });
  if (state) crumbs.push({ name: state.name, path: `/state/${state.slug}` });
  crumbs.push({ name: story.title, path: `/story/${story.slug}` });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        headline: story.title,
        description: story.dek,
        image: [image],
        thumbnailUrl: image,
        datePublished: published,
        dateModified: published,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        articleSection: category?.label,
        keywords: [state?.name, story.city, category?.label].filter(Boolean).join(", "),
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
          logo: {
            "@type": "ImageObject",
            url: absoluteUrl(PUBLISHER_LOGO.path),
            width: PUBLISHER_LOGO.width,
            height: PUBLISHER_LOGO.height,
          },
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
}) {
  const listed = options.stories.slice(0, 40);
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
          numberOfItems: options.stories.length,
          itemListElement: listed.map((story, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: story.title,
            url: absoluteUrl(`/story/${story.slug}`),
          })),
        },
      },
      breadcrumbNode(options.crumbs),
    ],
  };
}
