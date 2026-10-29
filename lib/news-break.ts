import { getHubIndex, type HubIndex } from "./hubs";
import { getTag } from "./tags";

/**
 * Reader-facing text and tags that do not belong on the quiet page.
 * Word boundaries keep "shoots", "shot", and "inaugurated" in.
 * Newspaper names and "Democratic Republic" are removed before the match
 * so a citation is not treated as a political story.
 */
const HEAVY_NEWS_TERMS = [
  "elections?",
  "electorates?",
  "electoral",
  "candidates?",
  "candidacies",
  "candidacy",
  "ballots?",
  "balloting",
  "midterms?",
  "democrats?",
  "democratic",
  "republicans?",
  "gop",
  "congress(?!\\s+(?:ave|avenue|st|street|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pkwy|parkway)\\b)",
  "congressional",
  "senators?",
  "senate",
  "legislatures?",
  "legislation",
  "legislative",
  "legislators?",
  "partisan",
  "bipartisan",
  "politicians?",
  "politics",
  "political",
  "incumbents?",
  "caucuses",
  "caucus",
  "referendums?",
  "referenda",
  "referendum",
  "impeachments?",
  "impeached",
  "impeach",
  "filibusters?",
  "filibuster",
  "polling places?",
  "polling stations?",
  "white house",
  "oval office",
  "campaign trails?",
  "primary elections?",
  "general elections?",
  "mass shootings?",
  "active shooters?",
  "shootings?",
  "shooters?",
  "gunfire",
  "gunshots?",
  "gunmen",
  "gunman",
  "use of force",
  "use-of-force",
  "officer-involved",
  "shots fired",
  "lethal force",
  "excessive force",
];

const HEAVY_NEWS = new RegExp(`\\b(?:${HEAVY_NEWS_TERMS.join("|")})\\b`, "i");

const SAFE_PHRASES = [
  /democratic republic/gi,
  /democrat-gazette/gi,
  /times[-\s]+republican/gi,
  /cynthiana democrat/gi,
  /library of congress/gi,
];

export const NEWS_BREAK_TITLE = "Need a break from the news?";

export const NEWS_BREAK_DESCRIPTION =
  "Need a break from the news? Good news only, for news fatigue. Uplifting news today: five verified stories, a 60-second scan, and a way to help.";

export const QUICK_READ_LIMIT = 8;

export type NewsBreakStory = {
  slug: string;
  title: string;
  shortTitle?: string;
  emphasis?: string;
  dek: string;
  body?: string;
  city?: string;
  place?: string;
  correction?: string;
  tags?: string[];
  sourceName?: string;
  imageAlt?: string;
  imageCaption?: string;
  kidSummary?: string;
  kidQuestions?: string[];
  featured?: boolean;
  top5?: number;
};

export type NewsBreakHub = {
  href: string;
  title: string;
  text: string;
  cta: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function haystack(story: NewsBreakStory): string {
  const tags = story.tags ?? [];
  const tagText = tags.flatMap((tag) => {
    const label = getTag(tag)?.label;
    return [tag.replaceAll("-", " "), label ?? ""];
  });
  let text = [
    story.title,
    story.shortTitle,
    story.emphasis,
    story.dek,
    story.body,
    story.city,
    story.place,
    story.correction,
    story.imageAlt,
    story.imageCaption,
    story.kidSummary,
    ...(story.kidQuestions ?? []),
    ...tagText,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n");

  const source = story.sourceName?.trim();
  if (source) text = text.replace(new RegExp(escapeRegExp(source), "gi"), " ");
  for (const phrase of SAFE_PHRASES) text = text.replace(phrase, " ");
  return text;
}

/** The matched term, if this story should stay off the quiet page. */
export function heavyNewsReason(story: NewsBreakStory): string | undefined {
  return haystack(story).match(HEAVY_NEWS)?.[0];
}

export function isHeavyNews(story: NewsBreakStory): boolean {
  return heavyNewsReason(story) !== undefined;
}

/**
 * Story of the day first, then the ranked five, then newer stories
 * until the list is full. Filtered stories never enter.
 * `stories` must already be in edition order.
 */
export function newsBreakTop<T extends NewsBreakStory>(stories: T[], limit = 5): T[] {
  const calm = stories.filter((story) => !isHeavyNews(story));
  const lead = calm.find((story) => story.featured) ?? calm[0];
  const ranked = calm.filter((story) => story.top5).sort((a, b) => (a.top5 ?? 99) - (b.top5 ?? 99));
  const picked: T[] = [];
  const seen = new Set<string>();

  function add(story?: T) {
    if (!story || seen.has(story.slug) || picked.length >= limit) return;
    seen.add(story.slug);
    picked.push(story);
  }

  add(lead);
  for (const story of ranked) add(story);
  for (const story of calm) add(story);
  return picked;
}

export function newsBreakQuickRead<T extends NewsBreakStory>(
  stories: T[],
  exclude: Iterable<string>,
  limit = QUICK_READ_LIMIT,
): T[] {
  const skip = new Set(exclude);
  const picked: T[] = [];
  for (const story of stories) {
    if (skip.has(story.slug) || isHeavyNews(story)) continue;
    picked.push(story);
    if (picked.length === limit) break;
  }
  return picked;
}

/** First full sentence when it is long enough to stand alone. */
export function quickReadLine(dek: string): string {
  const trimmed = dek.trim().replace(/\s+/g, " ");
  const first = trimmed.split(/(?<=[.!?])\s+(?=[A-Z“"])/)[0]?.trim();
  if (first && first.length >= 40) return first;
  return trimmed;
}

/**
 * Quiet reading already on the site. Seasonal banners stay off this list.
 */
export function newsBreakHubs(index?: HubIndex): NewsBreakHub[] {
  const hubs: NewsBreakHub[] = [
    {
      href: "/kids",
      title: "For classrooms",
      text: "A kid-friendly story, a short summary a teacher can read aloud, and a few questions for the room.",
      cta: "Open for classrooms",
    },
    {
      href: "/week",
      title: "This week",
      text: "The weekly roundup. A week gets its own page once it has enough stories to hold together.",
      cta: "Read the week",
    },
    {
      href: "/local",
      title: "Good news by state",
      text: "The same kind of reporting, sorted by state, including Washington, D.C.",
      cta: "Pick a state",
    },
    {
      href: "/help",
      title: "Ways to help",
      text: "Donate, volunteer, or say thank you. The links go to the organizations named in the reporting.",
      cta: "See ways to help",
    },
    {
      href: "/explainers",
      title: "Explainers",
      text: "Short guides on how a community fridge, an honor flight, or a little library actually works.",
      cta: "Read an explainer",
    },
    {
      href: "/quiz",
      title: "Good News Quiz",
      text: "A short weekly quiz from stories already checked. Kid mode is there for a class.",
      cta: "Take the quiz",
    },
    {
      href: "/kindness-challenge",
      title: "Kindness Challenge",
      text: "One small action for the week, written for a classroom or a family.",
      cta: "See this week's challenge",
    },
    {
      href: "/on-this-day",
      title: "On this day",
      text: "A verified milestone from this date, plus good news the archive already published then.",
      cta: "Open today",
    },
    {
      href: "/morning-announcements",
      title: "Morning announcements",
      text: "A short script a school can read at the start of the day.",
      cta: "Open today's script",
    },
    {
      href: "/heroes",
      title: "Hometown Heroes",
      text: "Firefighters, police, EMTs, dispatchers, and search-and-rescue crews who helped.",
      cta: "Meet the heroes",
    },
    {
      href: "/classroom",
      title: "Good News Friday",
      text: "A printable pack of classroom stories for the week.",
      cta: "Open the Friday pack",
    },
    {
      href: "/es/buenas-noticias",
      title: "Buenas noticias",
      text: "The weekly Top 5 in Spanish, for a family or a class.",
      cta: "Leer en español",
    },
  ];

  const resolved = index ?? getHubIndex();
  const kindness = resolved.byPath.get("/topic/kindness");
  if (kindness) {
    hubs.push({
      href: kindness.path,
      title: "Kindness",
      text: getTag("kindness")?.intro ?? kindness.description,
      cta: "Read kindness stories",
    });
  }
  return hubs;
}
