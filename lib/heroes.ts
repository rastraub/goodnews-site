/**
 * Hometown Heroes at /heroes.
 * A story belongs here when it carries the first-responders tag or one of the
 * responder-type tags. The heroes category is broader than this page.
 */
export const FIRST_RESPONDER_TAG = "first-responders";

export const RESPONDER_TYPES = [
  { slug: "firefighters", label: "Firefighters" },
  { slug: "police", label: "Police" },
  { slug: "ems", label: "EMTs & paramedics" },
  { slug: "dispatch", label: "911 dispatch" },
  { slug: "search-and-rescue", label: "Search and rescue" },
] as const;

export type ResponderType = (typeof RESPONDER_TYPES)[number]["slug"];

const TYPE_SLUGS = new Set<string>(RESPONDER_TYPES.map((type) => type.slug));

export function isResponderType(slug: string): slug is ResponderType {
  return TYPE_SLUGS.has(slug);
}

export function responderTypesFor(tags: readonly string[]): ResponderType[] {
  return tags.filter((tag): tag is ResponderType => TYPE_SLUGS.has(tag));
}

export function isHometownHero(tags: readonly string[]): boolean {
  return tags.includes(FIRST_RESPONDER_TAG) || tags.some((tag) => TYPE_SLUGS.has(tag));
}

export function heroStateCodes(story: {
  country: string;
  state?: string;
  alsoStates: readonly string[];
}): string[] {
  if (story.country !== "US") return [];
  const codes = [story.state, ...story.alsoStates].filter((code): code is string => Boolean(code));
  return [...new Set(codes)];
}

export function heroesPath(type: string, state: string): string {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (state) params.set("state", state);
  const query = params.toString();
  return query ? `/heroes?${query}` : "/heroes";
}
