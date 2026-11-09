/**
 * Good News for Coaches & Youth Sports.
 * One static page per Monday-start week (America/Denver edition dates),
 * the same week key as /week. Every week from launch through the open week
 * has a page. A thin week borrows earlier matching stories so the archive
 * does not skip a Monday.
 *
 * The huddle summary, discussion questions, and team kindness challenge are
 * copied from fields already on the story. Generic prompts are used only when
 * those fields are missing, and they do not add facts.
 *
 * Editor pins and excludes live in data/coaches-pack.json.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { heavyNewsReason } from "./news-break";
import { absoluteUrl } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { escapeHtml } from "./tip-mail";
import {
  MAX_PRERENDERED_WEEKS,
  SITE_LAUNCH,
  addDays,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";
import { siteConfig } from "@/site.config";

export const COACHES_INDEX_PATH = "/coaches";
export const COACHES_INDEX_TITLE = "Good News for Coaches & Youth Sports";
export const COACHES_INDEX_DESCRIPTION =
  "A free weekly Team Huddle for coaches and parent volunteers. Sportsmanship, teamwork, and kids helping, with a read-aloud, discussion questions, and a team kindness challenge.";

export const COACHES_LEVEL = "Youth sports, ages 6–18";
export const COACHES_PACK_MAX = 5;
export const COACHES_PACK_TARGET = 3;

export const COACHES_NOTE =
  "Plan on 3 to 5 minutes before practice. A coach or a parent volunteer reads the Team Huddle summary aloud, asks one discussion question, and names the team kindness challenge. The summary is the story's classroom read-aloud when the story has one, and the deck otherwise. Words are not added to make it longer. The other stories can go in a league newsletter or a team group chat. Skip any story that does not fit your group. Do not add a player's name, a photo of a child, or a school name to anything you copy from this page.";

const CONFIG_PATH = path.join(process.cwd(), "data", "coaches-pack.json");

const STRONG_TAGS = new Set(["youth-sports", "running", "bikes", "playgrounds", "inclusion", "trails"]);
const SPIRIT_TAGS = new Set(["kids", "students", "kindness", "neighbors", "schools", "toys", "volunteers"]);

const SPORT_TEXT =
  /\b(?:sports?|sportsmanship|teams?|teammates?|coaches?|coaching|athletes?|soccer|basketball|football|baseball|softball|hockey|volleyball|swimming|swim team|track and field|gymnastics|cheer(?:leading|leaders)?|adaptive|wheelchair|leagues?|tournaments?|game day|youth sports?|playgrounds?|pump tracks?|bikes?|bicycles?|cycling|runners?|races?|\b5k\b|marathons?)\b/i;

const VIRTUE_TEXT =
  /\b(?:teamwork|persever(?:e|ed|ance|ing)|sportsmanship|fair play|inclusive|inclusion|cheered|encouraged)\b/i;

const KIDS_TEXT = /\b(?:kids?|children|child|students?|teens?|teenagers?|graders?|youth|players?)\b/i;

const SAFE_PHRASES = [
  /democratic republic/gi,
  /democrat-gazette/gi,
  /times[-\s]+republican/gi,
  /cynthiana democrat/gi,
  /library of congress/gi,
];

const INJURY_CLEAR =
  /\b(?:no one|nobody)\s+(?:was\s+|were\s+)?injur\w*|\b(?:was|were|is|are)\s+not\s+injur\w*|\b(?:wasn'?t|weren'?t)\s+injur\w*|\bwithout\s+(?:an?\s+|any\s+)?injur\w*|\bno\s+injur\w*/gi;

const INJURY =
  /\b(?:injur(?:y|ies|ed)|fractures?|fractured|concussions?|concussed|broken (?:arm|leg|wrist|ankle|bone|rib|ribs|collarbone)|hospitalized|cardiac arrest|no pulse|not breathing|wasn'?t breathing|weren'?t breathing|stopped breathing|unconscious|unresponsive)\b/i;

const DEATH_CLEAR =
  /\b(?:no one|nobody)\s+(?:was\s+|were\s+)?(?:killed|died)|\b(?:was|were)\s+not\s+(?:killed|died)|\b(?:nearly|almost|would have|could have)\s+(?:been\s+)?(?:killed|died)|\bphone died\b/gi;

const DEATH =
  /\b(?:killed|killing|deaths?|died(?!\s+out)|fatalit(?:y|ies)|fatal|perished|passed away|funerals?|obituaries|obituary)\b/i;

const VIOLENCE =
  /\b(?:violence|violent|assault(?:ed|s)?|stabb(?:ed|ing|s)?|murders?|murdered|homicides?|shootings?|gunfire|gunshots?|gunmen|gunman|shots fired|opened fire|terror(?:ist|ism)?|abuse(?:d|s)?|abusive|suicid(?:e|al)|weapons?|firearms?|handguns?|rifles?|pistols?|guns?|(?<!seed )bombs?|bombings?)\b/i;

const FORCE =
  /\b(?:use of force|use-of-force|used force|excessive force|brutality|tasers?|tasered|pepper[- ]spray|officer-involved|lethal force)\b/i;

const GAMBLING =
  /\b(?:gambl\w*|sportsbooks?|wagers?|wagered|wagering|parlays?|point spreads?|\bbets?\b|betting)\b/i;

const SCANDAL =
  /\b(?:scandals?|disgraced|doping|steroids?|match-?fixing|bribes?|bribery|bribed|cover-ups?)\b/i;

const POLITICS_WORD =
  /elect|democrat|republican|congress|politic|ballot|senate|partisan|\bgop\b|impeach|caucus|referendum|legislat|incumbent|white house|oval office|campaign/i;

export const COACH_PROMPTS = [
  "What happened in this story?",
  "What could our team learn from the way people treated each other?",
  "Who on our team could use a kind word before the next practice?",
] as const;

export const FREE_CHALLENGES = [
  "Before the next practice, thank one person who helps the team and does not usually hear it. A referee, a groundskeeper, or a parent who carries the gear all count. Keep it free.",
  "Leave the field, the gym, or the parking lot a little cleaner than you found it. One lap, picking up what you can carry, is enough.",
  "Each player tells one teammate one true, kind thing that teammate did. Keep it specific and short. No gifts.",
  "Write one thank-you note together and leave it for someone who helps your team. A few sentences on one sheet is enough.",
] as const;

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

const weekPinSchema = z
  .object({
    huddle: slugSchema.optional(),
    include: z.array(slugSchema).max(4, "A week can pin at most 4 stories besides the huddle").optional().default([]),
  })
  .strict();

const editorSchema = z
  .object({
    exclude: z.array(slugSchema),
    weeks: z.record(z.string(), weekPinSchema),
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
    const launch = launchWeekStart();
    for (const [start, pin] of Object.entries(data.weeks)) {
      if (!parseIsoDate(start) || weekStart(start) !== start) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["weeks", start], message: `${start} is not a Monday` });
        continue;
      }
      if (start < launch) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weeks", start],
          message: `${start} is before launch week ${launch}`,
        });
      }
      const seen = new Set<string>();
      const slugs = [...(pin.huddle ? [pin.huddle] : []), ...pin.include];
      for (const slug of slugs) {
        if (seen.has(slug)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["weeks", start],
            message: `${slug} is listed twice in ${start}`,
          });
        }
        seen.add(slug);
        if (seenExclude.has(slug)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["weeks", start],
            message: `${slug} is both pinned and excluded`,
          });
        }
      }
    }
  });

export type CoachesWeekPin = z.infer<typeof weekPinSchema>;
export type CoachesEditorConfig = z.infer<typeof editorSchema>;

export type CoachCandidate = {
  slug: string;
  title: string;
  shortTitle?: string;
  emphasis?: string;
  dek: string;
  date: string;
  body?: string;
  city: string;
  country: string;
  state?: string;
  place?: string;
  category: string;
  tags?: string[];
  sourceName: string;
  sourceUrl: string;
  image: string;
  imageAlt: string;
  imageCaption?: string;
  correction?: string;
  kidFriendly?: boolean;
  kidSummary?: string;
  kidQuestions?: string[];
  howToHelp?: { label: string; url: string; kind: string }[];
  draft?: boolean;
  imageTreatment?: "none" | "warm";
};

export type CoachStoryCard<T extends CoachCandidate = CoachCandidate> = {
  story: T;
  role: "huddle" | "more";
  fromArchive: boolean;
  summary: string;
  summarySource: "kidSummary" | "dek";
  readAloudLabel: string;
  questions: string[];
  questionSource: "story" | "prompts";
  challenge: string;
  challengeSource: "howToHelp" | "prompt";
};

export type CoachPack<T extends CoachCandidate = CoachCandidate> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  coachNote: string;
  stories: CoachStoryCard<T>[];
  archiveCount: number;
  image?: string;
  imageAlt?: string;
  latest: string;
  plainText: string;
  html: string;
};

export function coachesPackPath(start: string): string {
  return `${COACHES_INDEX_PATH}/${start}`;
}

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

function haystack(story: CoachCandidate): string {
  return scrub(
    [
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
      ...(story.tags ?? []).map((tag) => tag.replaceAll("-", " ")),
    ]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join("\n"),
    story.sourceName,
  );
}

function leadText(story: CoachCandidate): string {
  return scrub([story.title, story.dek, story.kidSummary].filter(Boolean).join("\n"), story.sourceName);
}

/** Why a story cannot be read to a youth team, or undefined when it can. */
export function coachesBlockReason(story: CoachCandidate): string | undefined {
  const heavy = heavyNewsReason(story);
  if (heavy) {
    if (/force|taser|pepper|officer-involved/i.test(heavy)) return "use-of-force";
    if (POLITICS_WORD.test(heavy)) return "politics";
    return "violence";
  }
  const full = haystack(story);
  if (FORCE.test(full)) return "use-of-force";
  if (VIOLENCE.test(full)) return "violence";
  if (GAMBLING.test(full)) return "gambling";
  if (SCANDAL.test(full)) return "scandal";
  const clearedDeath = full.replace(DEATH_CLEAR, " ");
  if (DEATH.test(clearedDeath)) return "death";
  const clearedInjury = full.replace(INJURY_CLEAR, " ");
  if (INJURY.test(clearedInjury)) return "injury";
  return undefined;
}

function tagSet(story: CoachCandidate): Set<string> {
  return new Set(story.tags ?? []);
}

/** Sportsmanship, teamwork, kids helping, inclusive play, or community spirit. */
export function isCoachTheme(story: CoachCandidate): boolean {
  const tags = tagSet(story);
  for (const tag of STRONG_TAGS) {
    if (tags.has(tag)) return true;
  }
  const lead = leadText(story);
  if (SPORT_TEXT.test(lead)) return true;
  if (KIDS_TEXT.test(lead) && VIRTUE_TEXT.test(lead)) return true;
  if (story.kidFriendly && [...SPIRIT_TAGS].some((tag) => tags.has(tag))) return true;
  if (tags.has("kindness") || tags.has("neighbors") || tags.has("kids") || tags.has("students")) return true;
  return false;
}

export function themeScore(story: CoachCandidate): number {
  const tags = tagSet(story);
  let score = 0;
  if (tags.has("youth-sports")) score += 20;
  if (tags.has("inclusion")) score += 6;
  if (tags.has("running") || tags.has("bikes") || tags.has("playgrounds")) score += 5;
  if (tags.has("kids") || tags.has("students")) score += 4;
  if (tags.has("kindness") || tags.has("neighbors")) score += 3;
  if (story.kidFriendly) score += 5;
  if (story.kidSummary?.trim()) score += 3;
  const lead = leadText(story);
  if (SPORT_TEXT.test(lead)) score += 6;
  if (VIRTUE_TEXT.test(lead)) score += 3;
  if (KIDS_TEXT.test(lead)) score += 2;
  return score;
}

function compareFit<T extends CoachCandidate>(a: T, b: T): number {
  const score = themeScore(b) - themeScore(a);
  if (score) return score;
  const aKid = a.kidFriendly ? 1 : 0;
  const bKid = b.kidFriendly ? 1 : 0;
  if (aKid !== bKid) return bKid - aKid;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

export function readAloudLabel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.min(3, Math.max(1, Math.round(words / 180)));
  return minutes === 1 ? "About a 1-minute read-aloud" : `About a ${minutes}-minute read-aloud`;
}

export function huddleSummary(story: CoachCandidate): { text: string; source: "kidSummary" | "dek" } {
  const summary = story.kidSummary?.trim();
  if (summary) return { text: summary, source: "kidSummary" };
  return { text: story.dek.trim(), source: "dek" };
}

export function huddleQuestions(story: CoachCandidate): { questions: string[]; source: "story" | "prompts" } {
  const fromStory = (story.kidQuestions ?? []).map((question) => question.trim()).filter(Boolean).slice(0, 3);
  if (fromStory.length >= 2) return { questions: fromStory, source: "story" };
  return { questions: [...COACH_PROMPTS], source: "prompts" };
}

export function freeChallenge(slug: string): string {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) hash = (hash * 33 + slug.charCodeAt(index)) >>> 0;
  return FREE_CHALLENGES[hash % FREE_CHALLENGES.length] ?? FREE_CHALLENGES[0];
}

export function teamChallenge(story: CoachCandidate): { text: string; source: "howToHelp" | "prompt" } {
  const link = (story.howToHelp ?? []).find((item) => item.kind === "thank" || item.kind === "volunteer");
  const label = link?.label.trim();
  if (label) {
    return {
      source: "howToHelp",
      text: `The story already lists a way to help: "${label}". If that fits your team, do it together. If it does not, do one free kind thing you can finish before the next practice.`,
    };
  }
  return { source: "prompt", text: freeChallenge(story.slug) };
}

export function buildCoachCard<T extends CoachCandidate>(story: T, role: "huddle" | "more", packStart: string): CoachStoryCard<T> {
  const summary = huddleSummary(story);
  const questions = huddleQuestions(story);
  const challenge = teamChallenge(story);
  return {
    story,
    role,
    fromArchive: weekStart(story.date) !== packStart,
    summary: summary.text,
    summarySource: summary.source,
    readAloudLabel: readAloudLabel(summary.text),
    questions: questions.questions,
    questionSource: questions.source,
    challenge: challenge.text,
    challengeSource: challenge.source,
  };
}

export function emptyCoachesEditorConfig(): CoachesEditorConfig {
  return { exclude: [], weeks: {} };
}

export function parseCoachesEditorConfig(data: unknown): CoachesEditorConfig {
  const result = editorSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`Coaches pack editor file: ${details}`);
  }
  return result.data;
}

export function loadCoachesEditorConfig(): CoachesEditorConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error("Missing data/coaches-pack.json");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    throw new Error("data/coaches-pack.json is not valid JSON");
  }
  return parseCoachesEditorConfig(raw);
}

export function coachesPinErrors<T extends CoachCandidate>(stories: T[], config: CoachesEditorConfig): string[] {
  const errors: string[] = [];
  const bySlug = new Map(stories.filter((story) => !story.draft).map((story) => [story.slug, story]));
  for (const slug of config.exclude) {
    if (!bySlug.has(slug)) errors.push(`exclude ${slug} is not a published story`);
  }
  for (const [start, pin] of Object.entries(config.weeks)) {
    const end = addDays(start, 6);
    const slugs = [...(pin.huddle ? [pin.huddle] : []), ...pin.include];
    for (const slug of slugs) {
      const story = bySlug.get(slug);
      if (!story) {
        errors.push(`${start} pin ${slug} is not a published story`);
        continue;
      }
      if (story.date > end) errors.push(`${slug} is dated ${story.date}, after the week ending ${end}`);
      const reason = coachesBlockReason(story);
      if (reason) errors.push(`${slug} is blocked (${reason}) and cannot be pinned`);
    }
  }
  return errors;
}

function mondaysThrough(today: string): string[] {
  const launch = launchWeekStart();
  const current = weekStart(today);
  const starts: string[] = [];
  for (let cursor = launch; cursor <= current && starts.length < MAX_PRERENDERED_WEEKS; cursor = addDays(cursor, 7)) {
    starts.push(cursor);
  }
  return starts;
}

function take<T extends CoachCandidate>(picked: T[], story: T | undefined) {
  if (!story || picked.length >= COACHES_PACK_MAX) return;
  if (picked.some((item) => item.slug === story.slug)) return;
  picked.push(story);
}

function archiveFill<T extends CoachCandidate>(pool: T[], weekIndex: number, need: number, picked: T[]): T[] {
  if (need <= 0) return [];
  const used = new Set(picked.map((story) => story.slug));
  const ranked = pool.filter((story) => !used.has(story.slug)).sort(compareFit);
  const window = ranked.slice(0, Math.min(ranked.length, 12));
  if (!window.length) return [];
  const start = weekIndex % window.length;
  const rotated = window.slice(start).concat(window.slice(0, start));
  return rotated.slice(0, need);
}

export function selectCoachStories<T extends CoachCandidate>(
  stories: T[],
  start: string,
  config: CoachesEditorConfig,
  weekIndex: number,
): T[] {
  const end = addDays(start, 6);
  const excluded = new Set(config.exclude);
  const safe = stories.filter(
    (story) => !story.draft && story.date >= SITE_LAUNCH && story.date <= end && !excluded.has(story.slug) && !coachesBlockReason(story),
  );
  const themed = safe.filter(isCoachTheme);
  const pin = config.weeks[start];
  const bySlug = new Map(safe.map((story) => [story.slug, story]));
  const picked: T[] = [];
  if (pin?.huddle) take(picked, bySlug.get(pin.huddle));
  for (const slug of pin?.include ?? []) take(picked, bySlug.get(slug));
  const inWeek = themed.filter((story) => story.date >= start && story.date <= end).sort(compareFit);
  for (const story of inWeek) take(picked, story);
  if (picked.length < COACHES_PACK_TARGET) {
    const filler = archiveFill(
      themed.filter((story) => story.date < start),
      weekIndex,
      COACHES_PACK_TARGET - picked.length,
      picked,
    );
    for (const story of filler) take(picked, story);
  }
  return picked;
}

function packIntro<T extends CoachCandidate>(cards: CoachStoryCard<T>[], inProgress: boolean): string {
  if (!cards.length) {
    return inProgress
      ? "No matching story has been published this week yet. The page stays up so the Monday archive does not skip."
      : "No story published through this week matched the coaches list. The page stays up so the Monday archive does not skip.";
  }
  const huddle = cards[0];
  const archive = cards.filter((card) => card.fromArchive).length;
  const count = cards.length;
  const storyWord = count === 1 ? "1 story" : `${count} stories`;
  const fill =
    archive > 0
      ? ` ${archive} ${archive === 1 ? "is" : "are"} from the archive because this week was short.`
      : " All of them ran this week.";
  const open = inProgress ? " Stories published so far." : "";
  return `${storyWord} for a team huddle. The read-aloud is “${huddle?.story.title ?? "the first story"}”.${fill}${open}`;
}

function sharePlain<T extends CoachCandidate>(pack: {
  rangeLabel: string;
  path: string;
  stories: CoachStoryCard<T>[];
}): string {
  const lines = ["Good News for Coaches & Youth Sports", `Week of ${pack.rangeLabel}`, ""];
  if (!pack.stories.length) {
    lines.push("No matching story for this week.", "");
  }
  for (const card of pack.stories) {
    const story = card.story;
    const url = absoluteUrl(`/story/${story.slug}`);
    if (card.role === "huddle") {
      lines.push("Team Huddle", story.title, card.summary, "");
      lines.push("Talk about it");
      card.questions.forEach((question, index) => lines.push(`${index + 1}. ${question}`));
      lines.push("", "Team kindness challenge", card.challenge, "");
    } else {
      lines.push(story.title, story.dek.trim(), "");
    }
    lines.push(`Full story: ${url}`, `Original report: ${story.sourceName}`, story.sourceUrl, "");
  }
  lines.push(
    `Shared from ${siteConfig.name}: ${absoluteUrl(pack.path)}`,
    `${siteConfig.editor.name}. Each note is taken from the story already on ${siteConfig.name}. The original report is credited under each story.`,
  );
  return lines.join("\n");
}

function shareHtml<T extends CoachCandidate>(pack: {
  rangeLabel: string;
  path: string;
  stories: CoachStoryCard<T>[];
}): string {
  const packUrl = absoluteUrl(pack.path);
  const parts = [
    `<p><strong>${escapeHtml("Good News for Coaches & Youth Sports")}</strong><br>${escapeHtml(`Week of ${pack.rangeLabel}`)}</p>`,
  ];
  if (!pack.stories.length) {
    parts.push(`<p>${escapeHtml("No matching story for this week.")}</p>`);
  }
  for (const card of pack.stories) {
    const story = card.story;
    const url = absoluteUrl(`/story/${story.slug}`);
    if (card.role === "huddle") {
      parts.push(`<h2>${escapeHtml(`Team Huddle: ${story.title}`)}</h2>`);
      parts.push(`<p>${escapeHtml(card.summary)}</p>`);
      parts.push(`<ol>${card.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol>`);
      parts.push(`<p><strong>Team kindness challenge.</strong> ${escapeHtml(card.challenge)}</p>`);
    } else {
      parts.push(`<h2>${escapeHtml(story.title)}</h2>`);
      parts.push(`<p>${escapeHtml(story.dek.trim())}</p>`);
    }
    parts.push(
      `<p>Full story: <a href="${escapeHtml(url)}">${escapeHtml(story.title)}</a><br>Original report: <a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(story.sourceName)}</a></p>`,
    );
  }
  parts.push(
    `<p>Shared from <a href="${escapeHtml(packUrl)}">${escapeHtml(siteConfig.name)}</a>. ${escapeHtml(siteConfig.editor.name)}. Each note is taken from the story already on ${escapeHtml(siteConfig.name)}. The original report is credited under each story.</p>`,
  );
  return parts.join("\n");
}

function finishPack<T extends CoachCandidate>(
  start: string,
  stories: T[],
  today: string,
  config: CoachesEditorConfig,
  weekIndex: number,
): CoachPack<T> {
  const selected = selectCoachStories(stories, start, config, weekIndex);
  const cards = selected.map((story, index) => buildCoachCard(story, index === 0 ? "huddle" : "more", start));
  const end = addDays(start, 6);
  const inProgress = start === weekStart(today);
  const rangeLabel = formatWeekRange(start, end);
  const photo = cards[0]?.story;
  const latest = cards.reduce((max, card) => (card.story.date > max ? card.story.date : max), start);
  const archiveCount = cards.filter((card) => card.fromArchive).length;
  const countLabel = cards.length === 1 ? "1 story" : `${cards.length} stories`;
  const shell = { rangeLabel, path: coachesPackPath(start), stories: cards };
  return {
    start,
    end,
    path: shell.path,
    inProgress,
    rangeLabel,
    title: inProgress
      ? `Good News for Coaches This Week, So Far: ${rangeLabel}`
      : `Good News for Coaches This Week: ${rangeLabel}`,
    heading: inProgress ? "Team Huddle for this week, so far." : "Team Huddle for this week.",
    description: cards.length
      ? `${countLabel} of good news for coaches and youth sports this week (${rangeLabel}). A Team Huddle read-aloud, discussion questions, and a team kindness challenge.`
      : `Good news for coaches and youth sports, week of ${rangeLabel}. No matching story was published through this Monday.`,
    intro: packIntro(cards, inProgress),
    coachNote: COACHES_NOTE,
    stories: cards,
    archiveCount,
    image: photo?.image,
    imageAlt: photo?.imageAlt,
    latest,
    plainText: sharePlain(shell),
    html: shareHtml(shell),
  };
}

/** One pack per Monday from launch through the open week, oldest first. */
export function buildCoachesPacks<T extends CoachCandidate>(
  stories: T[],
  today = mountainDay(),
  config: CoachesEditorConfig = emptyCoachesEditorConfig(),
): CoachPack<T>[] {
  return mondaysThrough(today).map((start, index) => finishPack(start, stories, today, config, index));
}

let cache: CoachPack<Story>[] | null = null;

export function getCoachesPacks(): CoachPack<Story>[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const stories = getPublishedStories();
  const config = loadCoachesEditorConfig();
  const errors = coachesPinErrors(stories, config);
  if (errors.length) {
    throw new Error(`Coaches pack pins failed:\n- ${errors.join("\n- ")}`);
  }
  const packs = buildCoachesPacks(stories, mountainDay(), config);
  cache = packs;
  return packs;
}

export function coachPacksToPrerender(packs = getCoachesPacks()): CoachPack<Story>[] {
  if (packs.length <= MAX_PRERENDERED_WEEKS) return packs;
  return packs
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}
