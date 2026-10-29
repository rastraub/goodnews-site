/**
 * Evergreen month-and-day routes. February 29 is included so leap years
 * have a page. Nothing here reads the filesystem, so client code can import it.
 *
 * `mountainIsoDay` is the America/Denver calendar day. It matches `mountainDay`
 * in `lib/weeks.ts`. The morning edition is dated on that clock.
 */

export const MOUNTAIN_TIME_ZONE = "America/Denver";

export const MONTHS = [
  { slug: "january", name: "January", days: 31 },
  { slug: "february", name: "February", days: 29 },
  { slug: "march", name: "March", days: 31 },
  { slug: "april", name: "April", days: 30 },
  { slug: "may", name: "May", days: 31 },
  { slug: "june", name: "June", days: 30 },
  { slug: "july", name: "July", days: 31 },
  { slug: "august", name: "August", days: 31 },
  { slug: "september", name: "September", days: 30 },
  { slug: "october", name: "October", days: 31 },
  { slug: "november", name: "November", days: 30 },
  { slug: "december", name: "December", days: 31 },
] as const;

export type CalendarDay = { month: number; day: number };

export function daysInMonth(month: number): number {
  return MONTHS[month - 1]?.days ?? 0;
}

export function monthName(month: number): string {
  return MONTHS[month - 1]?.name ?? "";
}

export function monthDayLabel(month: number, day: number): string {
  return `${monthName(month)} ${day}`;
}

export function monthDaySlug(month: number, day: number): string {
  return `${MONTHS[month - 1]?.slug ?? "unknown"}-${day}`;
}

export function onThisDayPath(month: number, day: number): string {
  return `/on-this-day/${monthDaySlug(month, day)}`;
}

export function parseMonthDaySlug(slug: string): CalendarDay | undefined {
  const match = /^([a-z]+)-(\d{1,2})$/.exec(slug);
  if (!match) return undefined;
  const month = MONTHS.findIndex((item) => item.slug === match[1]) + 1;
  const day = Number(match[2]);
  if (!month || day < 1 || day > daysInMonth(month)) return undefined;
  return { month, day };
}

export function allCalendarDays(): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= daysInMonth(month); day += 1) {
      days.push({ month, day });
    }
  }
  return days;
}

/** October 25 through December 31, the seeded window for this feature. */
export function seedWindow(): CalendarDay[] {
  return allCalendarDays().filter((day) => day.month === 11 || day.month === 12 || (day.month === 10 && day.day >= 25));
}

export function shiftCalendarDay(month: number, day: number, delta: number): CalendarDay {
  const days = allCalendarDays();
  const index = days.findIndex((item) => item.month === month && item.day === day);
  const next = days[(index + delta + days.length) % days.length];
  return next ?? { month, day };
}

export function mountainIsoDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MOUNTAIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthDayFromIso(iso: string): CalendarDay | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month)) return undefined;
  return { month, day };
}

export function calendarIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
