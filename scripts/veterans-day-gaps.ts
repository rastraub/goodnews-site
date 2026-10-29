import { getPublishedStories } from "../lib/stories";
import { buildVeteransDayHub, loadVeteransDayPins } from "../lib/veterans-day";

const pins = loadVeteransDayPins();
const hub = buildVeteransDayHub(getPublishedStories(), pins);
const pinList = Object.entries(pins);

console.log(`Veterans Day hub: ${hub.covered.length} of ${hub.slots.length} places covered (50 states and D.C.).`);
if (pinList.length) {
  console.log("Pins:");
  for (const [code, slug] of pinList) console.log(`  ${code} ${slug}`);
} else {
  console.log("Pins: none");
}
if (hub.pinErrors.length) {
  console.error("Pin problems:");
  for (const error of hub.pinErrors) console.error(`- ${error}`);
  process.exitCode = 1;
}
console.log("Covered:");
for (const slot of hub.covered) {
  console.log(`  ${slot.state.code} ${slot.story?.slug ?? ""}`);
}
console.log(`Missing: ${hub.gaps.length}`);
for (const slot of hub.gaps) console.log(slot.state.name);
