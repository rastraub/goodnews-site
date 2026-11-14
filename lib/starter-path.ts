/** Paths for Good News Starters. Safe for client components to import. */

export const STARTERS_INDEX_PATH = "/starters";

export const STARTERS_FEED_PATH = "/starters/rss.xml";

export function starterWeekPath(week: string): string {
  return `${STARTERS_INDEX_PATH}/${week}`;
}
