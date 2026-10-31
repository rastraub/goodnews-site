/**
 * World Kindness Day hub at /world-kindness-day.
 *
 * The page stays up all year. Stories are chosen from the archive. Editor
 * pins and an exclude list live in data/world-kindness-day.json. State cards
 * use the shared one-story picker. World and kids sections are this hub's own
 * cut of the best matches.
 *
 * A story stays off when it matches the news-break heavy-news filter
 * (violence, use of force, politics) or a tragedy-centered headline, or when
 * its slug is on the exclude list. A pin cannot put a blocked story back.
 * See ADDING_STORIES.md.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { openGraphImage } from "./feed-image";
import { GIVING_TUESDAY_PATH } from "./giving-tuesday";
import { monthDayInRange, WORLD_KINDNESS_BANNER } from "./homepage-banner";
import { KINDNESS_INDEX_PATH } from "./kindness";
import { heavyNewsReason } from "./news-break";
import { absoluteUrl, publishedIso } from "./seo";
import { pickStateStories, type StateHubSlot } from "./state-story-hub";
import { getPublishedStories, type Story } from "./stories";
import { THANKS_PATH } from "./thanks";
import { mountainDay } from "./weeks";
import { siteConfig } from "@/site.config";

export const WORLD_KINDNESS_PATH = "/world-kindness-day";

export const WORLD_KINDNESS_TITLE = "World Kindness Day: stories and 13 free acts";

export const WORLD_KINDNESS_DESCRIPTION =
  "World Kindness Day is November 13. Verified kindness stories from the archive, one for each state we can match, plus 13 free acts of kindness and a classroom chain.";

export const WORLD_KINDNESS_SHARE =
  "World Kindness Day is November 13. Verified stories of neighbors, kids, and strangers helping, plus 13 free acts of kindness.";

/** How many kid-friendly stories to show. Pins still show when there are more pins than this. */
export const KIDS_STORY_LIMIT = 12;

const CONFIG_PATH = path.join(process.cwd(), "data", "world-kindness-day.json");

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

/** Tags that are themselves a kindness story. Volunteers alone is not enough. */
const PEOPLE_TAGS = [
  "kindness",
  "neighbors",
  "community-meals",
  "food-banks",
  "food-rescue",
  "little-free-libraries",
  "toys",
  "winter-clothes",
  "home-repairs",
  "school-lunch",
] as const;

const GARDEN_TAGS = ["community-garden", "cleanups"] as const;

const ANIMAL_KIND_TAGS = ["animal-rescue", "pet-adoption", "therapy-animals", "service-dogs"] as const;

const PET_TAGS = ["pet-adoption", "therapy-animals", "service-dogs"] as const;

const DOMESTIC_ANIMAL_TAGS = ["dogs", "cats", "birds", "horses"] as const;

const KID_TAGS = ["kids", "students"] as const;

const CONSERVATION_TAGS = ["wildlife-conservation", "zoos", "sea-turtles"] as const;

const PERSON_TAGS = new Set<string>([...PEOPLE_TAGS, ...GARDEN_TAGS, ...ANIMAL_KIND_TAGS, ...KID_TAGS, "volunteers"]);

const INSTITUTION_CATEGORIES = new Set(["science", "health-tech"]);

const TAG_POINTS: Record<string, number> = {
  kindness: 24,
  neighbors: 16,
  kids: 12,
  students: 10,
  volunteers: 8,
  "community-meals": 8,
  "food-banks": 8,
  "food-rescue": 7,
  "little-free-libraries": 7,
  toys: 7,
  "winter-clothes": 7,
  "home-repairs": 7,
  "school-lunch": 7,
  "community-garden": 6,
  cleanups: 5,
  "animal-rescue": 10,
  "pet-adoption": 8,
  "therapy-animals": 8,
  "service-dogs": 6,
};

const LEAD_POINTS: { pattern: RegExp; points: number }[] = [
  { pattern: /\bstrangers?\b/i, points: 12 },
  { pattern: /\bpay it forward\b/i, points: 10 },
  { pattern: /\bkindness\b/i, points: 8 },
  { pattern: /\bneighbou?rs?\b/i, points: 6 },
  { pattern: /\b(?:kids?|children|child|students?|graders?|teens?)\b/i, points: 4 },
  { pattern: /\b(?:donat\w*|for free|no charge|at no cost)\b/i, points: 3 },
];

/** A person handing something over. "Built" and "helped" are too broad. "Gave birth" is not a gift. */
const GIVING_TEXT =
  /\b(?:gave|gives|given|donat\w*|collected|collecting|raised|shared|delivered|packed|paid for|handed|handing)\b/i;

const ANIMAL_CARE_TEXT = /\b(?:rescued|foster(?:ed|ing)?|adopted|adoption|reunited)\b/i;

const MASS_RELEASE_TEXT = /\b(?:hatchlings?|census|population|released)\b/i;

/**
 * Tragedy at the center of the headline. A phone that "died" in the deck,
 * or a medical "risk of death", is not this phrase.
 */
const TITLE_TRAGEDY =
  /\b(?:killed|murdered|homicide|funeral|obituary|died|dies|death|deaths|dead|fatal|fatality|suicide|overdose|mourning|tragic|tragedy)\b/i;

const DEK_TRAGEDY =
  /\b(?:murdered|homicide|funeral|obituary|suicide|overdose|mourning|tragic|tragedy|was killed|were killed|shot and killed|passed away)\b/i;

/** Force and violence the heavy-news list does not already name. "bomb" is omitted so a seed bomb stays. */
const EXTRA_HARM =
  /\b(?:tasers?|tasered|pepper[- ]spray|stab(?:bed|bing)|assault(?:ed|s)?|murdered|homicide|airstrikes?|massacres?)\b/i;

export const KINDNESS_ACTS: { title: string; detail: string }[] = [
  {
    title: "Hold a door",
    detail: "Hold a door for the person behind you. It costs nothing and takes one moment.",
  },
  {
    title: "Write a thank-you note",
    detail: "Write a short thank-you to someone you already know, such as a relative, a teacher, a coworker, or a neighbor. Two or three sentences are enough.",
  },
  {
    title: "Let someone go first",
    detail: "The next time you are in a line, let the person behind you go ahead.",
  },
  {
    title: "Say one specific kind thing",
    detail: "Tell a classmate, a coworker, or someone in your home one specific thing they did that you are glad about.",
  },
  {
    title: "Pick up litter on your block",
    detail: "On a walk you already take, pick up a few pieces of litter and put them in a bin. If you are a child, go with a grown-up you live with.",
  },
  {
    title: "Leave a note at home",
    detail: "Leave a kind note where someone you live with will see it, such as on a table or a fridge.",
  },
  {
    title: "Send a hello",
    detail: "Send a short message to someone you already know, just to say hello. You do not need a reason.",
  },
  {
    title: "Share a snack you already have",
    detail: "If you packed extra, offer it to someone you already know. A no is a fine answer.",
  },
  {
    title: "Add a link to a kindness chain",
    detail: "Write one free kind act on a paper strip and add it to a chain at school or at home. The classroom section on this page has a pattern to print.",
  },
  {
    title: "Thank someone who helps your day",
    detail: "Thank a bus driver, a librarian, a custodian, or a cashier you already see. If you are a child, stay with a grown-up you know.",
  },
  {
    title: "Draw a picture",
    detail: "Draw a picture and give it to someone in your class or in your home.",
  },
  {
    title: "Return something you borrowed",
    detail: "Return a book, a tool, or a dish you borrowed. If you already use a Little Free Library, you can leave a book you are done with.",
  },
  {
    title: "Leave the closer seat",
    detail: "On a bus, a bench, or at a table, leave the closer seat for someone else.",
  },
];

export const CLASSROOM_QUESTIONS = [
  "What did people in one story on this page do that was kind?",
  "Which of the 13 free acts could you do on November 13 without spending money?",
  "What could your class write on a kindness-chain strip without using a full name, age, school, or email?",
] as const;

export const RELATED_HUBS: { href: string; label: string; note: string }[] = [
  {
    href: KINDNESS_INDEX_PATH,
    label: "Weekly Kindness Challenge",
    note: "One free kindness idea for the week, tied to a story already on the site.",
  },
  {
    href: "/good-neighbor",
    label: "Good Neighbor of the Month",
    note: "A vote for a neighbor who did something kind.",
  },
  {
    href: THANKS_PATH,
    label: "50 States of Thanks",
    note: "A gratitude story from every state.",
  },
  {
    href: GIVING_TUESDAY_PATH,
    label: "Giving Tuesday",
    note: "One reported way to help for each state.",
  },
];

const editorSchema = z
  .object({
    exclude: z.array(slugSchema),
    states: z.record(z.string().regex(/^[A-Z]{2}$/, "Use a two-letter USPS code"), slugSchema),
    world: z.array(slugSchema),
    kids: z.array(slugSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const lists: [string, string[]][] = [
      ["exclude", data.exclude],
      ["world", data.world],
      ["kids", data.kids],
    ];
    for (const [key, slugs] of lists) {
      const seen = new Set<string>();
      for (const slug of slugs) {
        if (seen.has(slug)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `Duplicate slug ${slug}` });
        }
        seen.add(slug);
      }
    }
  });

export type WorldKindnessEditorConfig = z.infer<typeof editorSchema>;

export type KindnessTheme = "strangers" | "kids" | "neighbors" | "community" | "animals";

export type KindnessSource = {
  slug: string;
  title: string;
  dek: string;
  body?: string;
  date: string;
  country: string;
  state?: string;
  alsoStates: string[];
  category: string;
  tags: string[];
  sourceName?: string;
  featured?: boolean;
  top5?: number;
  draft?: boolean;
  kidFriendly?: boolean;
  kidSummary?: string;
  kidQuestions?: string[];
  imageAlt?: string;
  imageCaption?: string;
  city?: string;
  place?: string;
  correction?: string;
  shortTitle?: string;
  emphasis?: string;
};

export type PinnedStory = { story: Story; pinned: boolean };

export type WorldKindnessHub = {
  slots: StateHubSlot<Story>[];
  covered: StateHubSlot<Story>[];
  gaps: StateHubSlot<Story>[];
  world: PinnedStory[];
  kids: PinnedStory[];
  pinErrors: string[];
  stories: Story[];
  imageStory?: Story;
  latest?: string;
};

/** November 6 through November 14, America/Denver, every year. */
export function worldKindnessDayInSeason(day = mountainDay()): boolean {
  return monthDayInRange(day, WORLD_KINDNESS_BANNER.start, WORLD_KINDNESS_BANNER.end);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function leadOf(story: Pick<KindnessSource, "title" | "dek">): string {
  return `${story.title}\n${story.dek}`;
}

function withoutSource(text: string, sourceName?: string): string {
  if (!sourceName?.trim()) return text;
  return text.replace(new RegExp(escapeRegExp(sourceName.trim()), "gi"), " ");
}

export function kindnessBlockReason(story: KindnessSource): string | undefined {
  if (story.draft) return "draft";
  const heavy = heavyNewsReason(story);
  if (heavy) return heavy;
  const full = withoutSource(
    [story.title, story.dek, story.body, story.kidSummary, ...(story.kidQuestions ?? [])].filter(Boolean).join("\n"),
    story.sourceName,
  );
  const harm = full.match(EXTRA_HARM);
  if (harm) return harm[0];
  const lead = withoutSource(leadOf(story), story.sourceName);
  if (TITLE_TRAGEDY.test(story.title)) {
    return story.title.match(TITLE_TRAGEDY)?.[0];
  }
  const tragedy = lead.match(DEK_TRAGEDY);
  if (tragedy) return tragedy[0];
  return undefined;
}

function hasTag(story: { tags: readonly string[] }, tags: readonly string[]): boolean {
  return tags.some((tag) => story.tags.includes(tag));
}

function isConservation(story: { tags: readonly string[] }): boolean {
  return hasTag(story, CONSERVATION_TAGS);
}

function givingLead(lead: string): boolean {
  return GIVING_TEXT.test(lead.replace(/\b(?:gave|gives|given)\s+birth\b/gi, " "));
}

/** "One neighbor said" is a quote, not a neighbor doing a kindness. */
function neighborAct(lead: string): boolean {
  const cleaned = lead.replace(/\b(?:a|an|one|another)\s+neighbou?r\s+(?:said|says|told|added|recalled|who)\b/gi, " ");
  return /\bneighbou?rs?\b/i.test(cleaned);
}

/**
 * Themes that put a story on the hub. A volunteers tag, a playground, or a
 * wildlife census is not enough. Conservation stories stay off unless an
 * editor also tagged them as kindness or neighbors, or the lead is one
 * animal being rescued, fostered, or adopted rather than a mass release.
 */
export function kindnessThemes(story: KindnessSource): KindnessTheme[] {
  if (story.draft || kindnessBlockReason(story)) return [];
  const lead = leadOf(story);
  const giving = givingLead(lead);
  const peopleHelp = hasTag(
    story,
    PEOPLE_TAGS.filter((tag) => tag !== "neighbors"),
  );
  if (INSTITUTION_CATEGORIES.has(story.category) && !story.tags.includes("kindness") && !peopleHelp && !giving) return [];

  const people = hasTag(story, PEOPLE_TAGS);
  const stranger = /\bstrangers?\b|\bpay it forward\b/i.test(lead);
  const kid = hasTag(story, KID_TAGS);
  const conservation = isConservation(story);
  const humanKindness = story.tags.includes("kindness") || story.tags.includes("neighbors");
  const themes: KindnessTheme[] = [];

  if (stranger && (people || giving || story.category === "heroes" || story.category === "community")) {
    themes.push("strangers");
  }
  if (story.tags.includes("neighbors") && !INSTITUTION_CATEGORIES.has(story.category)) {
    themes.push("neighbors");
  } else if (neighborAct(lead) && !conservation && (people || giving || story.tags.includes("kindness"))) {
    themes.push("neighbors");
  }
  if (kid && (humanKindness || giving) && !(conservation && !humanKindness)) {
    themes.push("kids");
  }
  if ((people || hasTag(story, GARDEN_TAGS)) && !(conservation && !humanKindness)) {
    themes.push("community");
  }

  const petProgram = hasTag(story, PET_TAGS);
  const individualAnimal = ANIMAL_CARE_TEXT.test(lead) && !MASS_RELEASE_TEXT.test(lead);
  const domestic = hasTag(story, DOMESTIC_ANIMAL_TAGS);
  if (petProgram && !(conservation && !humanKindness)) themes.push("animals");
  else if ((story.tags.includes("animal-rescue") || domestic) && individualAnimal && (!conservation || humanKindness)) {
    themes.push("animals");
  }

  return themes;
}

/** Higher means a closer kindness story. Used as the state tie-break and the section sort. */
export function kindnessQuality(story: KindnessSource): number {
  let score = 0;
  for (const tag of story.tags) score += TAG_POINTS[tag] ?? 0;
  const lead = leadOf(story);
  for (const rule of LEAD_POINTS) {
    if (rule.pattern.test(lead)) score += rule.points;
  }
  if (story.kidFriendly && story.kidSummary) score += 3;
  return score;
}

export function compareKindnessStories(a: KindnessSource, b: KindnessSource): number {
  const quality = kindnessQuality(b) - kindnessQuality(a);
  if (quality) return quality;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featured) return featured;
  const top = (a.top5 ?? 99) - (b.top5 ?? 99);
  if (top) return top;
  return a.slug.localeCompare(b.slug);
}

/** Home state, then the kindness score, then newest date. The shared picker defaults to newest first. */
function compareKindnessState(code: string, a: Story, b: Story): number {
  const home = Number(b.state === code) - Number(a.state === code);
  if (home) return home;
  return compareKindnessStories(a, b);
}

export function storyQualifies(story: Story, config: WorldKindnessEditorConfig): boolean {
  if (story.draft || config.exclude.includes(story.slug)) return false;
  if (kindnessBlockReason(story)) return false;
  return kindnessThemes(story).length > 0;
}

export function emptyEditorConfig(): WorldKindnessEditorConfig {
  return { exclude: [], states: {}, world: [], kids: [] };
}

export function parseWorldKindnessEditorConfig(value: unknown): WorldKindnessEditorConfig {
  const result = editorSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`World Kindness Day config: ${details}`);
  }
  return result.data;
}

export function loadWorldKindnessEditorConfig(): WorldKindnessEditorConfig {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return parseWorldKindnessEditorConfig(JSON.parse(raw));
}

function compareKids(a: Story, b: Story): number {
  const theme = Number(kindnessThemes(b).includes("kids")) - Number(kindnessThemes(a).includes("kids"));
  if (theme) return theme;
  const summary = Number(Boolean(b.kidSummary)) - Number(Boolean(a.kidSummary));
  if (summary) return summary;
  return compareKindnessStories(a, b);
}

export function buildWorldKindnessHub(stories: Story[], config: WorldKindnessEditorConfig): WorldKindnessHub {
  const pinErrors: string[] = [];
  const published = stories.filter((story) => !story.draft);
  const bySlug = new Map(published.map((story) => [story.slug, story]));
  const qualifies = (story: Story) => storyQualifies(story, config);

  for (const slug of config.exclude) {
    if (!bySlug.has(slug)) pinErrors.push(`exclude: ${slug} is not a published story.`);
  }

  const statePins = { ...config.states };
  for (const [code, slug] of Object.entries(config.states)) {
    const story = bySlug.get(slug);
    if (!story) continue;
    if (config.exclude.includes(slug)) {
      pinErrors.push(`${code}: pinned slug ${slug} is on the exclude list.`);
      delete statePins[code];
      continue;
    }
    const blocked = kindnessBlockReason(story);
    if (blocked) {
      pinErrors.push(`${code}: pinned slug ${slug} is excluded by the content filter (${blocked}).`);
      delete statePins[code];
    }
  }

  const statePick = pickStateStories({
    stories,
    pins: statePins,
    qualifies,
    quality: kindnessQuality,
    compare: compareKindnessState,
  });
  pinErrors.push(...statePick.pinErrors);

  const world: PinnedStory[] = [];
  const worldSeen = new Set<string>();
  const worldCountries = new Set<string>();
  for (const slug of config.world) {
    const story = bySlug.get(slug);
    if (!story) {
      pinErrors.push(`world: pinned slug ${slug} is not a published story.`);
      continue;
    }
    if (config.exclude.includes(slug)) {
      pinErrors.push(`world: pinned slug ${slug} is on the exclude list.`);
      continue;
    }
    const blocked = kindnessBlockReason(story);
    if (blocked) {
      pinErrors.push(`world: pinned slug ${slug} is excluded by the content filter (${blocked}).`);
      continue;
    }
    if (story.country === "US") {
      pinErrors.push(`world: pinned slug ${slug} is a United States story.`);
      continue;
    }
    if (!qualifies(story)) {
      pinErrors.push(`world: pinned slug ${slug} does not qualify for this hub.`);
      continue;
    }
    world.push({ story, pinned: true });
    worldSeen.add(story.slug);
    worldCountries.add(story.country);
  }

  const worldAuto = published
    .filter((story) => story.country !== "US" && qualifies(story) && !worldSeen.has(story.slug))
    .sort(compareKindnessStories);
  const bestByCountry = new Map<string, Story>();
  for (const story of worldAuto) {
    if (worldCountries.has(story.country) || bestByCountry.has(story.country)) continue;
    bestByCountry.set(story.country, story);
  }
  for (const story of [...bestByCountry.values()].sort(compareKindnessStories)) {
    world.push({ story, pinned: false });
  }

  const kids: PinnedStory[] = [];
  const kidSeen = new Set<string>();
  for (const slug of config.kids) {
    const story = bySlug.get(slug);
    if (!story) {
      pinErrors.push(`kids: pinned slug ${slug} is not a published story.`);
      continue;
    }
    if (config.exclude.includes(slug)) {
      pinErrors.push(`kids: pinned slug ${slug} is on the exclude list.`);
      continue;
    }
    const blocked = kindnessBlockReason(story);
    if (blocked) {
      pinErrors.push(`kids: pinned slug ${slug} is excluded by the content filter (${blocked}).`);
      continue;
    }
    if (!story.kidFriendly) {
      pinErrors.push(`kids: pinned slug ${slug} is not marked kid-friendly.`);
      continue;
    }
    if (!qualifies(story)) {
      pinErrors.push(`kids: pinned slug ${slug} does not qualify for this hub.`);
      continue;
    }
    kids.push({ story, pinned: true });
    kidSeen.add(story.slug);
  }
  const kidRoom = Math.max(0, KIDS_STORY_LIMIT - kids.length);
  const kidAuto = published
    .filter((story) => story.kidFriendly && qualifies(story) && !kidSeen.has(story.slug))
    .sort(compareKids)
    .slice(0, kidRoom);
  for (const story of kidAuto) kids.push({ story, pinned: false });

  const covered = statePick.slots.filter((slot) => slot.story);
  const gaps = statePick.slots.filter((slot) => !slot.story);
  const seen = new Set<string>();
  const listed: Story[] = [];
  function add(story?: Story) {
    if (!story || seen.has(story.slug)) return;
    seen.add(story.slug);
    listed.push(story);
  }
  for (const item of world) add(item.story);
  for (const slot of covered) add(slot.story);
  for (const item of kids) add(item.story);
  const latest = listed.map((story) => story.date).sort().at(-1);
  const imageStory = listed.slice().sort(compareKindnessStories)[0];

  return {
    slots: statePick.slots,
    covered,
    gaps,
    world,
    kids,
    pinErrors,
    stories: listed,
    imageStory,
    latest,
  };
}

let cache: WorldKindnessHub | null = null;

export function getWorldKindnessDayHub(): WorldKindnessHub {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const hub = buildWorldKindnessHub(getPublishedStories(), loadWorldKindnessEditorConfig());
  if (hub.pinErrors.length) {
    throw new Error(`World Kindness Day config:\n- ${hub.pinErrors.join("\n- ")}`);
  }
  cache = hub;
  return hub;
}

export function worldKindnessJsonLd(hub: WorldKindnessHub) {
  const url = absoluteUrl(WORLD_KINDNESS_PATH);
  const listed = hub.stories.slice(0, 40);
  const served = hub.imageStory ? openGraphImage(hub.imageStory) : undefined;
  const image = served ? absoluteUrl(served.url) : undefined;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Article", "CollectionPage"],
        "@id": `${url}#article`,
        headline: WORLD_KINDNESS_TITLE,
        name: WORLD_KINDNESS_TITLE,
        description: WORLD_KINDNESS_DESCRIPTION,
        url,
        mainEntityOfPage: url,
        inLanguage: "en-US",
        isAccessibleForFree: true,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        ...(hub.latest
          ? { datePublished: publishedIso(hub.latest), dateModified: publishedIso(hub.latest) }
          : {}),
        ...(image
          ? {
              image,
              primaryImageOfPage: { "@type": "ImageObject", url: image },
            }
          : {}),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: hub.stories.length,
          itemListElement: listed.map((story, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: story.title,
            url: absoluteUrl(`/story/${story.slug}`),
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "World Kindness Day", item: url },
        ],
      },
    ],
  };
}
