import { z } from "zod";
import { GIVING_TUESDAY_PINS, type GivingPin } from "./giving-tuesday-pins";
import { getStateByCode, STATES, type StateInfo } from "./states";
import { getPublishedStories } from "./stories";
import type { HelpLink } from "./story-schema";

/** Evergreen guide. The date in the copy is the 2026 Giving Tuesday, not a redirect. */
export const GIVING_TUESDAY_PATH = "/giving-tuesday";

export const GIVING_TUESDAY_TITLE = "50 states, 50 ways to help";

/** Homepage banner only. The guide itself stays up. */
export const GIVING_TUESDAY_BANNER_START = "2026-11-24";
export const GIVING_TUESDAY_BANNER_END = "2026-12-02";

/**
 * Cause filters. A story is placed in a cause only from its tags, its
 * section, or words already in the title, summary, or help label.
 * `other` is the leftover, shown as "More".
 */
export const GIVING_CAUSES = [
  {
    slug: "veterans",
    label: "Veterans",
    tags: ["veterans"],
  },
  {
    slug: "housing",
    label: "Housing",
    tags: ["housing", "home-repairs"],
  },
  {
    slug: "food",
    label: "Food",
    tags: ["food-banks", "community-meals", "food-rescue", "school-lunch", "community-garden"],
  },
  {
    slug: "disaster",
    label: "Disaster relief",
    tags: [] as string[],
  },
  {
    slug: "environment",
    label: "Environment",
    tags: ["parks", "trees", "rivers", "cleanups", "pollinators", "recycling", "trails"],
  },
  {
    slug: "animals",
    label: "Animals",
    tags: [
      "animal-rescue",
      "dogs",
      "cats",
      "birds",
      "horses",
      "wildlife-conservation",
      "sea-turtles",
      "pet-adoption",
      "zoos",
      "service-dogs",
      "therapy-animals",
    ],
  },
  {
    slug: "kids",
    label: "Kids",
    tags: ["kids", "students", "literacy", "playgrounds", "youth-sports", "toys", "schools", "scholarships"],
  },
] as const;

export type GivingCause = (typeof GIVING_CAUSES)[number]["slug"];

export type GivingFilter = GivingCause | "other";

const CAUSE_RANK: Record<GivingFilter, number> = {
  veterans: 0,
  housing: 1,
  food: 2,
  disaster: 3,
  environment: 4,
  animals: 5,
  kids: 6,
  other: 7,
};

/** Kept in sync with the filter rules in app/globals.css. */
export const GIVING_FILTER_SLUGS: readonly GivingFilter[] = [
  "veterans",
  "housing",
  "food",
  "disaster",
  "environment",
  "animals",
  "kids",
  "other",
];

const DISASTER_TEXT = /\b(disaster relief|hurricane relief|wildfire relief|tornado relief|flood relief|earthquake relief)\b/i;

const GOODS_TEXT =
  /\b(?:donate|give|drop(?:-|\s)?off|bring)\s+(?:some\s+|a\s+|an\s+|the\s+)?(?:goods|supplies|food|meals|coats|toys|books|shoes|clothes|clothing|items|blankets|diapers)\b/i;

const ACTION_PREFIXES = [
  "adopt or foster through",
  "foster or adopt with",
  "volunteer or give at",
  "volunteer with",
  "volunteer at",
  "volunteer for",
  "donate shoes through",
  "donate food to",
  "donate goods to",
  "donate supplies to",
  "donate to",
  "give to",
  "learn about becoming a",
  "learn about",
  "see how to help next year's",
  "see how to help",
  "support",
  "help",
  "volunteer",
  "donate",
  "give",
  "learn",
];

const LOCAL_BAND = 15;

export type FreeAction = "volunteer" | "goods" | "share" | "thanks";

export const FREE_ACTION_LABEL: Record<FreeAction, string> = {
  volunteer: "Volunteer",
  goods: "Donate goods",
  share: "Share",
  thanks: "Say thanks",
};

export type GivingStory = {
  slug: string;
  title: string;
  dek: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  category: string;
  tags: readonly string[];
  sourceName: string;
  sourceUrl: string;
  image: string;
  imageAlt: string;
  howToHelp: readonly HelpLink[];
  draft?: boolean;
};

export type GivingPick = {
  stateCode: string;
  stateName: string;
  stateSlug: string;
  slug: string;
  title: string;
  dek: string;
  date: string;
  city: string;
  sourceName: string;
  sourceUrl: string;
  image: string;
  imageAlt: string;
  helpLabel: string;
  helpUrl: string;
  helpKind: HelpLink["kind"];
  organization: string;
  causes: GivingCause[];
  primaryCause: GivingFilter;
  freeAction: FreeAction | null;
  pinned: boolean;
};

export type GivingCauseCount = {
  slug: GivingFilter;
  label: string;
  count: number;
};

export type GivingGuide = {
  picks: GivingPick[];
  alternates: GivingPick[];
  gaps: StateInfo[];
  causeCounts: GivingCauseCount[];
};

const pinSchema = z
  .array(
    z
      .object({
        state: z.string().regex(/^[A-Z]{2}$/, "Use a USPS code"),
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use the story slug"),
        url: z.string().url().optional(),
      })
      .strict(),
  )
  .superRefine((pins, ctx) => {
    const seen = new Set<string>();
    for (const pin of pins) {
      if (!getStateByCode(pin.state)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown state ${pin.state}`,
        });
      }
      if (seen.has(pin.state)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate pin for ${pin.state}`,
        });
      }
      seen.add(pin.state);
    }
  });

type Candidate = {
  story: GivingStory;
  help: HelpLink;
  helpIndex: number;
  state: StateInfo;
  causes: GivingCause[];
  primaryCause: GivingFilter;
  organization: string;
  freeAction: FreeAction | null;
  local: number;
};

export function isGivingTuesdaySeason(day: string): boolean {
  return day >= GIVING_TUESDAY_BANNER_START && day <= GIVING_TUESDAY_BANNER_END;
}

export function givingDescription(gapCount: number): string {
  if (gapCount === 0) {
    return "One reported way to help for every state and Washington, D.C. Giving Tuesday 2026 is December 1. Each link comes from a story already published, with its original source.";
  }
  return "Reported ways to help for Giving Tuesday on December 1, 2026, one per state that already has a published how-to-help link, each with its original source.";
}

export function givingShareLine(gapCount: number, pickCount: number): string {
  if (gapCount === 0) {
    return "50 states, 50 ways to help: one reported organization from every state and D.C.";
  }
  return `${pickCount} ways to help: one reported organization for each state documented so far.`;
}

/** The name is a phrase already inside the help label. Otherwise the label stays whole. */
export function organizationName(label: string): string {
  const original = label.trim().replace(/\s+/g, " ");
  const lower = original.toLowerCase();
  let rest = "";
  let matched = false;
  for (const prefix of ACTION_PREFIXES) {
    if (lower.startsWith(`${prefix} `)) {
      rest = original.slice(prefix.length).trim();
      matched = true;
      break;
    }
  }
  if (!matched) return original;
  rest = rest.replace(/^(?:the|a|an)\s+/i, "").trim();
  if (!/^[A-Z0-9]/.test(rest)) return original;
  if (/\b(?:provide|bringing|bring|leaving|becoming|become)\b/i.test(rest)) return original;
  if (rest.length < 3 || !original.includes(rest)) return original;
  return rest;
}

export function freeActionOf(help: Pick<HelpLink, "kind" | "label">): FreeAction | null {
  const label = help.label;
  if (help.kind === "volunteer" || /\bvolunteer(?:\s+with|\s+at|\s+for|\s+to)\b/i.test(label)) return "volunteer";
  if (/becoming a \w+ volunteer/i.test(label)) return "volunteer";
  if (help.kind === "thank") return "thanks";
  if (GOODS_TEXT.test(label)) return "goods";
  if (/^share\b/i.test(label)) return "share";
  return null;
}

export function givingCauses(story: Pick<GivingStory, "title" | "dek" | "category" | "tags">, help: Pick<HelpLink, "label">): GivingCause[] {
  const tags = new Set(story.tags);
  const found: GivingCause[] = [];
  for (const cause of GIVING_CAUSES) {
    if (cause.tags.some((tag) => tags.has(tag))) {
      found.push(cause.slug);
      continue;
    }
    if (cause.slug === "disaster" && DISASTER_TEXT.test(`${story.title} ${story.dek} ${help.label}`)) {
      found.push(cause.slug);
    }
  }
  if (story.category === "animals" && !found.includes("animals")) found.push("animals");
  return found;
}

function primaryCause(causes: readonly GivingCause[]): GivingFilter {
  for (const cause of GIVING_CAUSES) {
    if (causes.includes(cause.slug)) return cause.slug;
  }
  return "other";
}

function helpHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function mentionsPhrase(text: string, phrase: string): boolean {
  const cleaned = phrase.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (cleaned.length < 4) return false;
  const body = cleaned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`\\b${body}\\b`, "i").test(text);
}

function localScore(help: HelpLink, state: StateInfo, city: string, hostStates: number): number {
  let score = 0;
  if (help.kind === "donate" || help.kind === "volunteer" || help.kind === "thank") score += 50;
  if (hostStates <= 1) score += 30;
  else if (hostStates >= 3) score -= 40;
  if (mentionsPhrase(help.label, state.name)) score += 20;
  else if (mentionsPhrase(help.label, city)) score += 12;
  return score;
}

function byPreference(a: Candidate, b: Candidate, causeCounts: Map<GivingFilter, number>, usedUrls: Set<string>): number {
  const aUsed = usedUrls.has(a.help.url) ? 1 : 0;
  const bUsed = usedUrls.has(b.help.url) ? 1 : 0;
  if (aUsed !== bUsed) return aUsed - bUsed;
  const aCount = causeCounts.get(a.primaryCause) ?? 0;
  const bCount = causeCounts.get(b.primaryCause) ?? 0;
  if (aCount !== bCount) return aCount - bCount;
  if (CAUSE_RANK[a.primaryCause] !== CAUSE_RANK[b.primaryCause]) {
    return CAUSE_RANK[a.primaryCause] - CAUSE_RANK[b.primaryCause];
  }
  if (a.local !== b.local) return b.local - a.local;
  if (a.story.date !== b.story.date) return a.story.date < b.story.date ? 1 : -1;
  if (a.story.slug !== b.story.slug) return a.story.slug.localeCompare(b.story.slug);
  return a.helpIndex - b.helpIndex;
}

function toPick(candidate: Candidate, pinned: boolean): GivingPick {
  return {
    stateCode: candidate.state.code,
    stateName: candidate.state.name,
    stateSlug: candidate.state.slug,
    slug: candidate.story.slug,
    title: candidate.story.title,
    dek: candidate.story.dek,
    date: candidate.story.date,
    city: candidate.story.city,
    sourceName: candidate.story.sourceName,
    sourceUrl: candidate.story.sourceUrl,
    image: candidate.story.image,
    imageAlt: candidate.story.imageAlt,
    helpLabel: candidate.help.label,
    helpUrl: candidate.help.url,
    helpKind: candidate.help.kind,
    organization: candidate.organization,
    causes: candidate.causes,
    primaryCause: candidate.primaryCause,
    freeAction: candidate.freeAction,
    pinned,
  };
}

function parsePins(pins: readonly GivingPin[]): GivingPin[] {
  const parsed = pinSchema.safeParse(pins);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Giving Tuesday pins are invalid: ${details}`);
  }
  return parsed.data;
}

export function buildGivingGuide(stories: readonly GivingStory[], pins: readonly GivingPin[]): GivingGuide {
  const pinList = parsePins(pins);
  const published = stories.filter((story) => !story.draft && story.country === "US" && story.state && getStateByCode(story.state));

  const hostStates = new Map<string, Set<string>>();
  for (const story of published) {
    const code = story.state as string;
    for (const help of story.howToHelp) {
      const host = helpHost(help.url);
      const set = hostStates.get(host) ?? new Set<string>();
      set.add(code);
      hostStates.set(host, set);
    }
  }

  const byState = new Map<string, Candidate[]>();
  for (const story of published) {
    const state = getStateByCode(story.state);
    if (!state) continue;
    const list = byState.get(state.code) ?? [];
    story.howToHelp.forEach((help, helpIndex) => {
      const causes = givingCauses(story, help);
      const hostCount = hostStates.get(helpHost(help.url))?.size ?? 1;
      list.push({
        story,
        help,
        helpIndex,
        state,
        causes,
        primaryCause: primaryCause(causes),
        organization: organizationName(help.label),
        freeAction: freeActionOf(help),
        local: localScore(help, state, story.city, hostCount),
      });
    });
    byState.set(state.code, list);
  }

  const causeCounts = new Map<GivingFilter, number>();
  const usedUrls = new Set<string>();
  const chosen = new Map<string, Candidate>();
  const pinnedStates = new Set<string>();

  for (const pin of pinList) {
    const state = getStateByCode(pin.state);
    if (!state) throw new Error(`Giving Tuesday pin uses unknown state ${pin.state}.`);
    const candidates = (byState.get(state.code) ?? []).filter((candidate) => candidate.story.slug === pin.slug);
    if (!candidates.length) {
      throw new Error(
        `Giving Tuesday pin ${pin.state} → ${pin.slug} is not a published story in that state. Use the story's own state, not alsoStates.`,
      );
    }
    const pool = pin.url ? candidates.filter((candidate) => candidate.help.url === pin.url) : candidates.slice();
    if (!pool.length) {
      throw new Error(`Giving Tuesday pin ${pin.slug} has no how-to-help link matching ${pin.url}. Copy the URL from the story file.`);
    }
    pool.sort((a, b) => byPreference(a, b, causeCounts, usedUrls));
    const pick = pool[0];
    if (!pick) throw new Error(`Giving Tuesday pin ${pin.slug} could not be resolved.`);
    chosen.set(state.code, pick);
    pinnedStates.add(state.code);
    usedUrls.add(pick.help.url);
    causeCounts.set(pick.primaryCause, (causeCounts.get(pick.primaryCause) ?? 0) + 1);
  }

  const open = STATES.filter((state) => !pinnedStates.has(state.code)).sort((a, b) => {
    const size = (byState.get(a.code)?.length ?? 0) - (byState.get(b.code)?.length ?? 0);
    if (size !== 0) return size;
    return a.code.localeCompare(b.code);
  });

  for (const state of open) {
    const candidates = byState.get(state.code) ?? [];
    if (!candidates.length) continue;
    const bestLocal = Math.max(...candidates.map((candidate) => candidate.local));
    const band = candidates.filter((candidate) => candidate.local >= bestLocal - LOCAL_BAND);
    band.sort((a, b) => byPreference(a, b, causeCounts, usedUrls));
    const pick = band[0];
    if (!pick) continue;
    chosen.set(state.code, pick);
    usedUrls.add(pick.help.url);
    causeCounts.set(pick.primaryCause, (causeCounts.get(pick.primaryCause) ?? 0) + 1);
  }

  const picks: GivingPick[] = [];
  const alternates: GivingPick[] = [];
  const gaps: StateInfo[] = [];

  for (const state of STATES) {
    const featured = chosen.get(state.code);
    if (!featured) {
      gaps.push(state);
      continue;
    }
    picks.push(toPick(featured, pinnedStates.has(state.code)));
    const candidates = byState.get(state.code) ?? [];
    const seenAlternate = new Set<string>();
    for (const slug of GIVING_FILTER_SLUGS) {
      const featuredHas = slug === "other" ? featured.causes.length === 0 : featured.causes.includes(slug);
      if (featuredHas) continue;
      const pool = candidates.filter((candidate) => {
        const matches = slug === "other" ? candidate.causes.length === 0 : candidate.causes.includes(slug);
        if (!matches) return false;
        if (candidate.help.url === featured.help.url) return false;
        return true;
      });
      pool.sort((a, b) => {
        if (a.local !== b.local) return b.local - a.local;
        if (a.story.date !== b.story.date) return a.story.date < b.story.date ? 1 : -1;
        if (a.story.slug !== b.story.slug) return a.story.slug.localeCompare(b.story.slug);
        return a.helpIndex - b.helpIndex;
      });
      const alternate = pool[0];
      if (!alternate) continue;
      const key = `${alternate.story.slug}:${alternate.help.url}`;
      if (seenAlternate.has(key)) continue;
      seenAlternate.add(key);
      alternates.push(toPick(alternate, false));
    }
  }

  const causeCountsForFilters: GivingCauseCount[] = [];
  for (const slug of GIVING_FILTER_SLUGS) {
    const label = slug === "other" ? "More" : (GIVING_CAUSES.find((cause) => cause.slug === slug)?.label ?? slug);
    let count = 0;
    for (const state of STATES) {
      const featured = picks.find((pick) => pick.stateCode === state.code);
      const featuredHas =
        slug === "other" ? Boolean(featured && featured.causes.length === 0) : Boolean(featured?.causes.includes(slug));
      const alternateHas = alternates.some(
        (pick) =>
          pick.stateCode === state.code &&
          (slug === "other" ? pick.causes.length === 0 : pick.causes.includes(slug)),
      );
      if (featuredHas || alternateHas) count += 1;
    }
    if (count > 0) causeCountsForFilters.push({ slug, label, count });
  }

  return { picks, alternates, gaps, causeCounts: causeCountsForFilters };
}

export function givingOgPick(guide: GivingGuide): GivingPick | undefined {
  return guide.picks
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)))[0];
}

let cache: GivingGuide | null = null;

export function getGivingGuide(): GivingGuide {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const guide = buildGivingGuide(getPublishedStories(), GIVING_TUESDAY_PINS);
  cache = guide;
  return guide;
}
