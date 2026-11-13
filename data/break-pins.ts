/**
 * Editor pins and excludes for holiday break packs.
 *
 * pins: story slugs forced to the front of that edition, in this order.
 *       A pin still has to be a published classroom story that passes the
 *       break filter. A violent, political, or illness story cannot be pinned back in.
 * exclude: story slugs left out of that edition.
 *
 * Leave both arrays empty to keep the automatic pick.
 * One entry per edition slug in data/break-editions.ts.
 */
export type BreakPinFile = {
  pins: readonly string[];
  exclude: readonly string[];
};

export const BREAK_PINS: Record<string, BreakPinFile> = {
  "thanksgiving-2026": { pins: [], exclude: [] },
  "winter-2026": { pins: [], exclude: [] },
};
