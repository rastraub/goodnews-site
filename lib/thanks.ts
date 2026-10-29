import { z } from "zod";
import rawOverrides from "@/data/thanks-overrides.json";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode, STATES, type StateInfo } from "./states";
import { mountainDay } from "./weeks";

export const THANKS_PATH = "/50-states-of-thanks";

/**
 * Homepage banner for the Thanksgiving hub.
 * Set `banner` to false to hide it immediately. The date window is inclusive
 * and uses the America/Denver day, the same clock as the morning edition.
 * The page itself stays up either way.
 */
export const thanksSeason = {
  banner: true,
  start: "2026-11-01",
  end: "2026-11-30",
} as const;

export const THANKS_TITLE = "50 States of Thanks: stories of gratitude 2026";

/** A story has to clear this before it can fill a state on its own. */
const MIN_FIT = 6;

const TAG_POINTS: Record<string, number> = {
  kindness: 14,
  neighbors: 12,
  veterans: 12,
  volunteers: 6,
  "food-banks": 9,
  "community-meals": 9,
  "food-rescue": 8,
  housing: 8,
  "home-repairs": 8,
  seniors: 8,
  toys: 7,
  "winter-clothes": 7,
  "school-lunch": 8,
  scholarships: 6,
  teachers: 6,
  "cancer-support": 10,
  "vision-care": 5,
  "little-free-libraries": 5,
  "community-garden": 6,
  literacy: 4,
  "service-dogs": 5,
  "therapy-animals": 5,
  "first-responders": 3,
  playgrounds: 6,
  inclusion: 6,
  accessibility: 8,
};

const CATEGORY_POINTS: Record<Story["category"], number> = {
  heroes: 8,
  community: 6,
  animals: 0,
  science: -3,
  "health-tech": -8,
};

const PHRASES: { pattern: RegExp; points: number }[] = [
  { pattern: /\b(?:gratitude|grateful|thankful|thank-you|thank you|thanks to)\b/i, points: 8 },
  { pattern: /\b(?:giving back|gave back|pay it forward)\b/i, points: 8 },
  { pattern: /\bkindness\b/i, points: 6 },
  { pattern: /\bneighbou?rs?\b/i, points: 6 },
  { pattern: /\bveterans?\b/i, points: 6 },
  { pattern: /\b(?:volunteers?|volunteered|volunteering)\b/i, points: 5 },
  { pattern: /\b(?:donations?|donated|donate|food drive|food bank)\b/i, points: 5 },
  { pattern: /\b(?:helped|helping)\b/i, points: 2 },
  { pattern: /\b(?:for free|at no cost|no charge|no payment|rent-free)\b/i, points: 5 },
];

const HELP_POINTS = { thank: 3, volunteer: 2, donate: 1, learn: 0 } as const;

const overrideSchema = z.record(z.string(), z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use the story slug")).superRefine((data, ctx) => {
  for (const code of Object.keys(data)) {
    if (!getStateByCode(code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [code],
        message: `${code} is not a two-letter USPS code`,
      });
    }
  }
});

export type ThanksSource = "pinned" | "auto" | "open";

export type ThanksSlot = {
  state: StateInfo;
  story?: Story;
  source: ThanksSource;
  fit: number;
};

export type ThanksBoard = {
  slots: ThanksSlot[];
  filled: number;
  total: number;
};

export function thanksDescription(filled: number, total: number): string {
  return `Thanksgiving good news for 2026: stories of gratitude from every state and Washington, D.C. ${filled} of ${total} filled, with kindness, neighbors, veterans, and a way to help.`;
}

export function thanksBannerVisible(now = new Date()): boolean {
  if (!thanksSeason.banner) return false;
  const day = mountainDay(now);
  return day >= thanksSeason.start && day <= thanksSeason.end;
}

type Ranked = { story: Story; fit: number; rank: number; primary: boolean };

function loadOverrides(): Record<string, string> {
  const parsed = overrideSchema.safeParse(rawOverrides);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`data/thanks-overrides.json: ${details}`);
  }
  return parsed.data;
}

function textPoints(story: Story): number {
  const lead = `${story.title}\n${story.dek}`;
  let points = 0;
  for (const phrase of PHRASES) {
    if (phrase.pattern.test(lead)) points += phrase.points;
    else if (phrase.pattern.test(story.body)) points += Math.ceil(phrase.points / 2);
  }
  return Math.min(points, 16);
}

export function thanksFit(story: Story): number {
  const tags = story.tags.reduce((sum, tag) => sum + (TAG_POINTS[tag] ?? 0), 0);
  const help = story.howToHelp.reduce((best, item) => Math.max(best, HELP_POINTS[item.kind]), 0);
  return Math.min(tags, 18) + (CATEGORY_POINTS[story.category] ?? 0) + textPoints(story) + help;
}

function recencyBonus(date: string, today: string): number {
  const age = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86_400_000);
  if (age <= 14) return 4;
  if (age <= 30) return 3;
  if (age <= 60) return 1;
  return 0;
}

function filedIn(story: Story, code: string): boolean {
  return story.country === "US" && (story.state === code || story.alsoStates.includes(code));
}

function rankCandidates(stories: Story[], code: string, today: string): Ranked[] {
  return stories
    .filter((story) => filedIn(story, code))
    .map((story) => {
      const fit = thanksFit(story);
      return { story, fit, rank: fit + recencyBonus(story.date, today), primary: story.state === code };
    })
    .filter((item) => item.fit >= MIN_FIT)
    .sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      if (a.story.date !== b.story.date) return a.story.date < b.story.date ? 1 : -1;
      if (a.primary !== b.primary) return a.primary ? -1 : 1;
      return a.story.slug.localeCompare(b.story.slug);
    });
}

function pinnedStory(state: StateInfo, slug: string, stories: Story[]): Story {
  const story = stories.find((item) => item.slug === slug);
  if (!story) {
    throw new Error(`data/thanks-overrides.json: ${state.code} pins ${slug}, and that story is not published`);
  }
  if (!filedIn(story, state.code)) {
    throw new Error(`data/thanks-overrides.json: ${state.code} pins ${slug}, which is not filed in ${state.name}`);
  }
  return story;
}

/**
 * One gratitude story per state, or an open slot when nothing in the archive fits.
 * Pins in data/thanks-overrides.json win. Other states take the strongest unused
 * fit, scarce states first, then a state may share a story if that is all it has.
 */
export function thanksBoard(stories = getPublishedStories(), now = new Date()): ThanksBoard {
  const overrides = loadOverrides();
  const today = mountainDay(now);
  const used = new Set<string>();
  const chosen = new Map<string, ThanksSlot>();

  for (const state of STATES) {
    const pin = overrides[state.code];
    if (!pin) continue;
    const story = pinnedStory(state, pin, stories);
    chosen.set(state.code, { state, story, source: "pinned", fit: thanksFit(story) });
    used.add(story.slug);
  }

  const open = STATES.filter((state) => !chosen.has(state.code));
  const pools = open
    .map((state) => ({ state, candidates: rankCandidates(stories, state.code, today) }))
    .sort((a, b) => a.candidates.length - b.candidates.length || a.state.name.localeCompare(b.state.name));

  for (const pool of pools) {
    const pick = pool.candidates.find((item) => !used.has(item.story.slug));
    if (!pick) continue;
    chosen.set(pool.state.code, { state: pool.state, story: pick.story, source: "auto", fit: pick.fit });
    used.add(pick.story.slug);
  }

  for (const pool of pools) {
    if (chosen.has(pool.state.code)) continue;
    const pick = pool.candidates[0];
    if (pick) chosen.set(pool.state.code, { state: pool.state, story: pick.story, source: "auto", fit: pick.fit });
    else chosen.set(pool.state.code, { state: pool.state, source: "open", fit: 0 });
  }

  const slots = STATES.map((state) => {
    const slot = chosen.get(state.code);
    if (!slot) throw new Error(`Thanks hub dropped ${state.name}`);
    return slot;
  });

  return {
    slots,
    filled: slots.filter((slot) => slot.story).length,
    total: STATES.length,
  };
}
