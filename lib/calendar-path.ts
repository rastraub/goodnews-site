/** Paths for the Good News Calendar. Safe for client components to import. */

export const CALENDAR_PATH = "/calendar";

export const CALENDAR_ICS_PATH = "/calendar/good-news.ics";

/**
 * Hubs that already exist in this repo. An observance may link one or more.
 * `scripts/validate-stories.ts` checks these paths against the hub modules.
 */
export const CALENDAR_HUBS = {
  veterans: { path: "/veterans-day", label: "Veterans Day stories" },
  giving: { path: "/giving-tuesday", label: "50 states, 50 ways to help" },
  thanks: { path: "/50-states-of-thanks", label: "50 States of Thanks" },
  kindness: { path: "/kindness-challenge", label: "Kindness Challenge" },
  "world-kindness": { path: "/world-kindness-day", label: "World Kindness Day stories" },
  responders: { path: "/first-responders-day", label: "First Responders Day stories" },
  neighbor: { path: "/good-neighbor", label: "Good Neighbor vote" },
} as const;

export type CalendarHubId = keyof typeof CALENDAR_HUBS;
