/**
 * Holiday break packs at /break and /break/{slug}.
 * `start` and `end` are inclusive calendar dates. The index chooses the
 * current or next pack with the Denver day from `mountainDay()` in lib/weeks.ts.
 * Add a new object here, then add a matching pins entry in data/break-pins.ts.
 */
export type BreakEditionDef = {
  slug: string;
  name: string;
  seoTitle: string;
  description: string;
  start: string;
  end: string;
  kicker: string;
  heading: string;
  lede: string;
};

export const BREAK_EDITIONS: readonly BreakEditionDef[] = [
  {
    slug: "thanksgiving-2026",
    name: "Thanksgiving break",
    seoTitle: "Thanksgiving Break Activities for Kids: Good News Pack",
    description:
      "Printable Thanksgiving break activities for kids: read-aloud good news, a Kindness Bingo card, and screen-light things to do together at home.",
    start: "2026-11-21",
    end: "2026-11-29",
    kicker: "Thanksgiving break 2026",
    heading: "Thanksgiving Break Activities for Kids",
    lede:
      "A Good News pack for the week around Thanksgiving, November 21 through 29, 2026. Five or more true stories to read aloud, a Kindness Bingo card, and activities that are already on this site.",
  },
  {
    slug: "winter-2026",
    name: "Winter break",
    seoTitle: "Winter Break Activities for Kids: Good News Pack",
    description:
      "Printable winter break activities for kids: read-aloud good news, a Kindness Bingo card, and screen-light things to do together at home.",
    start: "2026-12-19",
    end: "2027-01-04",
    kicker: "Winter break 2026",
    heading: "Winter Break Activities for Kids",
    lede:
      "A Good News pack for winter break, December 19, 2026 through January 4, 2027. True stories to read aloud, a Kindness Bingo card, and screen-light activities a family can do together.",
  },
];
