/**
 * Editor overrides for the Giving Tuesday guide at /giving-tuesday.
 *
 * A pin replaces the automatic pick for that state. Leave the list empty
 * and every state stays on the automatic pick.
 *
 * state: USPS code, including DC.
 * slug: the story filename without .md. The story must be published,
 *       in the United States, and its state field must match.
 * url:  optional. When set, it must match one howToHelp URL in that
 *       story exactly. When omitted, the guide uses the strongest
 *       how-to-help link on that story.
 */
export type GivingPin = {
  state: string;
  slug: string;
  url?: string;
};

export const GIVING_TUESDAY_PINS: readonly GivingPin[] = [];
