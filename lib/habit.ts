/**
 * Private, on-device reading habit. Nothing here is sent to a server.
 * The streak is consecutive edition days in America/Denver.
 * The install prompt is shown at most once per 14 days.
 *
 * Date helpers are copied here on purpose. `lib/weeks.ts` loads stories,
 * and this file is imported by client components.
 */
export const INSTALL_PROMPT_MS = 14 * 24 * 60 * 60 * 1000;
export const INSTALL_PROMPT_KEY = "goodnews-install-prompt";
export const STREAK_KEY = "goodnews-streak";
export const STREAK_EVENT = "goodnews-streak-change";

export const STREAK_MILESTONES = [3, 7, 14, 30, 100] as const;

const DENVER = "America/Denver";

function parseIsoDate(iso: string): { y: number; m: number; d: number } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return undefined;
  return { y, m, d };
}

function addDays(iso: string, days: number): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const utc = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days));
  return utc.toISOString().slice(0, 10);
}

/** Calendar day in America/Denver, the same zone as the edition week. */
export function denverDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DENVER,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type StreakRecord = {
  last: string;
  count: number;
  reported: number;
};

/** Pages that should not offer an install prompt or count a streak visit. */
export function habitSurface(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  if (pathname === "/widgets" || pathname.startsWith("/widgets/")) return false;
  if (pathname === "/embed" || pathname.startsWith("/embed/") || pathname === "/embed.js") return false;
  if (pathname.includes("/print")) return false;
  if (/^\/web-stories\/\d{4}-\d{2}-\d{2}(?:\/|$)/.test(pathname)) return false;
  return true;
}

export function installPromptDue(lastShown: number | undefined, now: number): boolean {
  if (lastShown === undefined || !Number.isFinite(lastShown)) return true;
  if (lastShown > now) return false;
  return now - lastShown >= INSTALL_PROMPT_MS;
}

/**
 * Advance the streak for a Denver calendar day.
 * The same day does not add another count. A missed day starts again at 1.
 * `milestone` is the smallest unreported milestone the new count has reached.
 */
export function nextStreak(previous: StreakRecord | undefined, today: string): { record: StreakRecord; milestone?: number } {
  const yesterday = addDays(today, -1);
  let count = 1;
  let reported = 0;
  if (previous && previous.last === today) {
    count = Math.max(1, previous.count);
    reported = Math.max(0, previous.reported);
  } else if (previous && previous.last === yesterday) {
    count = Math.max(1, previous.count) + 1;
    reported = Math.max(0, previous.reported);
  }
  const milestone = STREAK_MILESTONES.find((day) => day <= count && day > reported);
  return { record: { last: today, count, reported }, milestone };
}

export function markMilestone(record: StreakRecord, milestone: number): StreakRecord {
  return { ...record, reported: milestone };
}
