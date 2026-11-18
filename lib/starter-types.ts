import type { CategorySlug } from "./categories";
import type { TagSlug } from "./tags";

/**
 * One reusable local action. Keywords and tags decide which stories can inspire it.
 * A multi-word keyword can match from the title or deck on its own.
 * A single word matches only when the story also shares a tag.
 * Category overlap raises the score. It does not create a match by itself.
 */
export type StarterAction = {
  id: string;
  title: string;
  categories: readonly CategorySlug[];
  tags: readonly TagSlug[];
  keywords: readonly string[];
  /** One or two sentences on why a small local copy of the idea works. */
  why: string;
  steps: readonly { name: string; text: string }[];
  /** Two or three short steps for the story-page box. */
  shortSteps: readonly string[];
  /** Time and cost in one plain sentence or two. */
  estimate: string;
  kidsNote?: string;
  safetyNote?: string;
  /** Published explainer slug, when a guide already covers this kind of help. */
  explainerSlug?: string;
};

/** Force one story to inspire one action on a Monday week. */
export type StarterPin = {
  week: string;
  action: string;
  story: string;
};

/** Drop stories or actions from a single Monday. */
export type StarterWeekExclude = {
  week: string;
  stories?: readonly string[];
  actions?: readonly string[];
};

/** The story fields the matcher reads. Full stories satisfy this. */
export type StarterStory = {
  slug: string;
  title: string;
  shortTitle?: string;
  dek: string;
  body?: string;
  date: string;
  category: string;
  tags?: readonly string[];
  city?: string;
  state?: string;
  country?: string;
  place?: string;
  sourceName?: string;
  sourceUrl?: string;
  kidFriendly?: boolean;
  draft?: boolean;
  image?: string;
  imageAlt?: string;
  imageTreatment?: "none" | "warm";
};
