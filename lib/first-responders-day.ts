/**
 * Thank You, First Responders hub at /first-responders-day.
 *
 * The URL stays the same every year. The page shows October 28 of the current
 * edition year. Editor pins and an exclude list live in
 * data/first-responders-day.json. The state cards use the shared one-story
 * picker. Role groups are this hub's own cut of the best matches.
 *
 * Content filter: a story is left off when the title, deck, or body matches
 * an exclusion phrase (use of force, shooting, pursuit, crime suspect, or
 * politics), or when its slug is in the editor exclude list. Cardiac arrest,
 * discharged, and suspected are not those phrases. See ADDING_STORIES.md.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { pickStateStories, type StateHubSlot } from "./state-story-hub";
import { getPublishedStories, type Story } from "./stories";
import { editionDay } from "./world-pick";

export const FIRST_RESPONDERS_DAY_PATH = "/first-responders-day";

export const FIRST_RESPONDERS_RESOLUTION_URL =
  "https://www.congress.gov/bill/116th-congress/senate-concurrent-resolution/15";

/** How many automatic stories to show in a role group. Pins still show when a group has more pins than this. */
export const ROLE_STORY_LIMIT = 6;

const CONFIG_PATH = path.join(process.cwd(), "data", "first-responders-day.json");

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

export const RESPONDER_ROLES = [
  { slug: "fire", label: "Firefighters", empty: "firefighter", tags: ["firefighters"] },
  { slug: "police", label: "Police and deputies", empty: "police or deputy", tags: ["police"] },
  { slug: "ems", label: "EMS and flight crews", empty: "EMS or flight-crew", tags: ["ems"] },
  { slug: "dispatch", label: "Dispatchers", empty: "dispatcher", tags: ["dispatch"] },
  { slug: "search-and-rescue", label: "Search and rescue", empty: "search-and-rescue", tags: ["search-and-rescue"] },
] as const;

export type ResponderRole = (typeof RESPONDER_ROLES)[number]["slug"];

const ROLE_SLUGS = RESPONDER_ROLES.map((role) => role.slug);

const roleListsSchema = z
  .object({
    fire: z.array(slugSchema),
    police: z.array(slugSchema),
    ems: z.array(slugSchema),
    dispatch: z.array(slugSchema),
    "search-and-rescue": z.array(slugSchema),
  })
  .strict();

const editorSchema = z
  .object({
    exclude: z.array(slugSchema),
    states: z.record(z.string().regex(/^[A-Z]{2}$/, "Use a two-letter USPS code"), slugSchema),
    roles: roleListsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const seenExclude = new Set<string>();
    for (const slug of data.exclude) {
      if (seenExclude.has(slug)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["exclude"], message: `Duplicate exclude slug ${slug}` });
      }
      seenExclude.add(slug);
    }
    for (const role of ROLE_SLUGS) {
      const seen = new Set<string>();
      for (const slug of data.roles[role]) {
        if (seen.has(slug)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["roles", role],
            message: `Duplicate pin ${slug}`,
          });
        }
        seen.add(slug);
      }
    }
  });

export type FirstRespondersEditorConfig = z.infer<typeof editorSchema>;

export type RoleStory = { story: Story; pinned: boolean };

export type RoleGroup = {
  slug: ResponderRole;
  label: string;
  empty: string;
  stories: RoleStory[];
};

export type FirstRespondersDayHub = {
  year: number;
  roles: RoleGroup[];
  slots: StateHubSlot<Story>[];
  covered: StateHubSlot<Story>[];
  gaps: StateHubSlot<Story>[];
  pinErrors: string[];
  stories: Story[];
  imageStory?: Story;
  latest?: string;
};

/**
 * Phrases that keep a story off the hub. Checked against the title, deck, and body.
 * Word boundaries are intentional: "cardiac arrest" and "discharged" do not match,
 * and "suspected" does not match "suspect".
 */
export const EXCLUSION_RULES: { id: string; label: string; pattern: RegExp }[] = [
  {
    id: "use-of-force",
    label: "use of force",
    pattern: /\b(?:use of force|use-of-force|used force|excessive force|brutality|tasers?|tasered|pepper[- ]spray|officer-involved)\b/i,
  },
  {
    id: "shooting",
    label: "shooting",
    pattern: /\b(?:shootings?|gunfire|gunshots?|shot and killed|opened fire)\b/i,
  },
  {
    id: "pursuit",
    label: "pursuit",
    pattern: /\b(?:police pursuits?|high-speed chases?|car chases?|police chases?|pursued)\b/i,
  },
  {
    id: "suspect",
    label: "crime suspect",
    pattern: /\b(?:suspects?|arrested|under arrest|taken into custody|charged with|indict(?:ed|ment)|convicted)\b/i,
  },
  {
    id: "politics",
    label: "politics",
    pattern: /\b(?:politics|political|partisan|campaign rally|on the ballot|election night)\b/i,
  },
];

/**
 * Rescue, lifesaving help, a reunion, or a kindness/community moment.
 * "safe" covers "found safe". "found alive" and "got out" cover searches and escapes
 * that never use the word rescue.
 */
const POSITIVE_PATTERN =
  /\b(?:rescu\w*|sav(?:e|ed|es|ing)|pull\w*|lift(?:ed|ing|s)?|reviv\w*|resuscitat\w*|cpr|heimlich|defibrillat\w*|aeds?|reunions?|reunit\w*|kindness|thank\w*|thank-you|honou?r\w*|awards?|scholarships?|picnics?|comfort\w*|help\w*|deliver\w*|carr(?:y|ied|ying)|stipends?|camps?|train\w*|volunteer\w*|donat\w*|raised|visit\w*|cheer\w*|celebrat\w*|compressions?|waded|swam|paddled|brought|safe|found alive|got out|no one was hurt)\b/i;

const ROLE_PATTERNS: { slug: ResponderRole; pattern: RegExp }[] = [
  { slug: "fire", pattern: /\b(?:firefighters?|fire departments?|fire crews?|fire and rescue|volunteer fire|fire\/ems)\b/i },
  { slug: "police", pattern: /\b(?:police|officers?|deput(?:y|ies)|sheriffs?|sergeants?|troopers?|nypd|lapd|constables?)\b/i },
  { slug: "ems", pattern: /\b(?:emts?|paramedics?|ambulances?|flight nurses?|flight crews?|air ambulances?|medevac|rescue squads?|ems)\b/i },
  { slug: "dispatch", pattern: /\b(?:dispatchers?|911 dispatch(?:ers)?|telecommunicators?)\b/i },
  { slug: "search-and-rescue", pattern: /\b(?:search-and-rescue|search and rescue|searchers|search dogs?|search teams?|coast guard|helicopter crews?|rope-rescue)\b/i },
];

/**
 * Action words only. The noun "rescue" inside "rescue training" does not count as a save.
 * Hyphenated words such as "4-year-old" are one token, so the gap uses \S+ rather than \w+.
 */
const RESCUE_LEAD =
  /\b(?:rescued|rescuing|rescues|sav(?:ed|es|ing)|lifesaving|life-saving|life saving|pull(?:ed|ing|s)|lift(?:ed|ing|s)?|reviv\w*|resuscitat\w*|cpr|heimlich|defibrillat\w*|aeds?|compressions?|swam|waded|paddled|carr(?:y|ied|ying)|brought\b(?:\s+\S+){0,6}\s+out|walked\b(?:\s+\S+){0,8}\s+out|found alive|(?:find|finds|found)\b(?:\s+\S+){0,8}\s+safe|finds?\s+(?:a\s+|the\s+)?(?:missing\s+)?(?:hiker|hunter|child|boy|girl|woman|man))\b/i;

const QUALITY_RULES: { pattern: RegExp; lead: number; body: number }[] = [
  {
    pattern: RESCUE_LEAD,
    lead: 8,
    body: 3,
  },
  { pattern: /\b(?:reunions?|reunit\w*)\b/i, lead: 6, body: 2 },
  { pattern: /\b(?:kindness|thank\w*|thank-you|honou?r\w*|awards?|scholarships?|stipends?|picnics?|comfort\w*)\b/i, lead: 4, body: 1 },
  {
    pattern: /\b(?:firefighters?|officers?|deput(?:y|ies)|paramedics?|emts?|dispatchers?|search-and-rescue|search and rescue|flight crews?)\b/i,
    lead: 4,
    body: 1,
  },
];

export const THANK_YOU_LINKS: {
  id: string;
  label: string;
  href: string;
  external: boolean;
  note: string;
}[] = [
  {
    id: "card",
    label: "Write a thank-you card",
    href: "#classroom",
    external: false,
    note: "A short note is enough. Leave politics out of it.",
  },
  {
    id: "dispatch",
    label: "Thank your local dispatchers",
    href: "https://www.911.gov/calling-911/",
    external: true,
    note: "Dispatchers answer 911 and coach callers until a crew arrives. Send a note to the local center on its non-emergency line, not by calling 911.",
  },
  {
    id: "cpr",
    label: "Learn hands-only CPR",
    href: "https://cpr.heart.org/en/cpr-courses-and-kits/hands-only-cpr",
    external: true,
    note: "The American Heart Association teaches the two steps.",
  },
  {
    id: "blood",
    label: "Sign up to give blood",
    href: "https://www.redcrossblood.org/",
    external: true,
    note: "The American Red Cross schedules blood donation. This page does not take payment or process a donation.",
  },
];

export const CLASSROOM_QUESTIONS = [
  "What did firefighters, police, medics, or a search team do in one story on this page?",
  "What does a dispatcher do in the minutes before a crew arrives?",
  "What could your class write in a thank-you card without using anyone's full name, age, school, or email?",
] as const;

export function firstRespondersTitle(year: number): string {
  return `Thank you, first responders · October 28, ${year}`;
}

export function firstRespondersDescription(year: number): string {
  return `Thank you, first responders. October 28, ${year} is Honoring the Nation's First Responders Day. Verified stories of rescues, lifesaving help, reunions, and kindness from fire, police, EMS, dispatch, and search and rescue.`;
}

export function firstRespondersShareText(year: number): string {
  return `Thank you, first responders. Verified rescues and kindness for Honoring the Nation's First Responders Day, October 28, ${year}.`;
}

/** October 21 through October 29, any year, on the New York edition clock. */
export function firstRespondersDayInSeason(day = editionDay()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return false;
  const month = Number(match[2]);
  const date = Number(match[3]);
  return month === 10 && date >= 21 && date <= 29;
}

export function firstRespondersYear(day = editionDay()): number {
  const match = /^(\d{4})/.exec(day);
  return match ? Number(match[1]) : new Date().getFullYear();
}

export function storyPlainText(story: { title: string; dek: string; body?: string }): string {
  return `${story.title}\n${story.dek}\n${story.body ?? ""}`;
}

export function exclusionLabel(story: { title: string; dek: string; body?: string }): string | undefined {
  const text = storyPlainText(story);
  return EXCLUSION_RULES.find((rule) => rule.pattern.test(text))?.label;
}

export function readsAsPositive(story: { title: string; dek: string; body?: string }): boolean {
  return POSITIVE_PATTERN.test(storyPlainText(story));
}

export function isFirstResponderCandidate(story: { tags: readonly string[]; draft?: boolean }): boolean {
  if (story.draft) return false;
  if (story.tags.includes("first-responders")) return true;
  return RESPONDER_ROLES.some((role) => role.tags.some((tag) => story.tags.includes(tag)));
}

function taggedRoles(story: { tags: readonly string[] }): ResponderRole[] {
  return RESPONDER_ROLES.filter((role) => role.tags.some((tag) => story.tags.includes(tag))).map((role) => role.slug);
}

function earliestRole(text: string): ResponderRole | undefined {
  let best: { slug: ResponderRole; index: number } | undefined;
  for (const rule of ROLE_PATTERNS) {
    const index = text.search(rule.pattern);
    if (index < 0) continue;
    if (!best || index < best.index) best = { slug: rule.slug, index };
  }
  return best?.slug;
}

/**
 * Role words in the title or deck only.
 * A dispatcher or crew named once in the body does not move the story.
 * "until firefighters arrived" does not make a neighbor's rescue a firefighter story.
 * A role tag or an editor pin still assigns the group.
 */
function keywordRole(story: { title: string; dek: string }): ResponderRole | undefined {
  const lead = `${story.title}\n${story.dek}`.replace(
    /\b(?:until|before|when|after)\s+(?:the\s+)?(?:firefighters?|paramedics?|officers?|deput(?:y|ies)|ambulance|ems|police|crews?)\s+arrived\b/gi,
    " ",
  );
  return earliestRole(lead);
}

export function assignedRoles(story: Story, config: FirstRespondersEditorConfig): ResponderRole[] {
  const pinned = ROLE_SLUGS.filter((slug) => config.roles[slug].includes(story.slug));
  if (pinned.length) return pinned;
  const tagged = taggedRoles(story);
  if (tagged.length) return tagged;
  const keyword = keywordRole(story);
  return keyword ? [keyword] : [];
}

function isPinned(story: { slug: string }, config: FirstRespondersEditorConfig): boolean {
  if (Object.values(config.states).includes(story.slug)) return true;
  return ROLE_SLUGS.some((slug) => config.roles[slug].includes(story.slug));
}

/** Automatic picks must read as rescue, help, or kindness. A pin can keep a story the phrase list would skip. */
export function storyQualifies(story: Story, config: FirstRespondersEditorConfig): boolean {
  if (story.draft || !isFirstResponderCandidate(story)) return false;
  if (config.exclude.includes(story.slug)) return false;
  if (exclusionLabel(story)) return false;
  if (isPinned(story, config)) return true;
  return readsAsPositive(story);
}

function scoreText(text: string, field: "lead" | "body"): number {
  let score = 0;
  for (const rule of QUALITY_RULES) {
    if (rule.pattern.test(text)) score += rule[field];
  }
  return score;
}

/** Higher means a closer rescue, reunion, or kindness story. Used as the state tie-break and the role sort. */
export function responderQuality(story: { title: string; dek: string; body?: string }): number {
  const lead = `${story.title}\n${story.dek}`;
  return scoreText(lead, "lead") + scoreText(story.body ?? "", "body");
}

/** Home state, then the rescue/kindness score, then newest date. The shared picker defaults to newest first. */
function compareResponderStateStories(code: string, a: Story, b: Story): number {
  const home = Number(b.state === code) - Number(a.state === code);
  if (home) return home;
  return compareBest(a, b);
}

function compareBest(a: Story, b: Story): number {
  const quality = responderQuality(b) - responderQuality(a);
  if (quality) return quality;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featured) return featured;
  const top = (a.top5 ?? 99) - (b.top5 ?? 99);
  if (top) return top;
  return a.slug.localeCompare(b.slug);
}

export function emptyEditorConfig(): FirstRespondersEditorConfig {
  return {
    exclude: [],
    states: {},
    roles: { fire: [], police: [], ems: [], dispatch: [], "search-and-rescue": [] },
  };
}

export function parseFirstRespondersEditorConfig(value: unknown): FirstRespondersEditorConfig {
  const result = editorSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`First Responders Day config: ${details}`);
  }
  return result.data;
}

export function loadFirstRespondersEditorConfig(): FirstRespondersEditorConfig {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return parseFirstRespondersEditorConfig(JSON.parse(raw));
}

export function buildFirstRespondersDayHub(
  stories: Story[],
  config: FirstRespondersEditorConfig,
  year = firstRespondersYear(),
): FirstRespondersDayHub {
  const pinErrors: string[] = [];
  const published = stories.filter((story) => !story.draft);
  const bySlug = new Map(published.map((story) => [story.slug, story]));

  for (const slug of config.exclude) {
    if (!bySlug.has(slug)) pinErrors.push(`exclude: ${slug} is not a published story.`);
  }

  for (const role of ROLE_SLUGS) {
    for (const slug of config.roles[role]) {
      const story = bySlug.get(slug);
      if (!story) {
        pinErrors.push(`${role}: pinned slug ${slug} is not a published story.`);
        continue;
      }
      if (config.exclude.includes(slug)) {
        pinErrors.push(`${role}: pinned slug ${slug} is on the exclude list.`);
        continue;
      }
      const blocked = exclusionLabel(story);
      if (blocked) {
        pinErrors.push(`${role}: pinned slug ${slug} is excluded by the content filter (${blocked}).`);
        continue;
      }
      if (!isFirstResponderCandidate(story)) {
        pinErrors.push(`${role}: pinned slug ${slug} is not a first-responder story.`);
      }
    }
  }

  const qualifies = (story: Story) => storyQualifies(story, config);
  const statePick = pickStateStories({
    stories,
    pins: config.states,
    qualifies,
    quality: responderQuality,
    compare: compareResponderStateStories,
  });
  pinErrors.push(...statePick.pinErrors);

  const eligible = published.filter((story) => qualifies(story));
  const roles: RoleGroup[] = RESPONDER_ROLES.map((role) => {
    const pinned = config.roles[role.slug].flatMap((slug) => {
      const story = bySlug.get(slug);
      if (!story || !qualifies(story)) return [];
      return [{ story, pinned: true }];
    });
    const pinnedSlugs = new Set(pinned.map((item) => item.story.slug));
    const room = Math.max(0, ROLE_STORY_LIMIT - pinned.length);
    const auto = eligible
      .filter((story) => !pinnedSlugs.has(story.slug) && assignedRoles(story, config).includes(role.slug))
      .sort(compareBest)
      .slice(0, room)
      .map((story) => ({ story, pinned: false }));
    return { slug: role.slug, label: role.label, empty: role.empty, stories: [...pinned, ...auto] };
  });

  const covered = statePick.slots.filter((slot) => slot.story);
  const gaps = statePick.slots.filter((slot) => !slot.story);
  const seen = new Set<string>();
  const listed: Story[] = [];
  for (const role of roles) {
    for (const item of role.stories) {
      if (seen.has(item.story.slug)) continue;
      seen.add(item.story.slug);
      listed.push(item.story);
    }
  }
  for (const slot of covered) {
    if (!slot.story || seen.has(slot.story.slug)) continue;
    seen.add(slot.story.slug);
    listed.push(slot.story);
  }
  const latest = listed.map((story) => story.date).sort().at(-1);
  const imageStory = listed.find((story) => RESCUE_LEAD.test(`${story.title}\n${story.dek}`)) ?? listed[0];

  return {
    year,
    roles,
    slots: statePick.slots,
    covered,
    gaps,
    pinErrors,
    stories: listed,
    imageStory,
    latest,
  };
}

let cache: FirstRespondersDayHub | null = null;

export function getFirstRespondersDayHub(): FirstRespondersDayHub {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const hub = buildFirstRespondersDayHub(getPublishedStories(), loadFirstRespondersEditorConfig());
  if (hub.pinErrors.length) {
    throw new Error(`First Responders Day config:\n- ${hub.pinErrors.join("\n- ")}`);
  }
  cache = hub;
  return hub;
}
