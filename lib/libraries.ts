/**
 * The free library shelf. Paths that already exist are linked.
 * Large print is always offered, even when that page is still on another branch.
 * Wire and briefing are linked only after their pages exist, so a patron
 * is not sent to a missing address.
 */
import fs from "fs";
import path from "path";
import { absoluteUrl } from "./seo";
import { siteConfig } from "@/site.config";

export const LIBRARIES_PATH = "/libraries";

export type LibraryTool = {
  href: string;
  label: string;
  note: string;
};

const CORE_TOOLS: LibraryTool[] = [
  {
    href: "/large-print",
    label: "Large-print edition",
    note: "Bigger type for a reading room, a display monitor, or a patron who wants a calmer page.",
  },
  {
    href: "/kids",
    label: "Stories for kids",
    note: "Short stories an adult can read with a child. Those pages do not ask for a child's name.",
  },
  {
    href: "/classroom",
    label: "Good News Friday",
    note: "A printable pack for a Friday storytime or a class visit.",
  },
  {
    href: "/morning-announcements",
    label: "Morning announcements",
    note: "A one-minute script. It also works as the opening of a storytime.",
  },
  {
    href: "/kindness-challenge",
    label: "Kindness Challenge",
    note: "A week of small actions a branch can post beside the shelf.",
  },
];

const LATER_TOOLS: LibraryTool[] = [
  {
    href: "/wire",
    label: "Newsroom wire",
    note: "A short wire of the day's stories.",
  },
  {
    href: "/briefing",
    label: "Briefing",
    note: "A short briefing a desk can leave on a table.",
  },
];

export function routePageExists(href: string): boolean {
  const parts = href.split("/").filter(Boolean);
  return fs.existsSync(path.join(process.cwd(), "app", "(site)", ...parts, "page.tsx"));
}

export function libraryTools(): { ready: LibraryTool[]; upcoming: LibraryTool[] } {
  const upcoming = LATER_TOOLS.filter((tool) => !routePageExists(tool.href));
  const ready = [...CORE_TOOLS, ...LATER_TOOLS.filter((tool) => routePageExists(tool.href))];
  return { ready, upcoming };
}

export function libraryBulletin(): string {
  return [
    "The library's Good News Shelf points to free, verified stories. No account and no fee.",
    `Start here: ${absoluteUrl(LIBRARIES_PATH)}`,
    `Large print: ${absoluteUrl("/large-print")}`,
    `Stories for kids: ${absoluteUrl("/kids")}`,
    `Shared from ${siteConfig.name}.`,
  ].join("\n");
}

export function libraryJsonLd() {
  const { ready } = libraryTools();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `Good News Shelf for libraries`,
        description: `A free kit for public libraries from ${siteConfig.name}: a printable shelf talker, large print, and stories for kids. No account and no patron data.`,
        url: absoluteUrl(LIBRARIES_PATH),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en-US",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: ready.length,
          itemListElement: ready.map((tool, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: tool.label,
            url: absoluteUrl(tool.href),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Library shelf", item: absoluteUrl(LIBRARIES_PATH) },
        ],
      },
    ],
  };
}
