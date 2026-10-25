import { formatLongDate } from "./format";

/**
 * A city page with this many stories is indexable.
 * One story still renders, but it stays noindex.
 */
export const MIN_CITY_INDEX_STORIES = 2;

/**
 * Whole-word aliases. `St.` and `Saint` are one city. `Saint-Brieuc` stays
 * Saint because the word is already the full name, not an abbreviation.
 */
const WORD_ALIASES: Record<string, string> = {
  st: "saint",
  ft: "fort",
  mt: "mount",
};

/** Stable grouping key. Case, punctuation, and Saint/Fort/Mount spellings match. */
export function cityKey(city: string): string {
  const folded = city
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!folded) return "";
  return folded
    .split(" ")
    .map((word) => WORD_ALIASES[word] ?? word)
    .join(" ");
}

/** Permanent URL slug. Derived from the key so a new spelling does not move the page. */
export function citySlug(city: string): string {
  return cityKey(city).replace(/ /g, "-");
}

function isMixedCase(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (!letters) return false;
  let upper = 0;
  for (const char of letters) {
    if (char === char.toUpperCase()) upper += 1;
  }
  return upper > 0 && upper < letters.length;
}

function titleCase(value: string): string {
  return value.replace(/[A-Za-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/**
 * Prefer a mixed-case spelling that already appears in the stories.
 * If every spelling is all caps or all lower, title-case the most common one.
 */
export function canonicalCityName(counts: Map<string, number>): string {
  const entries = [...counts.entries()];
  const mixed = entries.filter(([name]) => isMixedCase(name));
  const pool = mixed.length ? mixed : entries;
  pool.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const name = pool[0]?.[0] ?? "";
  if (!name || isMixedCase(name)) return name;
  return titleCase(name);
}

export type CityCategoryCount = { label: string; count: number };

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function categorySentence(categories: CityCategoryCount[], total: number): string {
  const top = categories.filter((item) => item.label && item.count > 0).slice(0, 3);
  if (!top.length) return "";
  if (top.length === 1) {
    return total === 1 ? `It is filed under ${top[0].label}. ` : `All ${total} are filed under ${top[0].label}. `;
  }
  const parts = top.map((item) => `${item.label} (${item.count})`);
  return `The top categories are ${listPhrase(parts)}. `;
}

/** Facts from the archive only: count, dates, and categories. No city trivia. */
export function describeCity(input: {
  city: string;
  region: string;
  count: number;
  earliest: string;
  latest: string;
  categories: CityCategoryCount[];
}): string {
  const place = input.region ? `${input.city}, ${input.region}` : input.city;
  const noun = input.count === 1 ? "story" : "stories";
  const when =
    input.earliest === input.latest
      ? `published ${formatLongDate(input.latest)}`
      : `published from ${formatLongDate(input.earliest)} to ${formatLongDate(input.latest)}`;
  const checked =
    input.count === 1
      ? "It is checked and linked to the original report."
      : "Each one is checked and linked to the original report.";
  return `${input.count} verified ${noun} from ${place}, ${when}. ${categorySentence(input.categories, input.count)}${checked}`;
}

export type HelpMention = {
  label: string;
  url: string;
  kind: "donate" | "volunteer" | "thank" | "learn";
};

/** Unique how-to-help links, newest story first. The same URL is listed once. */
export function helpMentions(stories: { howToHelp: readonly HelpMention[] }[]): HelpMention[] {
  const seen = new Set<string>();
  const mentions: HelpMention[] = [];
  for (const story of stories) {
    for (const item of story.howToHelp) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      mentions.push({ label: item.label, url: item.url, kind: item.kind });
    }
  }
  return mentions;
}
