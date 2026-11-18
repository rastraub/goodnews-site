import { adventUnpinnedDays, getAdventCalendar, loadAdventConfig } from "../lib/advent";
import { mountainDay } from "../lib/weeks";

const today = mountainDay();
const config = loadAdventConfig();
const calendar = getAdventCalendar("2026-12-24");
const unpinned = adventUnpinnedDays(calendar);

console.log(`December Advent of Good News. Denver today: ${today}. Pins in data/advent-2026.json: ${Object.keys(config.pins).length}.`);
console.log(`Days without an editor pin: ${unpinned.length}`);
for (const door of unpinned) {
  const weak = door.score === 0 ? " WEAK MATCH" : "";
  const slug = door.story?.slug ?? "(no story)";
  console.log(`  ${String(door.day).padStart(2, " ")}  ${door.act.theme}  score ${door.score}${weak}  auto ${slug}  act: ${door.act.title}`);
}
const pinned = calendar.doors.filter((door) => door.pinned);
console.log(`Pinned days: ${pinned.length}`);
for (const door of pinned) {
  console.log(`  ${String(door.day).padStart(2, " ")}  ${door.story?.slug ?? ""}`);
}
if (!calendar.doors.every((door) => door.story)) {
  console.error("At least one door has no story.");
  process.exitCode = 1;
}
if (calendar.pinErrors.length) {
  console.error("Pin problems:");
  for (const error of calendar.pinErrors) console.error(`- ${error}`);
  process.exitCode = 1;
}
