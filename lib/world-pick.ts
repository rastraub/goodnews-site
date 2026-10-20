/**
 * One international story for the homepage spotlight, state pages, and the morning email.
 * The email itself is sent outside this repo. It should call worldSpotlight() and link that story
 * after the Top 5. A story with worldPick wins. Otherwise the choice rotates by calendar date.
 */
export type WorldCandidate = {
  slug: string;
  date: string;
  country: string;
  draft?: boolean;
  worldPick?: boolean;
};

/** Calendar day in the same zone as the edition line, so the pick does not flip at UTC midnight. */
export function editionDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayNumber(day: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return 0;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000);
}

function bySlug<T extends WorldCandidate>(a: T, b: T): number {
  return a.slug.localeCompare(b.slug);
}

function rotationPool<T extends WorldCandidate>(world: T[], day: string): T[] {
  const end = dayNumber(day);
  const start = end - 21;
  const recent = world.filter((story) => {
    const published = dayNumber(story.date);
    return published >= start && published <= end;
  });
  const source = recent.length ? recent : world.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : bySlug(a, b))).slice(0, 8);
  return source.slice().sort(bySlug);
}

export function worldSpotlight<T extends WorldCandidate>(stories: T[], day = editionDay()): T | undefined {
  const world = stories.filter((story) => story.country !== "US" && !story.draft);
  if (!world.length) return undefined;
  const flagged = world.filter((story) => story.worldPick).sort(bySlug);
  if (flagged.length) return flagged[0];
  const pool = rotationPool(world, day);
  if (!pool.length) return undefined;
  return pool[dayNumber(day) % pool.length];
}
