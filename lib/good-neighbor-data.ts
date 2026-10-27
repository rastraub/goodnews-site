/**
 * Ballots, recorded winners, and the overrides file.
 * Vote totals here come from the file store only. Upstash is read by the
 * API route so a page render never opens a network connection.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { getCategory } from "./categories";
import {
  badgeLabel,
  editionMonth,
  goodNeighborPath,
  monthLabel,
  monthName,
  nextMonthKey,
  NOMINEE_MAX,
  overrideProblems,
  selectNominees,
  VOTE_LAST_DAY,
  votingOpen,
  winnerSlug,
  type BallotNominee,
  type GoodNeighborOverrides,
  type GoodNeighborSource,
} from "./good-neighbor";
import { absoluteUrl } from "./seo";
import { placeLabel } from "./present";
import { readFileCounts, voteMode, type VoteMode } from "./good-neighbor-store";
import { getPublishedStories, type Story } from "./stories";
import { editionDay } from "./world-pick";
import { siteConfig } from "@/site.config";

const OVERRIDES_PATH = path.join(process.cwd(), "data", "good-neighbor.json");

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const monthEntrySchema = z
  .object({
    pin: z.array(slug).max(NOMINEE_MAX).optional(),
    exclude: z.array(slug).optional(),
    winner: slug.optional(),
  })
  .strict();

const fileSchema = z.record(z.string().regex(/^\d{4}-\d{2}$/), monthEntrySchema);

let cachedOverrides: GoodNeighborOverrides | null = null;
let cachedWinners: { edition: string; mode: VoteMode; winners: RecordedWinner[] } | null = null;

export type RecordedWinner = {
  month: string;
  slug: string;
  label: string;
  href: string;
};

export type Ballot = {
  month: string;
  monthName: string;
  monthLabel: string;
  path: string;
  canonicalPath: string;
  open: boolean;
  votesEnabled: boolean;
  editorWinner?: string;
  nominees: BallotNominee[];
  title: string;
  description: string;
  lede: string;
  note: string;
  nextOpens?: string;
};

function countWord(count: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  return words[count] ?? String(count);
}

export function loadGoodNeighborOverrides(): GoodNeighborOverrides {
  if (process.env.NODE_ENV === "production" && cachedOverrides) return cachedOverrides;
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8")) as unknown;
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`data/good-neighbor.json: ${details}`);
  }
  const overrides: GoodNeighborOverrides = parsed.data;
  const problems = overrideProblems(getPublishedStories(), overrides);
  if (problems.length) {
    throw new Error(`data/good-neighbor.json:\n- ${problems.join("\n- ")}`);
  }
  cachedOverrides = overrides;
  return overrides;
}

function toNominee(story: GoodNeighborSource & Story & { pinned: boolean }): BallotNominee {
  const category = getCategory(story.category);
  return {
    slug: story.slug,
    title: story.title,
    shortTitle: story.shortTitle ?? story.title,
    dek: story.dek,
    date: story.date,
    place: placeLabel(story),
    categoryLabel: category?.label ?? story.category,
    categoryColor: category?.color ?? "#24537F",
    image: story.image,
    imageAlt: story.imageAlt,
    imageTreatment: story.imageTreatment,
    sourceName: story.sourceName,
    kidSummary: story.kidSummary,
  };
}

export function ballotMonths(now = new Date()): string[] {
  const current = editionMonth(now);
  const stories = getPublishedStories();
  const overrides = loadGoodNeighborOverrides();
  const keys = new Set<string>();
  for (const story of stories) {
    if (!story.draft && story.date.slice(0, 7) <= current) keys.add(story.date.slice(0, 7));
  }
  return [...keys].filter((month) => selectNominees(stories, month, overrides).length > 0).sort();
}

export function getBallot(monthKey: string, now = new Date()): Ballot | undefined {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return undefined;
  const today = editionDay(now);
  const current = today.slice(0, 7);
  if (monthKey > current) return undefined;
  const stories = getPublishedStories();
  const overrides = loadGoodNeighborOverrides();
  const picked = selectNominees(stories, monthKey, overrides);
  if (!picked.length) return undefined;
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const nominees = picked.flatMap((nominee) => {
    const story = bySlug.get(nominee.slug);
    return story ? [toNominee({ ...story, pinned: nominee.pinned })] : [];
  });
  if (!nominees.length) return undefined;
  const open = votingOpen(monthKey, today);
  const enabled = voteMode() !== "off";
  const name = monthName(monthKey);
  const label = monthLabel(monthKey);
  const many = countWord(nominees.length);
  const next = nextMonthKey(monthKey);
  const nextOpens = !open && monthKey === current && next ? `${monthName(next)} 1` : undefined;
  const editorWinner = overrides[monthKey]?.winner;
  const title = `Good Neighbor of ${name}`;
  const description = open
    ? enabled
      ? `${title}: one vote per browser through ${name} ${VOTE_LAST_DAY}. Neighbors who did something kind for their community.`
      : `${title}: cheer your favorite through ${name} ${VOTE_LAST_DAY}. One cheer in this browser.`
    : `${title}. Voting closed on ${name} ${VOTE_LAST_DAY}. Neighbors who did something kind for their community.`;
  const countLabel = `${many.charAt(0).toUpperCase()}${many.slice(1)}`;
  const lede = open
    ? `${countLabel} neighbors who did something kind. ${
        enabled
          ? `One vote per browser, through ${name} ${VOTE_LAST_DAY}.`
          : `Cheer your favorite through ${name} ${VOTE_LAST_DAY}. One cheer in this browser.`
      }`
    : `Voting closed on ${name} ${VOTE_LAST_DAY}. These neighbors did something kind for their communities.`;
  const note = open
    ? enabled
      ? `On ${name} 26 the ballot becomes the result. Totals are public. Who voted is not.`
      : "A cheer stays in this browser. Shared totals are off until vote storage is turned on."
    : enabled
      ? `The neighbor with the most votes is Good Neighbor of ${name}.${nextOpens ? ` The next vote opens ${nextOpens}.` : ""}`
      : `Shared totals are off, so this month does not name a winner.${nextOpens ? ` The next vote opens ${nextOpens}.` : ""}`;
  return {
    month: monthKey,
    monthName: name,
    monthLabel: label,
    path: `/good-neighbor/${monthKey}`,
    canonicalPath: goodNeighborPath(monthKey, current),
    open,
    votesEnabled: enabled,
    editorWinner,
    nominees,
    title,
    description,
    lede,
    note,
    nextOpens,
  };
}

function pageCounts(month: string): Record<string, number> {
  if (voteMode() !== "file") return {};
  return readFileCounts(month);
}

/** Editor winner, or the file-store tally after the window closes. No network. */
export function recordedWinners(now = new Date()): RecordedWinner[] {
  const edition = editionDay(now);
  const mode = voteMode();
  if (process.env.NODE_ENV === "production" && cachedWinners?.edition === edition && cachedWinners.mode === mode) {
    return cachedWinners.winners;
  }
  const stories = getPublishedStories();
  const overrides = loadGoodNeighborOverrides();
  const found: { month: string; slug: string }[] = [];
  for (const month of ballotMonths(now)) {
    if (votingOpen(month, edition)) continue;
    const nominees = selectNominees(stories, month, overrides);
    const slug = winnerSlug(
      nominees.map((nominee) => ({ slug: nominee.slug, date: nominee.date })),
      pageCounts(month),
      { open: false, editorWinner: overrides[month]?.winner },
    );
    if (slug) found.push({ month, slug });
  }
  const months = found.map((item) => item.month);
  const current = edition.slice(0, 7);
  const winners = found.map((item) => ({
    month: item.month,
    slug: item.slug,
    label: badgeLabel(item.month, months),
    href: goodNeighborPath(item.month, current),
  }));
  cachedWinners = { edition, mode, winners };
  return winners;
}

export function recordedWinnerFor(slug: string, now = new Date()): RecordedWinner | undefined {
  return recordedWinners(now).find((winner) => winner.slug === slug);
}

export type ClosedNomination = {
  month: string;
  href: string;
  label: string;
};

/** A story on a closed ballot, whether or not it won. Used to ask the vote API. */
export function closedNomination(slug: string, now = new Date()): ClosedNomination | undefined {
  const today = editionDay(now);
  const stories = getPublishedStories();
  const story = stories.find((item) => item.slug === slug);
  if (!story) return undefined;
  const month = story.date.slice(0, 7);
  if (votingOpen(month, today)) return undefined;
  const overrides = loadGoodNeighborOverrides();
  const nominees = selectNominees(stories, month, overrides);
  if (!nominees.some((nominee) => nominee.slug === slug)) return undefined;
  const closed = ballotMonths(now).filter((key) => !votingOpen(key, today));
  return {
    month,
    href: goodNeighborPath(month, today.slice(0, 7)),
    label: badgeLabel(month, closed),
  };
}

export type WinnerCard = RecordedWinner & {
  title: string;
  dek: string;
  place: string;
  image: string;
  imageAlt: string;
  imageTreatment: "none" | "warm";
};

export function winnerCards(now = new Date()): WinnerCard[] {
  const stories = getPublishedStories();
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  return recordedWinners(now).flatMap((winner) => {
    const story = bySlug.get(winner.slug);
    if (!story) return [];
    return [
      {
        ...winner,
        title: story.title,
        dek: story.dek,
        place: placeLabel(story),
        image: story.image,
        imageAlt: story.imageAlt,
        imageTreatment: story.imageTreatment,
      },
    ];
  });
}

export function fileCountsForBallot(month: string): Record<string, number> {
  return pageCounts(month);
}

export function ballotJsonLd(ballot: Ballot) {
  const crumbs = [
    { name: "Today", path: "/" },
    { name: "Good Neighbor", path: "/good-neighbor" },
  ];
  if (ballot.canonicalPath !== "/good-neighbor") crumbs.push({ name: ballot.monthLabel, path: ballot.canonicalPath });
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: ballot.title,
        description: ballot.description,
        url: absoluteUrl(ballot.canonicalPath),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        inLanguage: "en-US",
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: ballot.nominees.length,
          itemListElement: ballot.nominees.map((nominee, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: nominee.title,
            url: absoluteUrl(`/story/${nominee.slug}`),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.path),
        })),
      },
    ],
  };
}

export function winnersJsonLd(cards: WinnerCard[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Good Neighbor winners",
        description: "Neighbors named Good Neighbor of the Month after the vote closes.",
        url: absoluteUrl("/good-neighbor/winners"),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        inLanguage: "en-US",
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: cards.length,
          itemListElement: cards.map((card, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${card.label}: ${card.title}`,
            url: absoluteUrl(`/story/${card.slug}`),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Good Neighbor", item: absoluteUrl("/good-neighbor") },
          { "@type": "ListItem", position: 3, name: "Winners", item: absoluteUrl("/good-neighbor/winners") },
        ],
      },
    ],
  };
}
