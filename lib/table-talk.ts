/**
 * Good News Table Talk at /table-talk.
 *
 * The URL stays the same every year. The page names the Thanksgiving of the
 * edition year (the fourth Thursday of November). Cards are chosen from
 * published archive stories. A card summary is the first one or two sentences
 * of that story's classroom summary, copied verbatim. The question is a
 * generic prompt, not a claim about the story.
 *
 * Editor pins and excludes live in data/table-talk.json. A pin cannot put
 * back a story the content filter rejected.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { getCountry } from "./countries";
import { placeLabel } from "./present";
import { getPublishedStories, type Story } from "./stories";
import { formatLongDate, mountainDay } from "./weeks";

export const TABLE_TALK_PATH = "/table-talk";

export const TABLE_TALK_TITLE = "Good News Table Talk";

export const TABLE_TALK_MIN = 20;

export const TABLE_TALK_MAX = 30;

/** Eligible every year, America/Denver. Giving Tuesday still leads on overlap. */
export const TABLE_TALK_BANNER_WINDOW = { start: "11-16", end: "11-27", timeZone: "America/Denver" } as const;

export const TABLE_TALK_SHARE =
  "Good News Table Talk: printable cards from real good-news stories, for a Thanksgiving table or a classroom. Pass one card and ask the question.";

export const TABLE_TALK_LANES = ["states", "kids", "animals", "responders", "veterans", "world"] as const;

export type TableTalkLane = (typeof TABLE_TALK_LANES)[number];

export const LANE_LABEL: Record<TableTalkLane, string> = {
  states: "States",
  kids: "Kids",
  animals: "Animals",
  responders: "First responders",
  veterans: "Veterans",
  world: "World",
};

/** Printed and on-screen order, so a page of six is one card from each lane. */
const LANE_CYCLE: TableTalkLane[] = ["states", "kids", "animals", "responders", "veterans", "world"];

const LANE_QUOTA: Record<TableTalkLane, number> = {
  responders: 4,
  veterans: 4,
  kids: 5,
  animals: 4,
  world: 5,
  states: 6,
};

const QUESTIONS: Record<TableTalkLane, readonly string[]> = {
  states: [
    "Who in our town would you thank like this?",
    "What is one kind thing a neighbor could do this week?",
    "Where around us do people already help each other?",
  ],
  kids: [
    "What is one kind thing a kid could do with a grown-up this week?",
    "Who at school would you thank for a specific help?",
    "What could our class do that is free and stays at school?",
  ],
  animals: [
    "What animal near us would you want someone to look out for?",
    "How could our family make one place safer for an animal?",
    "Who around us already takes care of animals?",
  ],
  responders: [
    "Who helps people in our town when something goes wrong?",
    "What is a safe way to thank a helper?",
    "What should a grown-up do first when a person or an animal needs help?",
  ],
  veterans: [
    "Who in our town would you thank for serving?",
    "What is a simple thank-you a family could offer a veteran?",
    "What does a welcome home look like where we live?",
  ],
  world: [
    "What good news from far away would you want to share at this table?",
    "How is a kind act far away like one we could do here?",
    "What would you want another family to know about helping?",
  ],
};

export const GRATITUDE_ROUND = [
  "One person draws a card and reads the good news out loud.",
  "That person answers the question in one sentence.",
  "Anyone else may add one sentence. There is no wrong answer.",
  "The next person draws. Stop after four cards, or whenever the table is ready.",
] as const;

export const CLASSROOM_NOTE =
  "Use this the week before Thanksgiving break, while the class is still together. A teacher reads one card, then students turn to a partner and answer the question. Two cards is enough for one sitting. Do not collect names, photos, or email addresses. Do not ask a student to describe a private family matter. Skip a card that does not fit the room. The same cards can go home for the table.";

const CONFIG_PATH = path.join(process.cwd(), "data", "table-talk.json");

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

const editorSchema = z
  .object({
    pins: z.array(slugSchema),
    exclude: z.array(slugSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const field of ["pins", "exclude"] as const) {
      const seen = new Set<string>();
      for (const slug of data[field]) {
        if (seen.has(slug)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `Duplicate slug ${slug}` });
        }
        seen.add(slug);
      }
    }
  });

export type TableTalkEditorConfig = z.infer<typeof editorSchema>;

/** Fields the picker reads. A published Story satisfies this. */
export type TableTalkStory = {
  slug: string;
  title: string;
  dek: string;
  body: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  place?: string;
  category: string;
  tags: string[];
  sourceName?: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  kidQuestions?: string[];
  imageAlt?: string;
  imageCaption?: string;
};

export type TableTalkCard = {
  story: TableTalkStory;
  lane: TableTalkLane;
  summary: string;
  question: string;
  pinned: boolean;
  place: string;
};

export type TableTalkDeck = {
  cards: TableTalkCard[];
  pinErrors: string[];
  year: number;
};

const RESPONDER_TAGS = ["first-responders", "firefighters", "police", "ems", "dispatch", "search-and-rescue"] as const;

const ANIMAL_TAGS = new Set([
  "animal-rescue",
  "dogs",
  "cats",
  "birds",
  "horses",
  "wildlife-conservation",
  "sea-turtles",
  "pet-adoption",
  "zoos",
  "pollinators",
  "service-dogs",
  "therapy-animals",
]);

const STATE_TAGS = new Set([
  "kindness",
  "neighbors",
  "volunteers",
  "community-meals",
  "food-banks",
  "food-rescue",
  "schools",
  "libraries",
  "little-free-libraries",
  "festivals",
  "teachers",
  "housing",
  "toys",
  "playgrounds",
  "inclusion",
  "community-garden",
  "home-repairs",
  "seniors",
  "literacy",
  "school-lunch",
  "winter-clothes",
  "music",
  "art",
  "accessibility",
]);

const ILLNESS_TAGS = new Set(["cancer-support", "medical-research"]);

const WARM_TAGS = [
  "kindness",
  "neighbors",
  "kids",
  "students",
  "veterans",
  "animal-rescue",
  "community-meals",
  "food-banks",
  "schools",
  "teachers",
  "libraries",
];

/**
 * Newspaper names and place names that would otherwise look political.
 * Checked after the source name is removed.
 */
const SAFE_PHRASES = [
  /democratic republic/gi,
  /democrat-gazette/gi,
  /times[-\s]+republican/gi,
  /cynthiana democrat/gi,
  /library of congress/gi,
];

const ILLNESS =
  /\b(?:cancers?|tumou?rs?|chemo(?:therapy)?|leukemia|lymphoma|covid(?:-19)?|pandemic|hospice|dementia|alzheimer(?:'s)?|transplants?|dialysis|overdoses?|nicu|preemies?|premature babies|premature baby|diagnos(?:is|ed)|radiation treatment|diseases?|illness(?:es)?|surgeries|surgery|terminal)\b/i;

const SENSITIVE =
  /\b(?:alcohol|beer|wine|drunk|opioid|fentanyl|heroin|marijuana|cannabis|sexual(?:ly)?|nude|naked)\b/i;

const DEATH =
  /\b(?:killed|deaths?|died(?!\s+out)|fatalit(?:y|ies)|casualt(?:y|ies)|perished|drowned|passed away)\b/i;

const NEAR_MISS =
  /\b(?:nearly|almost|would have|could have|did not|didn't|never|not)\s+(?:have\s+)?(?:been\s+)?(?:killed|died)\b|\b(?:no one|nobody)\s+(?:was\s+|were\s+)?(?:killed|died)\b/gi;

const DISASTER =
  /\b(?:hurricanes?|tornado(?:es)?|wildfires?|flood(?:s|ing)?|earthquakes?|tsunamis?|landslides?|mudslides?|cyclones?|typhoons?)\b/i;

const BLOCKS: { id: string; pattern: RegExp }[] = [
  {
    id: "politics",
    pattern:
      /\b(?:elections?|electorates?|electoral|candidates?|balloting|midterms?|democrats?|republicans?|\bgop\b|partisan|bipartisan|politicians?|politics|political|senators?|legislatures?|legislation|legislative|legislators?|incumbents?|caucuses?|referendums?|referenda|referendum|impeach(?:ed|ment|ments)?|white house|oval office|campaign trails?|on the ballot|polling places?|polling stations?|congress(?!\s+(?:ave|avenue|st|street|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pkwy|parkway)\b)|congressional)\b/i,
  },
  {
    id: "crime",
    pattern:
      /\b(?:crimes?|criminals?|felon(?:y|ies)|misdemeanors?|suspects?|arrested|under arrest|taken into custody|charged with|indict(?:ed|ment)|convicted|robber(?:y|ies)|burglar(?:y|ies)|thefts?|stolen|homicides?|manslaughter|traffick(?:ing|ed)|cartels?)\b/i,
  },
  {
    id: "violence",
    pattern:
      /\b(?:violence|violent|assault(?:ed|s)?|stabb(?:ed|ing|s)?|murders?|murdered|homicides?|bombs?|bombings?|explosions?|terror(?:ist|ism)?|abuse(?:d|s)?|abusive|suicid(?:e|al)|weapons?|firearms?|handguns?|rifles?|pistols?|guns?)\b/i,
  },
  {
    id: "use-of-force",
    pattern:
      /\b(?:use of force|use-of-force|used force|excessive force|brutality|tasers?|tasered|pepper[- ]spray|officer-involved|lethal force)\b/i,
  },
  {
    id: "shooting",
    pattern: /\b(?:shootings?|gunfire|gunshots?|gunmen|gunman|shots fired|opened fire|shot and killed)\b/i,
  },
];

/** A completed rescue or a lifesaving save, not a camp, a stipend, or a mascot name. */
const RESCUE =
  /\b(?:reviv\w*|resuscit\w*|\bcpr\b|heimlich|defibrillat\w*|oxygen masks?|shallow-water rescue|rescued|found alive|started breathing|breathing again|life-?saving|brought (?:him|her|them|both|everyone|the|a|an|\d+|two|three|four|five|six)|got (?:him|her|them|both|the|a|an|\d+|two)|pulled (?:him|her|them|the|a|an)|lifted (?:him|her|them|both|the|two)|freed|carried (?:him|her|them|a|the)|hoisted|climb(?:ed)? out|no one was hurt|nobody was hurt|was not hurt|were not hurt)\b/i;

/** The card has to say what happened, not only set the scene. */
const OUTCOME =
  /\b(?:thank(?:s|ed|ing|-you)?|grateful|for free|\bfree\b|helped|hosted|welcomed|rescued|reviv\w*|breathing again|started breathing|\bcpr\b|climbed out|lifted|pulled (?:him|her|it|them|the)|carried|gave|given|gives|donated|packed|wrote|written|repaired|put a new|new roof|at no charge|built|opened|received|released|started|signed up|haircuts?|bouquets?|costumes?|librar(?:y|ies)|meals?|pounds of food|food drive|food bank|boxes of food|fed|feeding|played|\bplay\b|hugged|saying hello|welcome|painted|collected|loaded|adopted|hatched|passed both|\bpounds\b|back home|was not hurt|no one was hurt)\b/i;

const UNFINISHED = /\b(?:needed to be|was short|still missing|not a count|does not name|the article does not)\b/i;

const FINISHED =
  /\b(?:put a new|at no charge|finished|gives|gave|given|built|donated|hosted|rescued|released|wrote|opened|received|started|signed up|loaded|carried|lifted)\b/i;

/** Animals lane: a real animal was helped, born, freed, or given a home. A book or a game is not enough. */
const ANIMAL_EVENT =
  /\b(?:rescued|saved|adopted|fostered|released|hatched|hatchlings?|reunited|nest(?:s|ed|ing)?|wildlife|shelters?|carers?|oxygen|got (?:him|her|it|them) (?:out|to|home|back)|pulled (?:him|her|it|them)|freed|back on the water|back home|back to (?:the|their)|sanctuary|refuge|habitat|climb(?:ed)? (?:in|out))\b/i;

const VETERAN_LEAD = /\b(?:veterans?|served|service|Army|Navy|Air Force|Coast Guard|Marines?|thank-you cards|roofs?)\b/i;

const GRATITUDE = /\b(?:thank(?:s|ed|ing)?|grateful|gratitude|kindness|welcome home|giving back)\b/i;

const LANE_MUST: Partial<Record<TableTalkLane, RegExp>> = {
  responders: RESCUE,
  animals: ANIMAL_EVENT,
  veterans: VETERAN_LEAD,
};

const ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|U\.S|U\.K|D\.C)\./g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scrub(text: string, sourceName?: string): string {
  let out = text;
  const source = sourceName?.trim();
  if (source) out = out.replace(new RegExp(escapeRegExp(source), "gi"), " ");
  for (const phrase of SAFE_PHRASES) out = out.replace(phrase, " ");
  return out;
}

function leadText(story: TableTalkStory): string {
  return scrub([story.title, story.dek, story.kidSummary, ...(story.kidQuestions ?? [])].filter(Boolean).join("\n"), story.sourceName);
}

function fullText(story: TableTalkStory): string {
  return scrub(
    [story.title, story.dek, story.body, story.kidSummary, story.imageAlt, story.imageCaption, ...(story.kidQuestions ?? [])]
      .filter(Boolean)
      .join("\n"),
    story.sourceName,
  );
}

function hasDeath(text: string): boolean {
  const cleaned = text.replace(NEAR_MISS, " ");
  return DEATH.test(cleaned);
}

/**
 * Politics, crime, violence, use of force, or a shooting.
 * Same BLOCKS list as the card filter. Illness and death stay on tableTalkBlockReason
 * so a health story can still be read somewhere else.
 */
export function tableTalkHarmReason(story: TableTalkStory): string | undefined {
  const full = fullText(story);
  for (const rule of BLOCKS) {
    if (rule.pattern.test(full)) return rule.id;
  }
  return undefined;
}

/** Why a story cannot sit on a family or classroom card, or undefined when it can. */
export function tableTalkBlockReason(story: TableTalkStory): string | undefined {
  if (story.category === "health-tech") return "illness";
  if (story.tags.some((tag) => ILLNESS_TAGS.has(tag))) return "illness";
  const lead = leadText(story);
  if (ILLNESS.test(lead) || SENSITIVE.test(lead)) return "illness";
  if (hasDeath(lead)) return "death";
  const full = fullText(story);
  if (DISASTER.test(full) && hasDeath(full)) return "disaster-deaths";
  return tableTalkHarmReason(story);
}

export function splitTableTalkSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const protectedText = normalized.replace(ABBREVIATIONS, (match) => match.replace(/\./g, "\u0000"));
  return protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/)
    .map((part) => part.replace(/\u0000/g, ".").trim())
    .filter(Boolean);
}

type ExcerptWindow = { text: string; index: number };

function excerptWindows(sentences: string[]): ExcerptWindow[] {
  const windows: ExcerptWindow[] = [];
  for (let index = 0; index < sentences.length; index += 1) {
    const first = sentences[index];
    if (!first) continue;
    if (first.length <= 340) windows.push({ text: first, index });
    const second = sentences[index + 1];
    if (!second) continue;
    const two = `${first} ${second}`;
    if (two.length <= 340) windows.push({ text: two, index });
  }
  return windows;
}

/**
 * One or two consecutive sentences, copied verbatim.
 * The window has to contain the outcome. A must-match pattern (a rescue, an
 * animal, a veteran) keeps a lane card from stopping before the point.
 */
export function tableTalkExcerpt(text: string | undefined, must?: RegExp): string | undefined {
  if (!text) return undefined;
  const sentences = splitTableTalkSentences(text);
  let best: { text: string; score: number } | undefined;
  for (const window of excerptWindows(sentences)) {
    if (must && !must.test(window.text)) continue;
    if (must === ANIMAL_EVENT && /\b(?:book|game called)\b/i.test(window.text)) continue;
    if (!OUTCOME.test(window.text)) continue;
    let score = 14 - window.index;
    if (OUTCOME.test(window.text)) score += 4;
    if (/\b(?:reported|according to)\b/i.test(window.text)) score -= 3;
    if (UNFINISHED.test(window.text) && !FINISHED.test(window.text)) score -= 25;
    if (window.text.length < 70) score -= 5;
    if (window.text.length > 300) score -= 3;
    const parts = splitTableTalkSentences(window.text);
    const second = parts[1];
    if (second && (OUTCOME.test(second) || Boolean(must?.test(second)))) score += 2;
    if (second && !OUTCOME.test(second) && !(must && must.test(second))) score -= 6;
    if (!best || score > best.score) best = { text: window.text, score };
  }
  return best && best.score >= 8 ? best.text : undefined;
}

export function tableTalkQuestions(lane: TableTalkLane): readonly string[] {
  return QUESTIONS[lane];
}

export function thanksgivingIso(year: number): string {
  const first = new Date(Date.UTC(year, 10, 1));
  const firstThursday = 1 + ((4 - first.getUTCDay() + 7) % 7);
  const day = firstThursday + 21;
  return `${year}-11-${String(day).padStart(2, "0")}`;
}

export function thanksgivingLabel(year: number): string {
  return `Thursday, ${formatLongDate(thanksgivingIso(year))}`;
}

export function tableTalkYear(now = new Date()): number {
  return Number(mountainDay(now).slice(0, 4));
}

export function tableTalkBannerVisible(now = new Date()): boolean {
  if (Number.isNaN(now.getTime())) return false;
  const day = mountainDay(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const monthDay = day.slice(5);
  return monthDay >= TABLE_TALK_BANNER_WINDOW.start && monthDay <= TABLE_TALK_BANNER_WINDOW.end;
}

export function tableTalkDescription(year: number, count: number): string {
  return `Good News Table Talk for Thanksgiving ${year}: ${count} printable conversation cards from real archive stories, each with a short summary and one question. For families and classrooms.`;
}

function responderRescue(story: TableTalkStory): boolean {
  if (!story.tags.some((tag) => (RESPONDER_TAGS as readonly string[]).includes(tag))) return false;
  const lead = `${story.title}\n${story.dek}\n${story.kidSummary ?? ""}`;
  return RESCUE.test(lead);
}

function lanesFor(story: TableTalkStory): TableTalkLane[] {
  if (!story.kidSummary) return [];
  const lanes: TableTalkLane[] = [];
  if (responderRescue(story) && tableTalkExcerpt(story.kidSummary, RESCUE)) lanes.push("responders");
  if (story.tags.includes("veterans") && tableTalkExcerpt(story.kidSummary, VETERAN_LEAD)) lanes.push("veterans");
  if (story.kidFriendly && (story.tags.includes("kids") || story.tags.includes("students")) && tableTalkExcerpt(story.kidSummary)) {
    lanes.push("kids");
  }
  if (
    (story.category === "animals" || story.tags.some((tag) => ANIMAL_TAGS.has(tag))) &&
    tableTalkExcerpt(story.kidSummary, ANIMAL_EVENT)
  ) {
    lanes.push("animals");
  }
  if (story.country !== "US" && tableTalkExcerpt(story.kidSummary)) lanes.push("world");
  if (
    story.country === "US" &&
    story.state &&
    (story.category === "community" || story.category === "heroes" || story.tags.some((tag) => STATE_TAGS.has(tag))) &&
    tableTalkExcerpt(story.kidSummary)
  ) {
    lanes.push("states");
  }
  return lanes;
}

function warmth(story: TableTalkStory): number {
  let score = 0;
  for (const tag of WARM_TAGS) {
    if (story.tags.includes(tag)) score += 3;
  }
  if (GRATITUDE.test(`${story.title}\n${story.dek}\n${story.kidSummary ?? ""}`)) score += 4;
  if (story.category === "community" || story.category === "heroes" || story.category === "animals") score += 2;
  return score;
}

function recency(date: string, today: string): number {
  const age = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86_400_000);
  if (Number.isNaN(age)) return 0;
  if (age <= 21) return 6;
  if (age <= 60) return 4;
  if (age <= 120) return 2;
  return 0;
}

function placeKey(story: TableTalkStory): string {
  if (story.country === "US" && story.state) return story.state;
  return story.country;
}

function cardFrom(story: TableTalkStory, lane: TableTalkLane, index: number, pinned: boolean): TableTalkCard | undefined {
  const summary = tableTalkExcerpt(story.kidSummary, LANE_MUST[lane]);
  if (!summary) return undefined;
  const prompts = QUESTIONS[lane];
  return {
    story,
    lane,
    summary,
    question: prompts[index % prompts.length] ?? prompts[0]!,
    pinned,
    place: placeLabel(story),
  };
}

type Ranked = { story: TableTalkStory; score: number };

function byScore(today: string) {
  return (story: TableTalkStory): Ranked => ({
    story,
    score: warmth(story) + recency(story.date, today) + (story.country === "US" ? 0 : 1),
  });
}

function sortRanked(items: Ranked[]): Ranked[] {
  return items.sort((a, b) => b.score - a.score || (a.story.date < b.story.date ? 1 : a.story.date > b.story.date ? -1 : a.story.slug.localeCompare(b.story.slug)));
}

function tagCounts(stories: TableTalkStory[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const story of stories) {
    for (const tag of story.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

function overTagCap(story: TableTalkStory, counts: Map<string, number>, cap: number): boolean {
  return story.tags.some((tag) => (counts.get(tag) ?? 0) >= cap);
}

function pickDiverse(ranked: Ranked[], quota: number, used: Set<string>, already: TableTalkStory[] = []): Ranked[] {
  const picked: Ranked[] = [];
  const seenPlace = new Set<string>(already.map(placeKey));
  function take(item: Ranked, enforcePlace: boolean, cap: number) {
    if (picked.length >= quota || used.has(item.story.slug)) return;
    if (picked.some((row) => row.story.slug === item.story.slug)) return;
    const counts = tagCounts([...already, ...picked.map((row) => row.story)]);
    if (overTagCap(item.story, counts, cap)) return;
    const key = placeKey(item.story);
    if (enforcePlace && seenPlace.has(key)) return;
    seenPlace.add(key);
    picked.push(item);
  }
  for (const item of ranked) take(item, true, 2);
  for (const item of ranked) take(item, false, 2);
  for (const item of ranked) take(item, false, 99);
  return picked;
}

function regionZip(ranked: Ranked[]): Ranked[] {
  const groups = new Map<string, Ranked[]>();
  for (const item of ranked) {
    const region = getCountry(item.story.country)?.region ?? "other";
    const list = groups.get(region) ?? [];
    list.push(item);
    groups.set(region, list);
  }
  const keys = [...groups.keys()].sort();
  const out: Ranked[] = [];
  let index = 0;
  let added = true;
  while (added) {
    added = false;
    for (const key of keys) {
      const item = groups.get(key)?.[index];
      if (!item) continue;
      out.push(item);
      added = true;
    }
    index += 1;
  }
  return out;
}

export function parseTableTalkEditorConfig(data: unknown): TableTalkEditorConfig {
  const parsed = editorSchema.safeParse(data);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`data/table-talk.json: ${details}`);
  }
  return parsed.data;
}

export function loadTableTalkEditorConfig(): TableTalkEditorConfig {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as unknown;
  return parseTableTalkEditorConfig(raw);
}

/**
 * Pins first, then the strongest unused story in each lane.
 * Cards are interleaved so a printed page mixes states, kids, animals,
 * first responders, veterans, and the world.
 */
export function buildTableTalkDeck(
  stories: TableTalkStory[],
  config: TableTalkEditorConfig,
  now = new Date(),
): TableTalkDeck {
  const year = tableTalkYear(now);
  const today = mountainDay(now);
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const pinErrors: string[] = [];
  const excluded = new Set(config.exclude);

  for (const slug of config.exclude) {
    if (!bySlug.has(slug)) pinErrors.push(`exclude ${slug} is not a published story`);
  }

  const eligible = stories.filter((story) => !excluded.has(story.slug) && !tableTalkBlockReason(story) && tableTalkExcerpt(story.kidSummary));
  const eligibleSlugs = new Set(eligible.map((story) => story.slug));
  const used = new Set<string>();
  const buckets = new Map<TableTalkLane, TableTalkCard[]>(TABLE_TALK_LANES.map((lane) => [lane, []]));

  function push(story: TableTalkStory, lane: TableTalkLane, pinned: boolean) {
    const bucket = buckets.get(lane);
    if (!bucket) return;
    const card = cardFrom(story, lane, bucket.length, pinned);
    if (!card) return;
    bucket.push(card);
    used.add(story.slug);
  }

  for (const slug of config.pins) {
    if (excluded.has(slug)) {
      pinErrors.push(`pin ${slug} is also excluded`);
      continue;
    }
    const story = bySlug.get(slug);
    if (!story) {
      pinErrors.push(`pin ${slug} is not a published story`);
      continue;
    }
    const reason = tableTalkBlockReason(story);
    if (reason) {
      pinErrors.push(`pin ${slug} is blocked (${reason})`);
      continue;
    }
    if (!tableTalkExcerpt(story.kidSummary, LANE_MUST[lanesFor(story)[0] ?? "states"])) {
      pinErrors.push(`pin ${slug} needs a classroom summary`);
      continue;
    }
    const lanes = lanesFor(story);
    const lane = lanes[0];
    if (!lane) {
      pinErrors.push(`pin ${slug} does not fit a table-talk lane`);
      continue;
    }
    push(story, lane, true);
  }

  const scoreOf = byScore(today);
  const fillOrder: TableTalkLane[] = ["responders", "veterans", "kids", "world", "animals", "states"];
  for (const lane of fillOrder) {
    const bucket = buckets.get(lane);
    if (!bucket) continue;
    const room = Math.max(0, LANE_QUOTA[lane] - bucket.length);
    if (room === 0) continue;
    let ranked = sortRanked(
      eligible
        .filter((story) => !used.has(story.slug) && lanesFor(story).includes(lane))
        .map((story) => {
          const rankedStory = scoreOf(story);
          if (lane === "kids" && story.country !== "US") rankedStory.score -= 3;
          if (lane === "world") rankedStory.score += warmth(story);
          return rankedStory;
        }),
    );
    if (lane === "world") ranked = regionZip(ranked);
    for (const item of pickDiverse(ranked, room, used, bucket.map((card) => card.story))) push(item.story, lane, false);
  }

  if (used.size < 24) {
    const extras = sortRanked(eligible.filter((story) => !used.has(story.slug) && lanesFor(story).length > 0).map(scoreOf));
    for (const item of extras) {
      if (used.size >= 24) break;
      const lane = lanesFor(item.story).find((candidate) => candidate === "states" || candidate === "world") ?? lanesFor(item.story)[0];
      if (!lane) continue;
      push(item.story, lane, false);
    }
  }

  const cards: TableTalkCard[] = [];
  const queues = new Map<TableTalkLane, TableTalkCard[]>(LANE_CYCLE.map((lane) => [lane, [...(buckets.get(lane) ?? [])]]));
  let added = true;
  while (added) {
    added = false;
    for (const lane of LANE_CYCLE) {
      const next = queues.get(lane)?.shift();
      if (!next) continue;
      cards.push(next);
      added = true;
    }
  }

  const trimmed = cards.filter((card) => eligibleSlugs.has(card.story.slug) || config.pins.includes(card.story.slug)).slice(0, TABLE_TALK_MAX);
  return { cards: trimmed, pinErrors, year };
}

export function tableTalkDeck(stories: Story[] = getPublishedStories(), now = new Date()): TableTalkDeck {
  return buildTableTalkDeck(stories, loadTableTalkEditorConfig(), now);
}
