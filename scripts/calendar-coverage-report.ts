/**
 * Observances in the next 60 days with fewer than two matching archive stories.
 * The daily publishing run can use this list. Gaps do not fail the build.
 */
import { CALENDAR_COVERAGE_DAYS, addIsoDays, calendarCoverageGaps, getCalendarView } from "../lib/good-news-calendar";

const view = getCalendarView();
const horizon = addIsoDays(view.today, CALENDAR_COVERAGE_DAYS);
const gaps = calendarCoverageGaps();

console.log(`Good News Calendar coverage, next ${CALENDAR_COVERAGE_DAYS} days (America/Denver).`);
console.log(`Today: ${view.today}. Through: ${horizon}.`);

if (!gaps.length) {
  console.log("Every observance in this window has at least 2 matching stories.");
} else {
  console.log(`Fewer than 2 matching stories: ${gaps.length}`);
  for (const item of gaps) {
    const count = item.stories.length;
    const noun = count === 1 ? "story" : "stories";
    console.log(`  ${item.start}  ${item.observance.slug}  ${item.observance.name}  ${count} ${noun}`);
    console.log(`    tags: ${item.observance.tags.join(", ")}`);
  }
}

const ready = view.upcoming.filter((item) => item.start <= horizon && item.stories.length >= 2);
console.log(`Ready in this window: ${ready.length}`);
