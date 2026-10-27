/**
 * Hometown Heroes (/heroes).
 *
 * A story belongs on the hub when `firstResponder` is set, when it is tagged
 * `first-responders`, or when it carries a responder-type tag. The type field
 * is optional so a story can publish before this branch merges. Those stories
 * use the tags below, which the hub reads the same way.
 */
export const FIRST_RESPONDER_SLUGS = ["fire", "police", "ems", "dispatch", "search-and-rescue"] as const;

export type FirstResponderType = (typeof FIRST_RESPONDER_SLUGS)[number];

export const FIRST_RESPONDER_TAG = "first-responders";

export const RESPONDER_TYPES: { slug: FirstResponderType; label: string; tags: readonly string[] }[] = [
  { slug: "fire", label: "Fire", tags: ["firefighters"] },
  { slug: "police", label: "Police", tags: ["police"] },
  { slug: "ems", label: "EMS", tags: ["ems"] },
  { slug: "dispatch", label: "Dispatch", tags: ["dispatch"] },
  { slug: "search-and-rescue", label: "Search and rescue", tags: ["search-and-rescue"] },
];

const SLUGS = new Set<string>(FIRST_RESPONDER_SLUGS);

export function isFirstResponderType(value: string | undefined | null): value is FirstResponderType {
  return Boolean(value && SLUGS.has(value));
}

type ResponderFields = {
  tags: readonly string[];
  firstResponder?: string;
};

export function responderTypeOf(story: ResponderFields): FirstResponderType | undefined {
  if (isFirstResponderType(story.firstResponder)) return story.firstResponder;
  for (const type of RESPONDER_TYPES) {
    if (type.tags.some((tag) => story.tags.includes(tag))) return type.slug;
  }
  return undefined;
}

export function isFirstResponderStory(story: ResponderFields): boolean {
  if (isFirstResponderType(story.firstResponder)) return true;
  if (story.tags.includes(FIRST_RESPONDER_TAG)) return true;
  return responderTypeOf(story) !== undefined;
}

export function heroesHref(options: { type?: string; state?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.state) params.set("state", options.state.toLowerCase());
  const query = params.toString();
  return query ? `/heroes?${query}` : "/heroes";
}
