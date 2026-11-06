/**
 * Press kit at /press.
 *
 * Boilerplate, facts, and contact come from site.config. Logos are the brand
 * files the site already serves. Sample stories are recent featured or
 * high-quality pieces already in the archive. The page does not declare a
 * second NewsMediaOrganization. The layout already emits that graph.
 */
import {
  FAVICON_SIZES,
  SMARTNEWS_LOGO,
  SMARTNEWS_LOGO_DARK,
  SQUARE_LOGO,
  SQUARE_LOGO_TRANSPARENT,
  faviconPath,
} from "./brand";
import { absoluteUrl, PUBLISHER_LOGO } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { siteConfig } from "@/site.config";

export const PRESS_PATH = "/press";

export const PRESS_TITLE = "Press";

export const PRESS_SAMPLE_LIMIT = 5;

export function pressDescription(): string {
  return `Logos, boilerplate, and contact for journalists, producers, and news apps. ${siteConfig.description}`;
}

export function pressBoilerplate(): string {
  return [
    `${siteConfig.name}. ${siteConfig.tagline}.`,
    siteConfig.description,
    siteConfig.verification,
    `${siteConfig.editor.name}. ${siteConfig.editor.blurb}`,
    `${siteConfig.name} is owned by ${siteConfig.owner.name}.`,
    `Contact: ${siteConfig.contactEmail}.`,
  ].join(" ");
}

export type PressFact = { term: string; detail: string };

export function pressFacts(): PressFact[] {
  return [
    {
      term: "Coverage",
      detail: "All 50 states, Washington, D.C., and countries around the world.",
    },
    {
      term: "Politics",
      detail: "No politics. No candidates, parties, elections, or culture-war topics.",
    },
    {
      term: "Sources",
      detail: "Every story links the original report.",
    },
    {
      term: "Contact",
      detail: siteConfig.contactEmail,
    },
    {
      term: "Owner",
      detail: siteConfig.owner.name,
    },
    {
      term: "Editors",
      detail: siteConfig.editor.name,
    },
  ];
}

export const PRESS_EDITORIAL_LINKS = [
  { href: "/about", label: "About" },
  { href: "/editorial-standards", label: "Editorial standards" },
  { href: "/corrections", label: "Corrections" },
  { href: "/feeds", label: "Feeds" },
  { href: "/sources", label: "Sources" },
] as const;

export type PressLogo = {
  id: string;
  label: string;
  href: string;
  width: number;
  height: number;
  note: string;
  dark?: boolean;
};

export function pressLogos(): PressLogo[] {
  return [
    {
      id: "square",
      label: "Square logo",
      href: SQUARE_LOGO.path,
      width: SQUARE_LOGO.width,
      height: SQUARE_LOGO.height,
      note: "1024 by 1024, cream background.",
    },
    {
      id: "square-transparent",
      label: "Square logo, transparent",
      href: SQUARE_LOGO_TRANSPARENT.path,
      width: SQUARE_LOGO_TRANSPARENT.width,
      height: SQUARE_LOGO_TRANSPARENT.height,
      note: "1024 by 1024, no background.",
    },
    {
      id: "publisher",
      label: "Publisher logo",
      href: PUBLISHER_LOGO.path,
      width: PUBLISHER_LOGO.width,
      height: PUBLISHER_LOGO.height,
      note: "Wide wordmark used in feeds and structured data.",
    },
    {
      id: "smartnews",
      label: "SmartNews logo",
      href: SMARTNEWS_LOGO.path,
      width: SMARTNEWS_LOGO.width,
      height: SMARTNEWS_LOGO.height,
      note: "700 by 100, for a light background.",
    },
    {
      id: "smartnews-dark",
      label: "SmartNews logo, dark",
      href: SMARTNEWS_LOGO_DARK.path,
      width: SMARTNEWS_LOGO_DARK.width,
      height: SMARTNEWS_LOGO_DARK.height,
      note: "700 by 100, for a dark background.",
      dark: true,
    },
    ...FAVICON_SIZES.map((size) => ({
      id: `favicon-${size}`,
      label: `Favicon, ${size} pixels`,
      href: faviconPath(size),
      width: size,
      height: size,
      note: "Square mark.",
    })),
    {
      id: "apple",
      label: "Apple touch icon",
      href: "/apple-icon",
      width: 180,
      height: 180,
      note: "Home-screen icon.",
    },
  ];
}

type PressSampleSource = {
  slug: string;
  title: string;
  date: string;
  featured?: boolean;
  top5?: number;
};

/**
 * Newest featured stories first, then ranked Top 5, then the newest of the rest.
 * At most five. The list is for a press kit, not a new ranking.
 */
export function pressSamples<T extends PressSampleSource>(stories: T[]): T[] {
  const ranked = stories.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (featured !== 0) return featured;
    const rank = (a.top5 ?? 99) - (b.top5 ?? 99);
    if (rank !== 0) return rank;
    return a.title.localeCompare(b.title);
  });
  const featured = ranked.filter((story) => story.featured);
  const top = ranked.filter((story) => !story.featured && story.top5);
  const rest = ranked.filter((story) => !story.featured && !story.top5);
  return [...featured, ...top, ...rest].slice(0, PRESS_SAMPLE_LIMIT);
}

export function getPressSamples(): Story[] {
  return pressSamples(getPublishedStories());
}

export function pressJsonLd(samples: { slug: string; title: string }[]) {
  const url = absoluteUrl(PRESS_PATH);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: PRESS_TITLE,
        description: pressDescription(),
        url,
        inLanguage: "en-US",
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        about: { "@id": `${siteConfig.url}/#organization` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: samples.length,
          itemListElement: samples.map((story, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: story.title,
            url: absoluteUrl(`/story/${story.slug}`),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Press", item: url },
        ],
      },
    ],
  };
}
