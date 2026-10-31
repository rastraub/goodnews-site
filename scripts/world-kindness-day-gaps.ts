import { getPublishedStories } from "../lib/stories";
import { buildWorldKindnessHub, loadWorldKindnessEditorConfig } from "../lib/world-kindness-day";

const config = loadWorldKindnessEditorConfig();
const hub = buildWorldKindnessHub(getPublishedStories(), config);

console.log(`States with no qualifying story: ${hub.gaps.length}`);
for (const slot of hub.gaps) console.log(`${slot.state.code} ${slot.state.name}`);
if (hub.gaps.length === 0) console.log("Every state and Washington, D.C. has a qualifying story.");

console.log(`World stories: ${hub.world.length}`);
console.log(`Kids stories: ${hub.kids.length}`);
console.log(`Covered: ${hub.covered.length} of ${hub.slots.length}`);
for (const slot of hub.covered) {
  console.log(`  ${slot.state.code} ${slot.story?.slug ?? ""}`);
}

if (hub.pinErrors.length) {
  console.error("Pin problems:");
  for (const error of hub.pinErrors) console.error(`- ${error}`);
  process.exitCode = 1;
}
