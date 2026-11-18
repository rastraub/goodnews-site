/**
 * December Advent of Good News, 2026.
 *
 * One door a day from December 1 through December 24, America/Denver.
 * An editor can pin a story in data/advent-2026.json. A day with no pin
 * gets a kid-friendly archive story that fits that day's kind act.
 * A pin cannot put back a story the classroom filter rejected, and a
 * story is never used on two doors.
 *
 * Doors stay locked until that calendar date. The pages render on request
 * so a door opens at midnight Denver time without waiting for a deploy.
 * The homepage line is separate from the single seasonal banner.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { isUnsuitableText } from "./morning-announcements";
import { heavyNewsReason } from "./news-break";
import { isTag } from "./tags";
import { getPublishedStories, type Story } from "./stories";
import { formatLongDate, mountainDay, parseIsoDate } from "./weeks";

export const ADVENT_YEAR = 2026;
export const ADVENT_DAY_COUNT = 24;
export const ADVENT_TIME_ZONE = "America/Denver";
export const ADVENT_PATH = "/advent/2026";
export const ADVENT_PRINT_PATH = "/advent/2026/print";
export const ADVENT_BANNER_START = "2026-11-30";
export const ADVENT_BANNER_END = "2026-12-24";

export const ADVENT_TITLE = "December Advent of Good News";

export const ADVENT_DESCRIPTION =
  "A door a day from December 1 through December 24. Each open door pairs one real kid-friendly story with one free act of kindness for a family or a class.";

export const ADVENT_SHARE =
  "December Advent of Good News: one real story and one free kind act each day, December 1 through 24.";

const CONFIG_PATH = path.join(process.cwd(), "data", "advent-2026.json");
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_KEY = /^(?:[1-9]|1\d|2[0-4])$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const editorSchema = z
  .object({
    pins: z.record(z.string().regex(DAY_KEY, "Use a day from 1 to 24"), z.string().regex(SLUG, "Use a story slug")),
  })
  .strict();

export type AdventEditorConfig = z.infer<typeof editorSchema>;

export type AdventAct = {
  day: number;
  theme: string;
  title: string;
  detail: string;
  /** Rare tags. These decide which story fits the act. */
  focus: readonly string[];
  /** Common tags. They add a weaker match and do not outrank a focus tag. */
  also: readonly string[];
  words?: RegExp;
};

export type AdventCandidate = {
  slug: string;
  title: string;
  shortTitle?: string;
  dek: string;
  body?: string;
  date: string;
  tags?: string[];
  sourceName?: string;
  sourceUrl?: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  kidQuestions?: string[];
  draft?: boolean;
  city?: string;
  state?: string;
  place?: string;
  country?: string;
};

export type AdventDoor<T> = {
  day: number;
  date: string;
  path: string;
  printPath: string;
  act: AdventAct;
  story?: T;
  pinned: boolean;
  status: "open" | "locked";
  /** Theme match for an automatic pick. Zero means the story was a leftover. */
  score: number;
};

export type AdventCalendar<T> = {
  year: number;
  today: string;
  path: string;
  printPath: string;
  doors: AdventDoor<T>[];
  pinErrors: string[];
};

/**
 * Free acts a family or a class can do with what they already have.
 * No purchases, no donations, and no trip a child would take alone.
 * `focus` tags are how the automatic pick stays close to the act.
 */
export const ADVENT_ACTS: readonly AdventAct[] = [
  {
    day: 1,
    theme: "Reading",
    title: "Read one page aloud",
    detail:
      "Read one page of a book you already have to someone in your home or class. Let the other person hold the book if they want a turn.",
    focus: ["libraries", "literacy", "little-free-libraries"],
    also: [],
    words: /\b(?:books?|librar(?:y|ies)|reading)\b/i,
  },
  {
    day: 2,
    theme: "Pets and animal rescue",
    title: "Be gentle with a pet you know",
    detail:
      "Tell someone one kind thing from today's story. Then spend two quiet minutes with a pet you already know, or draw that animal if you do not have a pet. Do not go up to a strange animal.",
    focus: ["dogs", "cats", "pet-adoption", "animal-rescue"],
    also: [],
    words: /\b(?:dogs?|cats?|kittens?|puppies|puppy|adopt(?:ed|ion)?)\b/i,
  },
  {
    day: 3,
    theme: "Birds",
    title: "Notice one bird",
    detail:
      "Look out a window for one minute. Tell a classmate one bird, or one thing in the sky, that you actually saw. Stay inside unless a teacher goes with the group.",
    focus: ["birds"],
    also: [],
    words: /\b(?:birds?|owls?|eagles?|nests?|nesting)\b/i,
  },
  {
    day: 4,
    theme: "Water and sea life",
    title: "Save a little water",
    detail:
      "While you wash your hands, turn the water off while you soap them, then turn it back on to rinse. Tell someone that clean water helps animals like the ones in today's story.",
    focus: ["sea-turtles", "rivers"],
    also: [],
    words: /\b(?:turtles?|rivers?|ocean|hatchlings?)\b/i,
  },
  {
    day: 5,
    theme: "Wild animals",
    title: "Share one true fact",
    detail:
      "Tell a friend one fact that is written in today's story. If you are not sure the story said it, leave it out. Do not make up a fact about the animal.",
    focus: ["zoos"],
    also: ["wildlife-conservation"],
    words: /\b(?:zoos?|wildlife|habitat)\b/i,
  },
  {
    day: 6,
    theme: "Parks, trees, and trails",
    title: "Pick up one piece of litter",
    detail:
      "On a walk you are already taking with an adult, pick up one piece of litter and put it in a bin. At school, stay on the grounds and ask a teacher before you leave the building.",
    focus: ["parks", "trees", "trails"],
    also: [],
    words: /\b(?:parks?|trees?|trails?|forests?)\b/i,
  },
  {
    day: 7,
    theme: "Gardens and farms",
    title: "Help one plant",
    detail:
      "Thank the person who looks after a plant at home or at school, or water one plant an adult says you may water. Leave flowers that are not yours on the stem.",
    focus: ["community-garden", "farming", "pollinators"],
    also: [],
    words: /\b(?:gardens?|farms?|farming|bees?|pollinators?)\b/i,
  },
  {
    day: 8,
    theme: "Neighbors",
    title: "Say hello by name",
    detail:
      "Say hello to a neighbor or a school adult you already know, and use their name if you know it. Stay with a parent or a teacher. A hello is enough.",
    focus: ["neighbors"],
    also: ["kindness"],
    words: /\b(?:neighbou?rs?)\b/i,
  },
  {
    day: 9,
    theme: "Classmates",
    title: "Offer a seat",
    detail:
      "Invite a classmate who is sitting alone to sit with you. If they say no, smile and let them be. Do not announce it to the rest of the room.",
    focus: ["schools", "students"],
    also: ["kids"],
    words: /\b(?:classmates?|students?|schools?|classrooms?)\b/i,
  },
  {
    day: 10,
    theme: "Teachers",
    title: "Thank a teacher",
    detail: "Tell a teacher one specific thing they did that helped you. One sentence is enough. You do not need a gift or a card.",
    focus: ["teachers"],
    also: [],
    words: /\b(?:teachers?)\b/i,
  },
  {
    day: 11,
    theme: "Thank-you notes",
    title: "Write a short thank-you",
    detail:
      "Write a thank-you of two or three sentences on paper you already have. Name the thing the person did. Give it to someone in your home or school.",
    focus: ["seniors"],
    also: [],
    words: /\b(?:seniors?|grandparents?)\b/i,
  },
  {
    day: 12,
    theme: "Meals",
    title: "Help with the meal",
    detail:
      "At a meal you are already having, set the table or clear one plate when the meal is over. Leave food that is on someone else's plate where it is.",
    focus: ["community-meals", "food-banks", "food-rescue", "school-lunch"],
    also: [],
    words: /\b(?:meals?|food|pantr(?:y|ies)|lunch)\b/i,
  },
  {
    day: 13,
    theme: "Winter clothes",
    title: "Help with a coat",
    detail:
      "Hang up your own coat, then offer to help a classmate find theirs. Do not give clothing away unless a parent says that coat is yours to give.",
    focus: ["winter-clothes"],
    also: [],
    words: /\b(?:coats?|scarves|mittens|winter)\b/i,
  },
  {
    day: 14,
    theme: "Play",
    title: "Offer one turn",
    detail:
      "In a game or on the playground, offer one turn to someone who has been waiting. Follow the rules of the game, and let that person go first.",
    focus: ["playgrounds", "youth-sports"],
    also: [],
    words: /\b(?:playgrounds?|teams?)\b/i,
  },
  {
    day: 15,
    theme: "Music and art",
    title: "Make a small echo",
    detail:
      "Clap or hum a short pattern and let someone echo it, or draw today's story on scrap paper the class already has. You do not need new supplies.",
    focus: ["music", "art"],
    also: [],
    words: /\b(?:music|songs?|murals?)\b/i,
  },
  {
    day: 16,
    theme: "Helping out",
    title: "Do one small job",
    detail:
      "At home, put shoes by the door or wipe one table without being asked. Ask before you climb, use a tool, or touch something that is not yours.",
    focus: ["home-repairs", "housing"],
    also: ["volunteers"],
    words: /\b(?:repairs?|repaired|volunteers?)\b/i,
  },
  {
    day: 17,
    theme: "Inclusion",
    title: "Hold the door and wait",
    detail:
      "Hold a door and wait so the person behind you can come through. Do not touch a wheelchair, a cane, a walker, or a service dog.",
    focus: ["inclusion", "accessibility"],
    also: [],
    words: /\b(?:accessible|inclusion|wheelchair|braille)\b/i,
  },
  {
    day: 18,
    theme: "Science and space",
    title: "Ask one real question",
    detail:
      "Tell someone one true thing from today's story, then ask them one question about it. If you do not know the answer, say that you do not know.",
    focus: ["stem", "space"],
    also: [],
    words: /\b(?:science|space|robots?|stars?)\b/i,
  },
  {
    day: 19,
    theme: "Bikes and running",
    title: "Use the safe crossing",
    detail:
      "On a walk or a ride you were already taking with an adult, use a crosswalk or a path you are supposed to be on. Point it out to the person with you.",
    focus: ["bikes", "running"],
    also: [],
    words: /\b(?:bikes?|bicycles?|runners?|running)\b/i,
  },
  {
    day: 20,
    theme: "Toys",
    title: "Share a toy you have",
    detail:
      "Offer a classmate or a sibling a turn with a toy or a game you already own. Let them go first. You do not need a new toy.",
    focus: ["toys"],
    also: [],
    words: /\b(?:toys?|games?|stuffed)\b/i,
  },
  {
    day: 21,
    theme: "Calm animals",
    title: "Use a quiet voice",
    detail:
      "For five minutes in a shared room, use a quiet voice. If a service dog is working, do not pet it or call to it. A quiet room is a kind room.",
    focus: ["therapy-animals", "service-dogs", "horses"],
    also: [],
    words: /\b(?:horses?|therapy|service dogs?)\b/i,
  },
  {
    day: 22,
    theme: "Cleanups",
    title: "Sort one scrap",
    detail:
      "Put one piece of paper into the recycling or trash bin your school or home already uses, or pick up one scrap in your classroom. Wash your hands after.",
    focus: ["cleanups", "recycling"],
    also: [],
    words: /\b(?:cleanups?|recycling|litter)\b/i,
  },
  {
    day: 23,
    theme: "Festivals",
    title: "Share a happy moment",
    detail:
      "Tell someone one happy part of today's story, then name one happy moment from your own day. Keep it kind. You do not need a ticket or a trip.",
    focus: ["festivals"],
    also: [],
    words: /\b(?:festivals?|fairs?|parades?)\b/i,
  },
  {
    day: 24,
    theme: "One kind plan",
    title: "Name one kind plan",
    detail:
      "With your family or your class, name one free kind act you will do after this calendar ends. Write it on paper you already have, and keep the paper.",
    focus: [],
    also: ["kindness", "kids"],
    words: /\b(?:kindness|neighbou?rs?)\b/i,
  },
];

export function adventIso(day: number, year = ADVENT_YEAR): string {
  return `${year}-12-${String(day).padStart(2, "0")}`;
}

export function adventDayPath(day: number): string {
  return `${ADVENT_PATH}/${day}`;
}

export function adventDayPrintPath(day: number): string {
  return `${ADVENT_PATH}/${day}/print`;
}

export function parseAdventDay(value: string): number | undefined {
  if (!DAY_KEY.test(value)) return undefined;
  return Number(value);
}

export function formatAdventDate(day: number): string {
  return formatLongDate(adventIso(day));
}

/** Denver calendar day. A dev server may pass `asOf` to preview another date. Production ignores it. */
export function adventToday(asOf?: string, now = new Date(), allowPreview = process.env.NODE_ENV !== "production"): string {
  if (allowPreview && asOf && ISO_DAY.test(asOf) && parseIsoDate(asOf)) return asOf;
  return mountainDay(now);
}

export function adventBannerOnDay(day: string): boolean {
  return ISO_DAY.test(day) && day >= ADVENT_BANNER_START && day <= ADVENT_BANNER_END;
}

export function adventBannerVisible(now = new Date()): boolean {
  return adventBannerOnDay(adventToday(undefined, now));
}

export function doorStatus(day: number, today: string): "open" | "locked" {
  if (!parseIsoDate(today)) return "locked";
  return today >= adventIso(day) ? "open" : "locked";
}

export function adventBlockReason(story: AdventCandidate): string | undefined {
  if (story.draft) return "it is still a draft";
  if (!story.kidFriendly) return "it is not marked kid-friendly";
  const summary = story.kidSummary?.trim();
  if (!summary) return "it has no kid summary";
  const heavy = heavyNewsReason({
    slug: story.slug,
    title: story.title,
    shortTitle: story.shortTitle,
    dek: story.dek,
    body: story.body,
    tags: story.tags,
    sourceName: story.sourceName,
    imageAlt: story.imageAlt,
    imageCaption: story.imageCaption,
    kidSummary: summary,
    kidQuestions: story.kidQuestions,
  });
  if (heavy) return `it matches a heavy-news term (${heavy})`;
  const facing = [story.title, story.shortTitle, story.dek, summary, ...(story.kidQuestions ?? []), story.imageAlt, story.imageCaption]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n");
  if (isUnsuitableText(facing)) return "the classroom text is not a fit to read aloud";
  if (story.body && isUnsuitableText(story.body)) return "the story text is not a fit for this calendar";
  return undefined;
}

export function parseAdventEditorConfig(value: unknown): AdventEditorConfig {
  const result = editorSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`Advent config: ${details}`);
  }
  return result.data;
}

export function loadAdventConfig(): AdventEditorConfig {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return parseAdventEditorConfig(JSON.parse(raw));
}

function tagPoints(act: AdventAct, tags: readonly string[]): number {
  const have = new Set(tags);
  let score = 0;
  for (const tag of act.focus) if (have.has(tag)) score += 16;
  for (const tag of act.also) if (have.has(tag)) score += 5;
  return score;
}

function themeScore(act: AdventAct, story: AdventCandidate): { score: number; themed: boolean } {
  const tags = tagPoints(act, story.tags ?? []);
  let words = 0;
  if (act.words) {
    const text = `${story.title}\n${story.dek}\n${story.kidSummary ?? ""}`;
    if (act.words.test(text)) words = 8;
  }
  return { score: tags + words, themed: tags > 0 };
}

function byBestMatch(a: { score: number; story: AdventCandidate }, b: { score: number; story: AdventCandidate }): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.story.date !== b.story.date) return a.story.date < b.story.date ? 1 : -1;
  return a.story.slug.localeCompare(b.story.slug);
}

/**
 * Most constrained day first, so a rare theme keeps its story
 * and a broad theme takes what remains.
 */
function assignStories<T extends AdventCandidate>(stories: T[], config: AdventEditorConfig): { chosen: Map<number, { story: T; pinned: boolean; score: number }>; pinErrors: string[] } {
  const pinErrors: string[] = [];
  const published = stories.filter((story) => !story.draft);
  const bySlug = new Map(published.map((story) => [story.slug, story]));
  const eligible = published.filter((story) => !adventBlockReason(story));
  const chosen = new Map<number, { story: T; pinned: boolean; score: number }>();
  const used = new Set<string>();

  for (const act of ADVENT_ACTS) {
    const slug = config.pins[String(act.day)];
    if (!slug) continue;
    const story = bySlug.get(slug);
    if (!story) {
      pinErrors.push(`Door ${act.day} pin ${slug} is not a published story.`);
      continue;
    }
    const reason = adventBlockReason(story);
    if (reason) {
      pinErrors.push(`Door ${act.day} pin ${slug} cannot be used: ${reason}.`);
      continue;
    }
    if (used.has(slug)) {
      pinErrors.push(`Door ${act.day} pin ${slug} is already used on another door.`);
      continue;
    }
    used.add(slug);
    chosen.set(act.day, { story, pinned: true, score: themeScore(act, story).score });
  }

  let pool = eligible.filter((story) => !used.has(story.slug));
  let open = ADVENT_ACTS.filter((act) => !chosen.has(act.day));

  while (open.length) {
    const themed = open
      .map((act) => ({
        act,
        options: pool
          .map((story) => {
            const match = themeScore(act, story);
            return { story, score: match.score, themed: match.themed };
          })
          .filter((item) => item.themed),
      }))
      .filter((item) => item.options.length > 0);

    if (!themed.length) break;
    themed.sort((a, b) => a.options.length - b.options.length || a.act.day - b.act.day);
    const pick = themed[0];
    if (!pick) break;
    pick.options.sort(byBestMatch);
    const best = pick.options[0];
    if (!best) break;
    chosen.set(pick.act.day, { story: best.story, pinned: false, score: best.score });
    pool = pool.filter((story) => story.slug !== best.story.slug);
    open = open.filter((act) => act.day !== pick.act.day);
  }

  pool.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  for (const act of open) {
    const story = pool.shift();
    if (!story) break;
    chosen.set(act.day, { story, pinned: false, score: 0 });
  }

  return { chosen, pinErrors };
}

export function buildAdventCalendar<T extends AdventCandidate>(stories: T[], config: AdventEditorConfig, today: string): AdventCalendar<T> {
  const { chosen, pinErrors } = assignStories(stories, config);
  const doors: AdventDoor<T>[] = ADVENT_ACTS.map((act) => {
    const pick = chosen.get(act.day);
    return {
      day: act.day,
      date: adventIso(act.day),
      path: adventDayPath(act.day),
      printPath: adventDayPrintPath(act.day),
      act,
      story: pick?.story,
      pinned: pick?.pinned ?? false,
      status: doorStatus(act.day, today),
      score: pick?.score ?? 0,
    };
  });
  return {
    year: ADVENT_YEAR,
    today,
    path: ADVENT_PATH,
    printPath: ADVENT_PRINT_PATH,
    doors,
    pinErrors,
  };
}

export function getAdventCalendar(today = adventToday()): AdventCalendar<Story> {
  return buildAdventCalendar(getPublishedStories(), loadAdventConfig(), today);
}

export function adventDoor<T>(calendar: AdventCalendar<T>, day: number): AdventDoor<T> | undefined {
  return calendar.doors.find((door) => door.day === day);
}

export function adventDayIndexable(door: { status: "open" | "locked"; story?: unknown }): boolean {
  return door.status === "open" && Boolean(door.story);
}

export function adventIndexablePaths(calendar: AdventCalendar<unknown>): string[] {
  const paths = [ADVENT_PATH, ADVENT_PRINT_PATH];
  for (const door of calendar.doors) {
    if (adventDayIndexable(door)) paths.push(door.path);
  }
  return paths;
}

export function adventUnpinnedDays<T>(calendar: AdventCalendar<T>): AdventDoor<T>[] {
  return calendar.doors.filter((door) => !door.pinned);
}

export function adventActTagsAreReal(): string | undefined {
  for (const act of ADVENT_ACTS) {
    for (const tag of [...act.focus, ...act.also]) {
      if (!isTag(tag)) return `Door ${act.day} uses an unknown tag ${tag}.`;
    }
  }
  return undefined;
}

export type AdventPrompt = { href: string; text: string; link: string };

export function adventNextPrompt(day: number, today: string): AdventPrompt {
  const start = adventIso(1);
  const end = adventIso(ADVENT_DAY_COUNT);
  if (!parseIsoDate(today) || today < start) {
    return { href: ADVENT_PATH, text: "The first door opens December 1. Come back then.", link: "See the calendar" };
  }
  if (today > end) {
    return { href: ADVENT_PATH, text: "All 24 doors are open. You can read any day.", link: "Open the calendar" };
  }
  const todayDay = Number(today.slice(8, 10));
  if (day === todayDay && day < ADVENT_DAY_COUNT) {
    return { href: adventDayPath(day + 1), text: `Come back tomorrow for door ${day + 1}.`, link: "Tomorrow's door" };
  }
  if (day === todayDay && day === ADVENT_DAY_COUNT) {
    return { href: ADVENT_PATH, text: "That was the last door. The stories stay on the calendar.", link: "Back to the calendar" };
  }
  if (todayDay >= 1 && todayDay <= ADVENT_DAY_COUNT) {
    return { href: adventDayPath(todayDay), text: `Door ${todayDay} is today's door.`, link: "Today's door" };
  }
  return { href: ADVENT_PATH, text: "See which doors are open on the calendar.", link: "The calendar" };
}

export function adventLockedDescription(day: number): string {
  return `Door ${day} of the December Advent of Good News opens on December ${day}, ${ADVENT_YEAR}, in America/Denver. Each open door has one real story from the archive and one free kind act. The story stays hidden until that date.`;
}

export function adventOgLines(door: Pick<AdventDoor<AdventCandidate>, "day" | "status" | "story" | "act">): { kicker: string; title: string; footer: string } {
  if (door.status !== "open" || !door.story) {
    return {
      kicker: "Advent of Good News",
      title: `Door ${door.day} opens December ${door.day}`,
      footer: "A real story and a free kind act",
    };
  }
  const raw = door.story.shortTitle || door.story.title;
  const title = raw.length > 90 ? `${raw.slice(0, 87)}...` : raw;
  return {
    kicker: `December ${door.day}`,
    title,
    footer: door.act.title,
  };
}
