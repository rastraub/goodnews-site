import { getFirstRespondersDayHub } from "../lib/first-responders-day";

const hub = getFirstRespondersDayHub();
for (const role of hub.roles) {
  const slugs = role.stories.map((item) => `${item.pinned ? "*" : ""}${item.story.slug}`);
  console.log(`${role.label}: ${slugs.join(", ") || "(none)"}`);
}
const open = hub.gaps.map((slot) => slot.state.name);
console.log(open.length ? `Open states: ${open.join(", ")}` : "Every state and Washington, D.C. has a story.");
