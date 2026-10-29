import { newsBreakBanner } from "@/site.config";

/** Calendar day as YYYY-MM-DD in an IANA time zone. */
export function calendarDay(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** True on the inclusive dates in `newsBreakBanner`. */
export function isNewsBreakBannerActive(now = new Date()): boolean {
  const day = calendarDay(newsBreakBanner.timeZone, now);
  return day >= newsBreakBanner.start && day <= newsBreakBanner.end;
}
