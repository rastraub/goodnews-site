/**
 * Good Neighbor of the Month.
 *
 * The ballot is 8–12 stories about an individual or a small group that did
 * something kind for their community. Institutions, research, wildlife
 * programs, and on-duty first-responder stories stay off unless an editor
 * pins them. Pin and exclude lists live in data/good-neighbor.json.
 *
 * Voting is open on the 1st through the 25th (Eastern Time, same clock as
 * the edition line). After that the month shows results.
 */
import { editionDay } from "./world-pick";

export const NOMINEE_MIN = 8;
export const NOMINEE_MAX = 12;
/** How many auto-picks to aim for before a thin month falls back toward the minimum. */
export const NOMINEE_TARGET = 10;
/** Last day of the month that still accepts a vote, inclusive. */
export const VOTE_LAST_DAY = 25;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Line-of-duty stories already have the first-responder topic hub. */
const DUTY_TAGS = new Set(["first-responders", "firefighters", "police", "ems", "dispatch", "search-and-rescue"]);

/** Programs and wildlife, not a neighbor doing a kindness. */
const INSTITUTION_TAGS = new Set([
  "wildlife-conservation",
  "zoos",
  "sea-turtles",
  "medical-research",
  "archaeology",
  "space",
]);

const DUTY_TEXT =
  /\b(officers?|firefighters?|paramedics?|deput(?:y|ies)|sergeants?|dispatchers?|search-and-rescue|coast guard|nypd|lapd|police department|fire department|\bems\b|\bemts?\b|first responders?)\b/i;

const INSTITUTION_TEXT =
  /\b(million|billion|honor flight|universit(?:y|ies)|campus|groundbreaking|legislature|department of|city council|\bfda\b|clinical trial|school district)\b/i;

const ACHIEVEMENT_TEXT = /\b(marathon|pacific crest|swim the length|walk across|world record|championship|of the year)\b/i;

const PERSON_TEXT =
  /\b(neighbors?|volunteers?|students?|graders?|teens?|kids?|children|child|barbers?|cashiers?|custodians?|scouts?|couples?|famil(?:y|ies)|moms?|dads?|teachers?|housekeepers?|mechanics?|classmates?|sophomores?|\bseniors?\b|\ba man\b|\ba woman\b|\ba boy\b|\ba girl\b|friends?|\bowner\b|veterans?|nurses?|coaches?|gardeners?|attendants?|\bclass\b)\b/i;

const KIND_TEXT =
  /\b(gave|gives|give|given|donat\w*|built|builds|build|collect\w*|repair\w*|rebuil\w*|surpris\w*|handed|hands|rais\w*|paid|pays|clear\w*|plant\w*|cook\w*|pack\w*|packed|deliver\w*|tarp\w*|invit\w*|haircuts?|\bhug\b|flowers?|\bshoes\b|\broofs?\b|\bbeds?\b|lunches?|\bkits?\b|bracelets|stuffed|oil changes|bouquets|no cost|no payment|for free|\bfree\b|harvest\w*|rallied)\b/i;

const PERSON_CATEGORIES = new Set(["heroes", "community", "animals"]);

export type GoodNeighborSource = {
  slug: string;
  title: string;
  shortTitle?: string;
  dek: string;
  date: string;
  category: string;
  tags: string[];
  draft?: boolean;
  kidFriendly?: boolean;
  kidSummary?: string;
};

export type MonthOverrides = {
  pin?: string[];
  exclude?: string[];
  /** Editor-recorded winner. Used after the voting window closes. Must be on the ballot. */
  winner?: string;
};

export type GoodNeighborOverrides = Record<string, MonthOverrides>;

export type ScoredNominee<T extends GoodNeighborSource = GoodNeighborSource> = T & {
  pinned: boolean;
  score: number;
};

/** Fields the ballot page can render. No voter data. */
export type BallotNominee = {
  slug: string;
  title: string;
  shortTitle: string;
  dek: string;
  date: string;
  place: string;
  categoryLabel: string;
  categoryColor: string;
  image: string;
  imageAlt: string;
  imageTreatment: "none" | "warm";
  sourceName: string;
  kidSummary?: string;
};

export function parseMonthKey(value: string): { year: number; month: number } | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return undefined;
  return { year, month };
}

export function monthName(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  return MONTH_NAMES[parsed.month - 1] ?? monthKey;
}

export function monthLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  return `${monthName(monthKey)} ${parsed.year}`;
}

export function editionMonth(now = new Date()): string {
  return editionDay(now).slice(0, 7);
}

export function nextMonthKey(monthKey: string): string | undefined {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return undefined;
  const year = parsed.month === 12 ? parsed.year + 1 : parsed.year;
  const month = parsed.month === 12 ? 1 : parsed.month + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthKeyFromDate(iso: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  return iso.slice(0, 7);
}

/** Open only for the edition's current month, on the 1st through the 25th. */
export function votingOpen(monthKey: string, today = editionDay()): boolean {
  if (!parseMonthKey(monthKey) || monthKey !== today.slice(0, 7)) return false;
  const day = Number(today.slice(8, 10));
  return day >= 1 && day <= VOTE_LAST_DAY;
}

export function goodNeighborPath(monthKey: string, current = editionMonth()): string {
  if (monthKey === current) return "/good-neighbor";
  return `/good-neighbor/${monthKey}`;
}

/**
 * "Good Neighbor of October". A later year of the same month name includes
 * the year so two winners do not share one label.
 */
export function badgeLabel(monthKey: string, winnerMonths: string[]): string {
  const name = monthName(monthKey);
  const twins = winnerMonths.filter((month) => monthName(month) === name);
  if (twins.length > 1) return `Good Neighbor of ${name} ${monthKey.slice(0, 4)}`;
  return `Good Neighbor of ${name}`;
}

export function voteShareText(siteName: string, title: string): string {
  return `I voted for ${title} on ${siteName}`;
}

export function blockReason(story: GoodNeighborSource): string | undefined {
  if (story.draft) return "draft";
  if (story.tags.some((tag) => DUTY_TAGS.has(tag))) return "duty-tag";
  const text = `${story.title} ${story.dek}`;
  if (DUTY_TEXT.test(text)) return "duty";
  if (story.category === "science" || story.category === "health-tech") return "institution-category";
  if (!PERSON_CATEGORIES.has(story.category)) return "category";
  if (story.tags.some((tag) => INSTITUTION_TAGS.has(tag))) return "institution-tag";
  if (INSTITUTION_TEXT.test(text)) return "institution";
  if (ACHIEVEMENT_TEXT.test(text)) return "achievement";
  if (story.category === "animals" && !story.tags.some((tag) => tag === "kindness" || tag === "neighbors" || tag === "kids" || tag === "volunteers")) {
    return "wildlife";
  }
  if (!PERSON_TEXT.test(text)) return "no-person";
  if (!KIND_TEXT.test(text)) return "no-kindness";
  return undefined;
}

export function neighborScore(story: GoodNeighborSource): number {
  const text = `${story.title} ${story.dek}`;
  let score = 0;
  if (story.category === "heroes") score += 4;
  if (story.category === "community") score += 2;
  if (story.tags.includes("neighbors")) score += 4;
  if (story.tags.includes("kindness")) score += 4;
  if (story.tags.includes("kids") || story.tags.includes("students")) score += 2;
  if (story.tags.includes("volunteers")) score += 1;
  if (story.kidFriendly && story.kidSummary) score += 2;
  if (/\bneighbors?\b/i.test(text)) score += 3;
  if (/\b(gave|gives|donat\w*|built|repaired|rebuil\w*)\b/i.test(text)) score += 2;
  if (/\b(\d+-year-old|grader|teen)\b/i.test(text)) score += 2;
  if (/^(a|an)\b/i.test(story.title)) score += 1;
  return score;
}

function motif(story: GoodNeighborSource): string | undefined {
  const title = story.title;
  if (/\broofs?\b/i.test(title)) return "roof";
  if (/\bbeds?\b/i.test(title)) return "bed";
  if (/\blibrar/i.test(title)) return "library";
  if (/\b(dog|cat|puppy|kitten|horse|pony)\b/i.test(title)) return "animal";
  if (/\b(lunch|lunches|meal|meals|supper|food)\b/i.test(title)) return "food";
  if (/\bhaircuts?\b/i.test(title)) return "hair";
  if (/\b(book|books)\b/i.test(title)) return "books";
  if (/\b(costume|halloween)\b/i.test(title)) return "costume";
  if (/\b(garden|trees?|plant)\b/i.test(title)) return "garden";
  return undefined;
}

function byRank<T extends GoodNeighborSource>(a: { story: T; score: number }, b: { story: T; score: number }): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.story.date !== b.story.date) return a.story.date < b.story.date ? 1 : -1;
  return a.story.slug.localeCompare(b.story.slug);
}

export function monthOverridesFor(overrides: GoodNeighborOverrides, monthKey: string): Required<Pick<MonthOverrides, "pin" | "exclude">> & {
  winner?: string;
} {
  const entry = overrides[monthKey] ?? {};
  return {
    pin: entry.pin ?? [],
    exclude: entry.exclude ?? [],
    winner: entry.winner,
  };
}

/**
 * Pins come first, in file order, even when the automatic filters would drop
 * them. Excludes are removed. The rest are the highest-scoring kind acts,
 * spread across different kinds of help so the ballot is not ten roofs.
 */
export function selectNominees<T extends GoodNeighborSource>(
  stories: T[],
  monthKey: string,
  overrides: GoodNeighborOverrides = {},
): ScoredNominee<T>[] {
  const rules = monthOverridesFor(overrides, monthKey);
  const excluded = new Set(rules.exclude);
  const inMonth = stories.filter((story) => !story.draft && story.date.slice(0, 7) === monthKey && !excluded.has(story.slug));
  const bySlug = new Map(inMonth.map((story) => [story.slug, story]));
  const pins: ScoredNominee<T>[] = [];
  for (const slug of rules.pin) {
    const story = bySlug.get(slug);
    if (!story || pins.some((item) => item.slug === slug)) continue;
    pins.push({ ...story, pinned: true, score: neighborScore(story) });
  }
  const pinned = new Set(pins.map((story) => story.slug));
  const ranked = inMonth
    .filter((story) => !pinned.has(story.slug) && !blockReason(story))
    .map((story) => ({ story, score: neighborScore(story) }))
    .sort(byRank);

  const chosen: ScoredNominee<T>[] = [...pins];
  const usedMotifs = new Set(pins.map((story) => motif(story)).filter((item): item is string => Boolean(item)));

  function take(skipRepeatMotif: boolean, limit: number) {
    for (const row of ranked) {
      if (chosen.length >= limit) return;
      if (chosen.some((item) => item.slug === row.story.slug)) continue;
      const bucket = motif(row.story);
      if (skipRepeatMotif && bucket && usedMotifs.has(bucket)) continue;
      if (bucket) usedMotifs.add(bucket);
      chosen.push({ ...row.story, pinned: false, score: row.score });
    }
  }

  take(true, Math.min(NOMINEE_TARGET, NOMINEE_MAX));
  if (chosen.length < NOMINEE_MIN) take(false, NOMINEE_MIN);
  return chosen.slice(0, NOMINEE_MAX);
}

export function storiesInMonth<T extends GoodNeighborSource>(stories: T[], monthKey: string): T[] {
  return stories.filter((story) => !story.draft && story.date.slice(0, 7) === monthKey);
}

export type CountedNominee = {
  slug: string;
  date: string;
};

/**
 * Highest tally wins. Ties break toward the earlier story, then the slug.
 * No votes means no winner. An editor `winner` replaces the tally after the
 * window closes. Nothing is named while voting is still open.
 */
export function winnerSlug(
  nominees: CountedNominee[],
  counts: Record<string, number>,
  options: { open: boolean; editorWinner?: string },
): string | undefined {
  if (options.open) return undefined;
  const ballot = new Set(nominees.map((nominee) => nominee.slug));
  if (options.editorWinner && ballot.has(options.editorWinner)) return options.editorWinner;
  let best: CountedNominee & { votes: number } | undefined;
  for (const nominee of nominees) {
    const votes = counts[nominee.slug] ?? 0;
    if (votes <= 0) continue;
    if (
      !best ||
      votes > best.votes ||
      (votes === best.votes && (nominee.date < best.date || (nominee.date === best.date && nominee.slug < best.slug)))
    ) {
      best = { ...nominee, votes };
    }
  }
  return best?.slug;
}

export function overrideProblems<T extends GoodNeighborSource>(stories: T[], overrides: GoodNeighborOverrides): string[] {
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const errors: string[] = [];
  for (const [monthKey, entry] of Object.entries(overrides)) {
    if (!parseMonthKey(monthKey)) {
      errors.push(`${monthKey}: month keys are YYYY-MM`);
      continue;
    }
    const pin = entry.pin ?? [];
    const exclude = entry.exclude ?? [];
    if (pin.length > NOMINEE_MAX) errors.push(`${monthKey}: pin at most ${NOMINEE_MAX} stories`);
    const overlap = pin.filter((slug) => exclude.includes(slug));
    if (overlap.length) errors.push(`${monthKey}: in both pin and exclude (${overlap.join(", ")})`);
    const seen = new Set<string>();
    for (const slug of [...pin, ...exclude]) {
      if (seen.has(slug)) errors.push(`${monthKey}: ${slug} is listed twice`);
      seen.add(slug);
      const story = bySlug.get(slug);
      if (!story) {
        errors.push(`${monthKey}: unknown story ${slug}`);
        continue;
      }
      if (story.draft) errors.push(`${monthKey}: ${slug} is a draft`);
      if (story.date.slice(0, 7) !== monthKey) errors.push(`${monthKey}: ${slug} is dated ${story.date}`);
    }
    if (entry.winner) {
      const story = bySlug.get(entry.winner);
      if (!story) errors.push(`${monthKey}: unknown winner ${entry.winner}`);
      else if (story.draft) errors.push(`${monthKey}: winner ${entry.winner} is a draft`);
      else if (story.date.slice(0, 7) !== monthKey) errors.push(`${monthKey}: winner ${entry.winner} is dated ${story.date}`);
      else if (exclude.includes(entry.winner)) errors.push(`${monthKey}: winner ${entry.winner} is excluded`);
      else {
        const ballot = selectNominees(stories, monthKey, overrides);
        if (!ballot.some((nominee) => nominee.slug === entry.winner)) {
          errors.push(`${monthKey}: winner ${entry.winner} is not on the ballot. Pin it or clear the winner.`);
        }
      }
    }
  }
  return errors;
}
