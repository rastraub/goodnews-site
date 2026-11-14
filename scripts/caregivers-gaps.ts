import { CAREGIVERS_EDITION_SIZE, buildCaregiverEditions, loadCaregiverPins } from "../lib/caregivers";
import { getPublishedStories } from "../lib/stories";

const config = loadCaregiverPins();
const { editions, pinErrors } = buildCaregiverEditions(getPublishedStories(), config);

console.log(`Caregiver editions: ${editions.length}.`);
if (!Object.keys(config.weeks).length) console.log("Pins: none");
for (const [start, week] of Object.entries(config.weeks)) {
  console.log(`Pins ${start}: include ${week.include.join(", ") || "none"}; exclude ${week.exclude.join(", ") || "none"}`);
}
for (const edition of editions) {
  const seniors = edition.stories.filter((story) => story.tags.includes("seniors")).length;
  const short = edition.stories.length < CAREGIVERS_EDITION_SIZE ? " short" : "";
  const backlog = edition.usedBacklog ? " backlog" : "";
  console.log(`${edition.start} ${edition.stories.length}${short}${backlog} seniors:${seniors} ${edition.stories.map((story) => story.slug).join(" ")}`);
}
const thin = editions.filter((edition) => edition.stories.length < CAREGIVERS_EDITION_SIZE);
console.log(`Shorter than five: ${thin.map((edition) => edition.start).join(", ") || "none"}.`);
if (pinErrors.length) {
  console.error("Pin problems:");
  for (const error of pinErrors) console.error(`- ${error}`);
  process.exitCode = 1;
}
