import { getGivingGuide } from "../lib/giving-tuesday";
import { STATES } from "../lib/states";

const guide = getGivingGuide();
const counts = new Map<string, number>();
for (const pick of guide.picks) {
  counts.set(pick.primaryCause, (counts.get(pick.primaryCause) ?? 0) + 1);
}

console.log(`Giving Tuesday coverage: ${guide.picks.length} of ${STATES.length}`);
if (guide.gaps.length === 0) {
  console.log("Missing states: none");
} else {
  console.log("Missing states:");
  for (const state of guide.gaps) console.log(`- ${state.name} (${state.code})`);
}

const pinned = guide.picks.filter((pick) => pick.pinned).length;
console.log(`Editor pins: ${pinned}`);
console.log(
  `Primary causes: ${[...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([cause, count]) => `${cause} ${count}`)
    .join(", ")}`,
);
