/**
 * Good News Kudos cards.
 *
 * /kudos is the hub. /kudos/{slug} is a printable thank-you for one story.
 * A story is left off when an existing filter matches (heavy news, the
 * first-responder exclusion phrases, or the kindness tragedy filter), when
 * the text names a crime victim, abuse, or suicide, or when the slug is in
 * data/kudos-exclude.json. Rescue and lifesaving stories stay on.
 * The honoree is a group named in the title or deck, or a role from the
 * title, deck, or tags. Names in the body are not copied onto the card.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { exclusionLabel } from "./first-responders-day";
import { heavyNewsReason } from "./news-break";
import type { Story } from "./stories";
import { kindnessBlockReason } from "./world-kindness-day";

export const KUDOS_PATH = "/kudos";

export const KUDOS_TITLE = "Good News Kudos cards";

export const KUDOS_DESCRIPTION =
  "Send a printable thank-you card to a helper in a verified good-news story. You print it, copy it, or open it in your own email or text app. This site does not collect an address or send the card.";

export const KUDOS_RECENT_LIMIT = 24;

export const KUDOS_FALLBACK_HONOREE = "the volunteers in this story";

export const KUDOS_CLASSROOM_NOTE =
  "Students can make a kudos card for a helper in one of these stories, or for a helper in their own community, such as a nurse, a teacher, a crossing guard, or a volunteer. An adult should lead. Do not ask students for a home address, a phone number, or an email. The From line stays blank until someone writes a name by hand. Do not put a child's full name, age, or school on a card that leaves the classroom.";

const CONFIG_PATH = path.join(process.cwd(), "data", "kudos-exclude.json");

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

const editorSchema = z
  .object({
    exclude: z.array(slugSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const slug of data.exclude) {
      if (seen.has(slug)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["exclude"], message: `Duplicate exclude slug ${slug}` });
      }
      seen.add(slug);
    }
  });

export type KudosExcludeConfig = z.infer<typeof editorSchema>;

export type HonoreeSource = {
  title: string;
  dek: string;
  tags?: readonly string[];
  howToHelp?: readonly { label: string }[];
};

/**
 * "Nobody was killed" is a rescue outcome, not a tragedy headline.
 * The words are removed before the reused filters run.
 */
const NEAR_MISS =
  /\b(?:no one|nobody)\s+(?:was\s+|were\s+)?(?:killed|died|dead|hurt)\b|\b(?:was not|were not|wasn't|weren't)\s+(?:killed|hurt)\b/gi;

/** Gaps the reused filters do not already name. */
const EXTRA_INAPPROPRIATE =
  /\b(?:crime victims?|victims? of (?:a |the )?(?:crime|assault|attack|robbery|shooting)|sexual(?:ly)? assault(?:ed)?|domestic violence|child abuse|abus(?:e|ed|ive)|suicid(?:e|al))\b/i;

const ROLES: { pattern: RegExp; rank: number }[] = [
  { pattern: /\bcrossing guards?\b/i, rank: 0 },
  { pattern: /\bnurses?\b/i, rank: 1 },
  { pattern: /\bteachers?\b/i, rank: 2 },
  { pattern: /\blibrarians?\b/i, rank: 3 },
  { pattern: /\bcustodians?\b/i, rank: 4 },
  { pattern: /\b(?:firefighters?|fire crews?|fire departments?)\b/i, rank: 5 },
  { pattern: /\b(?:paramedics?|emts?)\b/i, rank: 6 },
  {
    pattern:
      /\b(?:search-and-rescue(?:\s+(?:volunteers?|crews?|teams?))?|search and rescue(?:\s+(?:volunteers?|crews?|teams?))?)\b/i,
    rank: 7,
  },
  { pattern: /\bdispatchers?\b/i, rank: 8 },
  { pattern: /\b(?:police officers?|deput(?:y|ies)|sheriffs?|troopers?)\b/i, rank: 9 },
  { pattern: /\bofficers?\b/i, rank: 10 },
  { pattern: /\bvolunteers?\b/i, rank: 11 },
  { pattern: /\b(?:neighbors?|neighbours?)\b/i, rank: 12 },
  { pattern: /\bstudents?\b/i, rank: 13 },
  { pattern: /\bcoaches?\b/i, rank: 14 },
];

const TAG_ROLES: { tag: string; label: string }[] = [
  { tag: "teachers", label: "the teachers in this story" },
  { tag: "firefighters", label: "the firefighters in this story" },
  { tag: "ems", label: "the paramedics in this story" },
  { tag: "search-and-rescue", label: "the search-and-rescue volunteers in this story" },
  { tag: "dispatch", label: "the dispatchers in this story" },
  { tag: "police", label: "the officers in this story" },
  { tag: "first-responders", label: "the first responders in this story" },
  { tag: "veterans", label: "the veterans in this story" },
  { tag: "students", label: "the students in this story" },
  { tag: "neighbors", label: "the neighbors in this story" },
  { tag: "volunteers", label: "the volunteers in this story" },
];

export function kudosPath(slug: string): string {
  return `${KUDOS_PATH}/${slug}`;
}

export function parseKudosExclude(value: unknown): KudosExcludeConfig {
  const result = editorSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(details || "Kudos exclude list is not valid.");
  }
  return result.data;
}

let cached: KudosExcludeConfig | null = null;

export function loadKudosExclude(): KudosExcludeConfig {
  if (process.env.NODE_ENV === "production" && cached) return cached;
  const config = parseKudosExclude(JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")));
  cached = config;
  return config;
}

export function kudosExcludeSlugs(): readonly string[] {
  return loadKudosExclude().exclude;
}

export function kudosExcludeErrors(stories: readonly { slug: string }[], config: KudosExcludeConfig): string[] {
  const published = new Set(stories.map((story) => story.slug));
  return config.exclude.filter((slug) => !published.has(slug)).map((slug) => `${slug} is not a published story.`);
}

function scrubNearMiss(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(NEAR_MISS, " ");
}

function scrubbed<T extends { title: string; dek: string; body?: string; kidSummary?: string }>(story: T): T {
  return {
    ...story,
    title: scrubNearMiss(story.title) ?? story.title,
    dek: scrubNearMiss(story.dek) ?? story.dek,
    body: scrubNearMiss(story.body),
    kidSummary: scrubNearMiss(story.kidSummary),
  };
}

/** Why a card would be a poor fit, or undefined when the story can have one. */
export function kudosBlockReason(story: Story, exclude: readonly string[]): string | undefined {
  if (story.draft) return "draft";
  if (exclude.includes(story.slug)) return "editor-exclude";
  const calm = scrubbed(story);
  const heavy = heavyNewsReason(calm);
  if (heavy) return heavy;
  const force = exclusionLabel(calm);
  if (force) return force;
  const kindness = kindnessBlockReason(calm);
  if (kindness) return kindness;
  const text = [calm.title, calm.dek, calm.body, calm.kidSummary, ...(calm.kidQuestions ?? [])].filter(Boolean).join("\n");
  const extra = text.match(EXTRA_INAPPROPRIATE);
  if (extra) return extra[0];
  return undefined;
}

export function kudosEligible(story: Story, exclude: readonly string[] = kudosExcludeSlugs()): boolean {
  return !kudosBlockReason(story, exclude);
}

export function filterKudos(stories: readonly Story[], exclude: readonly string[] = kudosExcludeSlugs()): Story[] {
  return stories.filter((story) => kudosEligible(story, exclude));
}

function namedGroup(story: HonoreeSource): string | undefined {
  const lead = `${story.title}\n${story.dek}`.toLowerCase();
  let best: string | undefined;
  for (const link of story.howToHelp ?? []) {
    const label = link.label.trim();
    if (label.length < 8) continue;
    if (!lead.includes(label.toLowerCase())) continue;
    if (!best || label.length > best.length) best = label;
  }
  return best;
}

function rolePhrase(text: string): string | undefined {
  const cleaned = text.replace(/\binformation officers?\b/gi, " ");
  let best: { index: number; rank: number; phrase: string } | undefined;
  for (const role of ROLES) {
    const match = role.pattern.exec(cleaned);
    if (!match) continue;
    if (!best || match.index < best.index || (match.index === best.index && role.rank < best.rank)) {
      best = { index: match.index, rank: role.rank, phrase: match[0].toLowerCase() };
    }
  }
  return best ? `the ${best.phrase} in this story` : undefined;
}

function tagRole(tags: readonly string[] | undefined): string | undefined {
  if (!tags?.length) return undefined;
  return TAG_ROLES.find((role) => tags.includes(role.tag))?.label;
}

/**
 * A group or role already written in the title, deck, tags, or a how-to-help
 * label that the title or deck also uses. The body is ignored so a reporter's
 * name or a person who was helped is not treated as the honoree.
 */
export function honoreeForStory(story: HonoreeSource): string {
  return namedGroup(story) ?? rolePhrase(story.title) ?? rolePhrase(story.dek) ?? tagRole(story.tags) ?? KUDOS_FALLBACK_HONOREE;
}
