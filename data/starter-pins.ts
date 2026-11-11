import type { StarterPin, StarterWeekExclude } from "../lib/starter-types";

/**
 * Editor controls for Good News Starters at /starters.
 *
 * Leave every list empty and the matcher picks three actions for each Monday.
 *
 * STARTER_PINS
 *   Choose the story that inspires an action on one Monday week.
 *   week: a Monday, YYYY-MM-DD, on the same calendar as /week.
 *   action: an id from data/starter-actions.ts.
 *   story: a published story slug.
 *   Example: { week: "2026-11-09", action: "book-drive", story: "argyle-little-library" }
 *   A pin cannot bring back a story the safety filter rejected
 *   (politics, violence, crime, tragedy, or medical advice).
 *
 * STARTER_WEEK_EXCLUDES
 *   Keep a story or an action off one Monday.
 *   stories: slugs that cannot inspire a pick that week.
 *   actions: action ids that stay off that week.
 *   Example: { week: "2026-11-09", stories: ["some-story"], actions: ["tool-share"] }
 *
 * STARTER_BOX_EXCLUDE
 *   Story slugs that never show the "Do this where you live" box on the story
 *   page. This list does not remove the story from a weekly starters page.
 *   Example entry: "some-story"
 */
export const STARTER_PINS: readonly StarterPin[] = [];

export const STARTER_WEEK_EXCLUDES: readonly StarterWeekExclude[] = [];

export const STARTER_BOX_EXCLUDE: readonly string[] = [];
