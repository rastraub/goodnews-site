/**
 * Veterans Day hub at /veterans-day.
 * One kindness story per state, from the archive. Editor pins override the pick.
 * The page stays up all year. The homepage banner is the only seasonal piece.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { pickStateStories, type StateHubSlot } from "./state-story-hub";
import { getPublishedStories, type Story } from "./stories";
import { editionDay } from "./world-pick";

export const VETERANS_DAY_PATH = "/veterans-day";

export const VETERANS_DAY_TITLE = "Veterans Day good news, state by state";

export const VETERANS_DAY_DESCRIPTION =
  "One kindness story about veterans for each state the archive can match, including Washington, D.C. Every story links to the original report.";

const PINS_PATH = path.join(process.cwd(), "data", "veterans-day-pins.json");

const SPORTS_VETERAN = /\b(?:nba|nfl|mlb|nhl|wnba|mls)\b/i;

const pinsSchema = z.record(
  z.string().regex(/^[A-Z]{2}$/, "Use a two-letter USPS code"),
  z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Pin a story slug"),
);

export type VeteransHelpLink = {
  label: string;
  url: string;
  kind: Story["howToHelp"][number]["kind"];
  storySlug: string;
  storyTitle: string;
  stateCode: string;
  stateName: string;
};

export type VeteransDayHub = {
  slots: StateHubSlot<Story>[];
  covered: StateHubSlot<Story>[];
  gaps: StateHubSlot<Story>[];
  pinErrors: string[];
  help: VeteransHelpLink[];
  socialStory?: Story;
  latest?: string;
};

/**
 * A story qualifies when the veterans tag is set, or when the headline or deck
 * names a veteran or an honor flight. A sports “veteran” does not qualify.
 * The tag wins when both are present, because an editor already filed it.
 */
export function isVeteranStory(story: {
  country: string;
  tags: string[];
  title: string;
  dek: string;
  draft?: boolean;
}): boolean {
  if (story.draft || story.country !== "US") return false;
  if (story.tags.includes("veterans")) return true;
  const lead = `${story.title}\n${story.dek}`;
  if (SPORTS_VETERAN.test(lead)) return false;
  return /\bveterans?\b|\bhonor flights?\b/i.test(lead);
}

/** Tie-break only. Date, featured, and Top 5 are applied first. */
export function veteranStoryQuality(story: { title: string; dek: string }): number {
  const text = `${story.title} ${story.dek}`.toLowerCase();
  let score = 0;
  if (/\bhonor flights?\b/.test(text)) score += 4;
  if (/\bservice dogs?\b/.test(text)) score += 3;
  if (/\bmedals?\b/.test(text)) score += 3;
  if (/\b(tiny homes?|housing|homecoming|homes? for)\b/.test(text)) score += 3;
  if (/\bwelcome\b/.test(text)) score += 2;
  return score;
}

export function parseVeteransDayPins(value: unknown): Record<string, string> {
  const result = pinsSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Veterans Day pins: ${details}`);
  }
  return result.data;
}

export function loadVeteransDayPins(): Record<string, string> {
  const raw = fs.readFileSync(PINS_PATH, "utf8");
  return parseVeteransDayPins(JSON.parse(raw));
}

export function veteranHelpLinks(slots: StateHubSlot<Story>[]): VeteransHelpLink[] {
  const rows = slots.flatMap((slot) => (slot.story ? [{ slot, story: slot.story }] : []));
  rows.sort((a, b) => {
    if (a.story.date !== b.story.date) return a.story.date < b.story.date ? 1 : -1;
    const home = Number(a.story.state !== a.slot.state.code) - Number(b.story.state !== b.slot.state.code);
    if (home) return home;
    return a.slot.state.name.localeCompare(b.slot.state.name);
  });

  const seen = new Set<string>();
  const links: VeteransHelpLink[] = [];
  for (const { slot, story } of rows) {
    for (const item of story.howToHelp) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      links.push({
        label: item.label,
        url: item.url,
        kind: item.kind,
        storySlug: story.slug,
        storyTitle: story.title,
        stateCode: slot.state.code,
        stateName: slot.state.name,
      });
    }
  }
  links.sort((a, b) => a.label.localeCompare(b.label) || a.stateName.localeCompare(b.stateName));
  return links;
}

export function buildVeteransDayHub(stories: Story[], pins: Record<string, string>): VeteransDayHub {
  const result = pickStateStories({
    stories,
    pins,
    qualifies: isVeteranStory,
    quality: veteranStoryQuality,
  });
  const covered = result.slots.filter((slot) => slot.story);
  const gaps = result.slots.filter((slot) => !slot.story);
  const socialStories = new Map<string, Story>();
  for (const slot of covered) {
    if (slot.story && !socialStories.has(slot.story.slug)) socialStories.set(slot.story.slug, slot.story);
  }
  const socialStory = [...socialStories.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug),
  )[0];
  return {
    slots: result.slots,
    covered,
    gaps,
    pinErrors: result.pinErrors,
    help: veteranHelpLinks(covered),
    socialStory,
    latest: socialStory?.date,
  };
}

let cache: VeteransDayHub | null = null;

export function getVeteransDayHub(): VeteransDayHub {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const hub = buildVeteransDayHub(getPublishedStories(), loadVeteransDayPins());
  if (hub.pinErrors.length) {
    throw new Error(`Veterans Day pins:\n- ${hub.pinErrors.join("\n- ")}`);
  }
  cache = hub;
  return hub;
}

/** November 1 through November 12, on the same New York date as the edition line. */
export function veteransDayInSeason(day = editionDay()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return false;
  const month = Number(match[2]);
  const date = Number(match[3]);
  return month === 11 && date >= 1 && date <= 12;
}
