import { calendarDay, isNewsBreakBannerActive } from "./news-break-banner";

/**
 * One homepage banner at a time.
 *
 * Each hub keeps its own eligible window. When two or more are eligible,
 * the homepage shows a single banner so the story of the day stays in view.
 *
 * November handoff, using each banner's own clock for eligibility and the
 * New York edition date for the Veterans Day exception:
 * - Oct 31–Nov 5: election-week news break
 * - Nov 6–10 and Nov 12–14: World Kindness Day
 * - Nov 11: Veterans Day
 * - Nov 15–23: 50 States of Thanks
 * - Nov 24–Dec 2: Giving Tuesday
 * A banner that is the only one in season still shows, including Veterans Day
 * on a year when the others are off.
 */
export const HOMEPAGE_BANNER_IDS = [
  "news-break",
  "veterans",
  "world-kindness",
  "thanks",
  "giving-tuesday",
  "first-responders",
] as const;

export type HomepageBannerId = (typeof HOMEPAGE_BANNER_IDS)[number];

export type HomepageBannerFlags = Record<HomepageBannerId, boolean>;

/** Month-day window. `start` and `end` are MM-DD. The year does not matter. */
export const VETERANS_BANNER_WINDOW = { start: "11-01", end: "11-12", timeZone: "America/New_York" } as const;

export const WORLD_KINDNESS_BANNER = { start: "11-06", end: "11-14", timeZone: "America/Denver" } as const;

export const FIRST_RESPONDERS_BANNER_WINDOW = { start: "10-21", end: "10-29", timeZone: "America/New_York" } as const;

/**
 * Kept in step with `thanksSeason` and the Giving Tuesday banner constants.
 * validate-stories fails if those dates move and this copy does not.
 */
export const THANKS_BANNER_WINDOW = {
  enabled: true,
  start: "2026-11-01",
  end: "2026-11-30",
  timeZone: "America/Denver",
} as const;

export const GIVING_TUESDAY_BANNER_WINDOW = {
  start: "2026-11-24",
  end: "2026-12-02",
  timeZone: "America/New_York",
} as const;

const NEW_YORK = "America/New_York";

export function monthDayInRange(day: string, start: string, end: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const monthDay = day.slice(5);
  return monthDay >= start && monthDay <= end;
}

export function dateInRange(day: string, start: string, end: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= start && day <= end;
}

export function emptyBannerFlags(): HomepageBannerFlags {
  return {
    "news-break": false,
    veterans: false,
    "world-kindness": false,
    thanks: false,
    "giving-tuesday": false,
    "first-responders": false,
  };
}

/**
 * `nyDay` is the America/New_York calendar day, YYYY-MM-DD.
 * November 11 yields to Veterans Day when that banner is eligible.
 * Otherwise World Kindness Day wins inside its window, then the news break,
 * then any leftover Veterans Day days, then Giving Tuesday, then Thanksgiving.
 */
export function pickHomepageBanner(flags: HomepageBannerFlags, nyDay: string): HomepageBannerId | null {
  const active = HOMEPAGE_BANNER_IDS.filter((id) => flags[id]);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0] ?? null;
  if (nyDay.slice(5) === "11-11" && flags.veterans) return "veterans";
  if (flags["world-kindness"]) return "world-kindness";
  if (flags["news-break"]) return "news-break";
  if (flags.veterans) return "veterans";
  if (flags["giving-tuesday"]) return "giving-tuesday";
  if (flags.thanks) return "thanks";
  if (flags["first-responders"]) return "first-responders";
  return active[0] ?? null;
}

export function homepageBannerFlags(now = new Date()): HomepageBannerFlags {
  const ny = calendarDay(NEW_YORK, now);
  const denver = calendarDay(WORLD_KINDNESS_BANNER.timeZone, now);
  return {
    "news-break": isNewsBreakBannerActive(now),
    veterans: monthDayInRange(ny, VETERANS_BANNER_WINDOW.start, VETERANS_BANNER_WINDOW.end),
    "world-kindness": monthDayInRange(denver, WORLD_KINDNESS_BANNER.start, WORLD_KINDNESS_BANNER.end),
    thanks: THANKS_BANNER_WINDOW.enabled && dateInRange(denver, THANKS_BANNER_WINDOW.start, THANKS_BANNER_WINDOW.end),
    "giving-tuesday": dateInRange(ny, GIVING_TUESDAY_BANNER_WINDOW.start, GIVING_TUESDAY_BANNER_WINDOW.end),
    "first-responders": monthDayInRange(ny, FIRST_RESPONDERS_BANNER_WINDOW.start, FIRST_RESPONDERS_BANNER_WINDOW.end),
  };
}

/** The one banner the homepage should render, or null when none are in season. */
export function activeHomepageBanner(now = new Date()): HomepageBannerId | null {
  const ny = calendarDay(NEW_YORK, now);
  return pickHomepageBanner(homepageBannerFlags(now), ny);
}
