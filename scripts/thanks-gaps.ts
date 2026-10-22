import { thanksBoard } from "../lib/thanks";

const board = thanksBoard();
const missing = board.slots.filter((slot) => !slot.story);
const pinned = board.slots.filter((slot) => slot.source === "pinned");

console.log(`50 States of Thanks: ${board.filled} of ${board.total} filled`);

if (!missing.length) {
  console.log("Every state has a fitting story.");
} else {
  console.log(`\nMissing a fitting story (${missing.length}):`);
  for (const slot of missing) {
    console.log(`- ${slot.state.name} (${slot.state.code})`);
  }
}

if (pinned.length) {
  console.log("\nPinned:");
  for (const slot of pinned) {
    console.log(`- ${slot.state.name} (${slot.state.code}): ${slot.story?.slug}`);
  }
}

console.log("\nPins live in data/thanks-overrides.json. A morning batch can fill an open state on the next deploy.");
