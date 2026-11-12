/**
 * Good News for Teens.
 * One static page per Monday-start week (America/Denver edition dates),
 * the same week key as /week. The path is /teens/{Monday}.
 *
 * A week is built from published stories about teens, students, and young
 * adults making a difference. The safety filter runs first. Editor pins can
 * add a story the keyword filter missed. They cannot add a story the safety
 * filter blocked. An exclude slug stays off every week.
 *
 * Fewer than three matches borrows recent archive stories and labels them.
 * A week with nothing to show stays a short page. Nothing is invented.
 *
 * Editor file: data/teens.json.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { heavyNewsReason } from "./news-break";
import { placeLabel } from "./present";
import { absoluteUrl } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { escapeHtml } from "./tip-mail";
import {
  MAX_PRERENDERED_WEEKS,
  addDays,
  formatLongDate,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";
import { siteConfig } from "@/site.config";

export const TEENS_INDEX_PATH = "/teens";
export const TEENS_INDEX_TITLE = "Good News for Teens";
export const TEENS_INDEX_DESCRIPTION =
  "Free weekly good news for teens, student councils, and youth clubs. Verified stories, club ideas, discussion prompts, and a newsletter you can copy.";

export const SERVICE_HOURS_PATH = "/service-hours";
export const SERVICE_HOURS_TITLE = "Service Hours Reflection";
export const SERVICE_HOURS_DESCRIPTION =
  "A free printable reflection log for volunteer and service-learning hours. It stays in the browser. Schools and clubs decide what counts. This site does not certify hours.";

export const TEEN_STORY_MIN = 3;
export const TEEN_STORY_MAX = 6;

export const TEEN_TAGS = ["students", "youth-sports", "scholarships"] as const;

const CONFIG_PATH = path.join(process.cwd(), "data", "teens.json");

const SAFE_PHRASES = [
  /democratic republic/gi,
  /democrat-gazette/gi,
  /times[-\s]+republican/gi,
  /cynthiana democrat/gi,
  /library of congress/gi,
];

const POLITICS_WORD =
  /elect|democrat|republican|congress|politic|ballot|senate|partisan|\bgop\b|impeach|caucus|referendum|legislat|incumbent|white house|oval office/i;

const VIOLENCE =
  /\b(?:violence|violent|assault(?:ed|s)?|stabb(?:ed|ing|s)?|murders?|murdered|homicides?|shootings?|gunfire|gunshots?|gunmen|gunman|shots fired|opened fire|terror(?:ist|ism)?|abuse(?:d|s)?|abusive|weapons?|firearms?|handguns?|rifles?|pistols?|guns?|(?<!seed )bombs?|bombings?|wars?|warfare)\b/i;

const FORCE =
  /\b(?:use of force|use-of-force|used force|excessive force|brutality|tasers?|tasered|pepper[- ]spray|officer-involved|lethal force)\b/i;

const CRIME =
  /\b(?:arrested|under arrest|taken into custody|charged with|indict(?:ed|ment)|convicted|burglar(?:y|ies)|robber(?:y|ies)|thefts?|stolen|jail(?:ed)?|prisons?|inmates?|criminals?|felon(?:y|ies)?|\bcrimes?\b|suspects?)\b/i;

const SELF_HARM = /\b(?:self-harm|self harm|suicid(?:e|al|es)?)\b/i;

const GAMBLING =
  /\b(?:gambl\w*|sportsbooks?|wagers?|wagered|wagering|betting|casino night|at a casino|at the casino)\b/i;

const SCANDAL =
  /\b(?:scandals?|misconduct|lawsuits?|sued|accused of|corruption|embezzl\w*|cover-ups?|doping|steroids?|bribes?|bribery|bribed)\b/i;

const SUBSTANCE =
  /\b(?:opioids?|fentanyl|heroin|cocaine|methamphetamine|marijuana|cannabis|vaping|vapes?|e-cigarettes?|drunken|drunk driving|alcoholism|underage drinking|drug abuse|substance abuse|illegal drugs|overdoses?)\b/i;

const DEATH_CLEAR =
  /\b(?:no one|nobody)\s+(?:was\s+|were\s+)?(?:killed|died)|\b(?:was|were)\s+not\s+(?:killed|died)|\b(?:nearly|almost|would have|could have)\s+(?:been\s+)?(?:killed|died)|\bphone died\b/gi;

const DEATH =
  /\b(?:killed|killing|deaths?|died(?!\s+out)|fatalit(?:y|ies)|fatal|perished|passed away|funerals?|obituaries|obituary|cancer)\b/i;

const INJURY_CLEAR =
  /\b(?:no one|nobody)\s+(?:was\s+|were\s+)?injur\w*|\b(?:was|were|is|are)\s+not\s+injur\w*|\b(?:wasn'?t|weren'?t)\s+injur\w*|\bwithout\s+(?:an?\s+|any\s+)?injur\w*|\bno\s+injur\w*/gi;

const INJURY =
  /\b(?:injur(?:y|ies|ed)|fractures?|fractured|concussions?|concussed|broken (?:arm|leg|wrist|ankle|bone|rib|ribs|collarbone)|hospitalized|cardiac arrest|no pulse|not breathing|wasn'?t breathing|weren'?t breathing|stopped breathing|unconscious|unresponsive)\b/i;

const HIGH_SCHOOL_NAME =
  /\b[A-Z][\w'.-]{2,} High\b(?!\s+(?:Country|Court|Street|Road|Avenue|Way|Point|Desert|Plains|Chaparral)\b)/;

/** "Caldera High students" is a high school even when the word "school" is left out. "High Country" is not. */
function mentionsHighSchool(text: string): boolean {
  return /\bhigh[- ]schools?\b/i.test(text) || HIGH_SCHOOL_NAME.test(text);
}

const LEAD_KEYWORD =
  /\b(?:teens?|teenagers?|teenage|middle[- ]schools?|youths?|students?)\b/i;

const STRONG_BODY = /\b(?:teens?|teenagers?|teenage|high[- ]schools?)\b/i;

const OLDER_ACTOR =
  /\b(?:teens?|teenagers?|teenage|middle[- ]schools?|(?:sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|6th|7th|8th|9th|10th|11th|12th)[- ]graders?)\b/i;

const ELEMENTARY_SUBJECT =
  /\b(?:kindergarten|kindergartners?|preschool|pre-k|elementary|primary school|(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)[- ]grade(?:rs?)?|(?:[1-9]|1[0-2])[- ]year[- ]old)(?:\s+\w+){0,3}\s+students?\b|\bstudents?\b(?:\s+\w+){0,4}\s+(?:in\s+)?(?:kindergarten|elementary|(?:first|second|third|fourth|fifth)[- ]grade)/i;

const YOUNG_ONLY =
  /\b(?:kindergarten|kindergartners?|preschool|pre-k|elementary(?: school)?|primary school|(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)[- ]graders?|(?:[1-9]|1[0-2])[- ]year[- ]olds?|toddlers?)\b/i;

const ACTOR =
  /\b(?:built|invented|designed|raised|collected|delivered|donated|cooked|planted|packed|flew|won|campaigned|visited|stocked|made|turned|cheered|served|launched|organized|volunteered|rescued|rescuing|founded|started|hosted|competed|earned|created|gathered|filled)\b/i;

const RECIPIENT = /\b(?:received|got new|were given|was given|donated to|handed out to)\b/i;

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

const editorSchema = z
  .object({
    exclude: z.array(slugSchema),
    weeks: z.record(z.string(), z.array(slugSchema)),
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
    for (const [start, pins] of Object.entries(data.weeks)) {
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
      for (const slug of pins) {
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

export type TeenEditorConfig = z.infer<typeof editorSchema>;

export type TeenCandidate = {
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
  kidSummary?: string;
  kidQuestions?: string[];
  draft?: boolean;
  imageTreatment?: "none" | "warm";
};

export type TeenPick<T extends TeenCandidate = TeenCandidate> = {
  story: T;
  pinned: boolean;
  fromArchive: boolean;
  roleLabel: string;
};

export type TeenMove = {
  id: string;
  title: string;
  detail: string;
  permission: string;
};

export type TeenEdition<T extends TeenCandidate = TeenCandidate> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  shortPage: boolean;
  stories: TeenPick<T>[];
  weekCount: number;
  archiveCount: number;
  moves: TeenMove[];
  prompts: string[];
  newsletterText: string;
  newsletterHtml: string;
  image?: string;
  imageAlt?: string;
  latest?: string;
};

export type TeenBuild<T extends TeenCandidate = TeenCandidate> = {
  editions: TeenEdition<T>[];
  pinErrors: string[];
};

type MoveTemplate = TeenMove & {
  matches: (story: TeenCandidate) => boolean;
};

function leadOf(story: TeenCandidate): string {
  return `${story.title}\n${story.dek}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function teenHaystack(story: TeenCandidate): string {
  let text = [story.title, story.shortTitle, story.emphasis, story.dek, story.body, story.correction, story.imageAlt, story.imageCaption, story.kidSummary, ...(story.kidQuestions ?? []), ...(story.tags ?? []).map((tag) => tag.replaceAll("-", " "))]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join("\n");
  const source = story.sourceName?.trim();
  if (source) text = text.replace(new RegExp(escapeRegExp(source), "gi"), " ");
  for (const phrase of SAFE_PHRASES) text = text.replace(phrase, " ");
  return text;
}

/** Why a story stays off the teen pages, or undefined when it may be considered. */
export function teenBlockReason(story: TeenCandidate): string | undefined {
  const heavy = heavyNewsReason(story);
  if (heavy) {
    if (POLITICS_WORD.test(heavy)) return "politics";
    return "violence";
  }
  const full = teenHaystack(story);
  if (SELF_HARM.test(full)) return "self-harm";
  if (FORCE.test(full)) return "violence";
  if (VIOLENCE.test(full)) return "violence";
  if (CRIME.test(full)) return "crime";
  if (GAMBLING.test(full)) return "gambling";
  if (SCANDAL.test(full)) return "scandal";
  if (SUBSTANCE.test(full)) return "substance";
  if (DEATH.test(full.replace(DEATH_CLEAR, " "))) return "death";
  if (INJURY.test(full.replace(INJURY_CLEAR, " "))) return "injury";
  return undefined;
}

function hasTeenTag(story: TeenCandidate): boolean {
  return (story.tags ?? []).some((tag) => (TEEN_TAGS as readonly string[]).includes(tag));
}

/** Elementary and younger-child stories stay on the kids pages. */
export function teenTooYoung(story: TeenCandidate): boolean {
  const lead = leadOf(story);
  if (OLDER_ACTOR.test(lead) || mentionsHighSchool(lead)) return false;
  if (/\b(?:kindergarten|kindergartners?|preschool|pre-k|elementary(?: school)?|primary school|(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)[- ]graders?)\b/i.test(lead)) {
    return true;
  }
  if (ELEMENTARY_SUBJECT.test(lead)) return true;
  if (YOUNG_ONLY.test(lead) && !/\bstudents?\b/i.test(lead)) return true;
  if (/\b(?:children|child|kids)\b/i.test(story.title) && !LEAD_KEYWORD.test(lead)) return true;
  return false;
}

/**
 * Tags or lead keywords for teens, students, high school, or youth.
 * A high-school or teen mention in the body still counts. The broad word
 * "student" in the body does not, so a passing reference is not enough.
 */
export function teenIdentity(story: TeenCandidate): boolean {
  if (story.draft || teenBlockReason(story) || teenTooYoung(story)) return false;
  const lead = leadOf(story);
  if (hasTeenTag(story) || LEAD_KEYWORD.test(lead) || mentionsHighSchool(lead)) return true;
  return STRONG_BODY.test(story.body ?? "");
}

export function teenQuality(story: TeenCandidate): number {
  const lead = leadOf(story);
  let score = 0;
  if (/\b(?:teens?|teenagers?|teenage)\b/i.test(story.title) || mentionsHighSchool(story.title)) score += 8;
  else if (/\b(?:teens?|teenagers?|teenage)\b/i.test(story.dek) || mentionsHighSchool(story.dek)) score += 5;
  if (OLDER_ACTOR.test(story.title)) score += 6;
  if (/\byouths?\b/i.test(lead)) score += 3;
  if (/\bstudents?\b/i.test(lead)) score += 2;
  if (/\bmiddle[- ]schools?\b/i.test(lead)) score += 2;
  const tags = story.tags ?? [];
  if (tags.includes("students")) score += 2;
  if (tags.includes("youth-sports")) score += 2;
  if (tags.includes("scholarships")) score += 3;
  if (/\bscholarships?\b/i.test(lead)) score += 2;
  if (ACTOR.test(lead)) score += 6;
  if (YOUNG_ONLY.test(lead)) score -= 8;
  if (RECIPIENT.test(lead) && !ACTOR.test(lead)) score -= 4;
  return score;
}

function compareTeen<T extends TeenCandidate>(a: T, b: T): number {
  const score = teenQuality(b) - teenQuality(a);
  if (score) return score;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

function gradeWho(lead: string): string | undefined {
  const grade = lead.match(/\b(eighth|ninth|tenth|eleventh|twelfth|8th|9th|10th|11th|12th)[- ]grader\b/i);
  if (!grade) return undefined;
  const word = grade[1].toLowerCase();
  const article = word === "8th" || word === "eighth" || word === "11th" || word === "eleventh" ? "An" : "A";
  return `${article} ${word}-grader`;
}

/** A role and place, with no name added beyond the published story. */
export function teenRoleLabel(story: Pick<TeenCandidate, "title" | "dek" | "city" | "state" | "place" | "country">): string {
  const lead = `${story.title}\n${story.dek}`;
  const graded = gradeWho(lead);
  let who = "Students";
  if (graded) who = graded;
  else if (mentionsHighSchool(lead)) who = "High school students";
  else if (/\bmiddle[- ]schools?\b/i.test(lead)) who = "Middle school students";
  else if (/\b(?:college|university) students?\b/i.test(lead)) who = "College students";
  else if (/\b(?:teens?|teenagers?|teenage)\b/i.test(lead)) who = "Teens";
  else if (/\byouths?\b/i.test(lead)) who = "Young people";
  return `${who} in ${placeLabel(story)}`;
}

function storyBlob(story: TeenCandidate): string {
  return `${story.title}\n${story.dek}\n${(story.tags ?? []).join(" ")}\n${story.category}`;
}

export const TEEN_MOVES: readonly MoveTemplate[] = [
  {
    id: "thank-staff",
    title: "Write five thank-you notes",
    detail: "As a club, write short notes to cafeteria staff, custodians, or bus drivers. Deliver them together at school.",
    permission: "Ask a club adviser or teacher before you hand notes out during the school day.",
    matches: (story) => /\b(?:kindness|schools|teachers|volunteers)\b/i.test(storyBlob(story)),
  },
  {
    id: "food-drive",
    title: "Run a one-week food drive",
    detail: "Collect sealed, unopened food in a labeled box at school. An adviser takes it to a food bank the school already works with.",
    permission: "Get school permission for the box. Go with an adviser or a parent. Do not knock on doors.",
    matches: (story) => /\b(?:food-banks|community-meals|school-lunch|food)\b/i.test(storyBlob(story)),
  },
  {
    id: "campus-cleanup",
    title: "Do a 45-minute cleanup",
    detail: "Pick up litter on school grounds or at a park your adviser chooses. Use gloves if the school has them.",
    permission: "Stay with the group. Leave campus only with a parent or adviser.",
    matches: (story) => /\b(?:cleanups|parks|rivers|trees|trails)\b/i.test(storyBlob(story)),
  },
  {
    id: "shelter-supplies",
    title: "Collect shelter supplies",
    detail: "Ask a shelter what it needs, such as towels or unopened food, and collect only that.",
    permission: "An adviser contacts the shelter. Do not handle animals unless the shelter invites a supervised visit.",
    matches: (story) => /\b(?:animal-rescue|dogs|cats|pet-adoption|animals)\b/i.test(storyBlob(story)),
  },
  {
    id: "study-table",
    title: "Host a free study table",
    detail: "Open a supervised table for classmates who want help with a class you know. Do not charge.",
    permission: "Use a room an adult has opened. Keep it at school.",
    matches: (story) => /\b(?:scholarships|stem|literacy|schools|science)\b/i.test(storyBlob(story)),
  },
  {
    id: "sportsmanship",
    title: "Send sportsmanship notes",
    detail: "After a game, write a short note to a referee, an opponent, or a teammate who helped someone.",
    permission: "Ask your coach before you send anything to another school.",
    matches: (story) => /\b(?:youth-sports|running|sports?|team)\b/i.test(storyBlob(story)),
  },
  {
    id: "book-share",
    title: "Restock a free book shelf",
    detail: "Bring books you already own and are allowed to give away. Leave them where a librarian tells you.",
    permission: "Check with the librarian before you set anything out.",
    matches: (story) => /\b(?:libraries|literacy|little-free-libraries|books?)\b/i.test(storyBlob(story)),
  },
  {
    id: "cards-for-helpers",
    title: "Make cards for helpers",
    detail: "Make cards thanking firefighters, medics, or veterans for a specific kind of help. No personal questions, and no last names of students.",
    permission: "An adviser delivers the cards. Do not visit a station on your own, and do not collect contact information.",
    matches: (story) => /\b(?:veterans|first-responders|firefighters|ems|police)\b/i.test(storyBlob(story)),
  },
  {
    id: "science-demo",
    title: "Run a lunchtime demo",
    detail: "Show a project you already built for class, or explain one story from this page, at a table a teacher supervises.",
    permission: "Use only materials a teacher has already approved. No flames, and no chemicals the school has not allowed.",
    matches: (story) => /\b(?:stem|science|invent)\b/i.test(storyBlob(story)),
  },
  {
    id: "garden-hour",
    title: "Give one hour in a school garden",
    detail: "Weed, water, or harvest in a garden the school already runs. Take produce only where the garden says it should go.",
    permission: "Ask the garden sponsor first. No power tools.",
    matches: (story) => /\b(?:community-garden|farming|trees|gardens?)\b/i.test(storyBlob(story)),
  },
  {
    id: "peer-welcome",
    title: "Welcome a new student",
    detail: "With a counselor or adviser, offer a campus tour or a lunch seat. Do not post about another student online.",
    permission: "The school decides who is asked. Do not share another student's name, grade, or photo.",
    matches: (story) => /\b(?:inclusion|schools)\b/i.test(storyBlob(story)),
  },
  {
    id: "share-story",
    title: "Read one story in a club meeting",
    detail: "Spend ten minutes of a meeting on one story from this page. Say the original newsroom and this site out loud, then pick one action above.",
    permission: "Club time only. Do not ask members to share medical or personal stories.",
    matches: () => false,
  },
];

export function teenMoves(stories: TeenCandidate[]): TeenMove[] {
  const ranked = TEEN_MOVES.map((move) => ({
    move,
    hits: stories.reduce((count, story) => count + (move.matches(story) ? 1 : 0), 0),
  })).sort((a, b) => b.hits - a.hits || a.move.id.localeCompare(b.move.id));
  const picked: TeenMove[] = [];
  for (const row of ranked) {
    if (row.hits < 1 || picked.length >= 3) continue;
    picked.push({ id: row.move.id, title: row.move.title, detail: row.move.detail, permission: row.move.permission });
  }
  for (const id of ["thank-staff", "share-story"]) {
    if (picked.length >= 2) break;
    const move = TEEN_MOVES.find((item) => item.id === id);
    if (!move || picked.some((item) => item.id === move.id)) continue;
    picked.push({ id: move.id, title: move.title, detail: move.detail, permission: move.permission });
  }
  return picked.slice(0, 3);
}

export function teenPrompts(stories: TeenCandidate[]): string[] {
  const text = stories.map(storyBlob).join("\n");
  const prompts = [
    "Pick one story. What did the students or teens actually do, and who was it for?",
    "What would a club need permission for before trying something similar, and who would you ask?",
  ];
  if (/\b(?:youth-sports|sportsmanship|teams?|games?)\b/i.test(text)) {
    prompts.push("Where could your team show the same kind of sportsmanship this week, without spending money?");
  } else if (/\bscholarships?\b|\bstem\b/i.test(text)) {
    prompts.push("What work are students at your school already doing that is worth noticing?");
  } else {
    prompts.push("Which of these could a student council, Key Club, or NHS chapter try this month at little or no cost?");
  }
  return prompts;
}

export function teenPath(start: string): string {
  return `${TEENS_INDEX_PATH}/${start}`;
}

export function serviceHoursHref(start?: string): string {
  if (!start) return SERVICE_HOURS_PATH;
  return `${SERVICE_HOURS_PATH}?week=${start}`;
}

function newsletterFor<T extends TeenCandidate>(edition: {
  start: string;
  rangeLabel: string;
  stories: TeenPick<T>[];
  moves: TeenMove[];
}): { text: string; html: string } {
  const pageUrl = absoluteUrl(teenPath(edition.start));
  const hoursUrl = absoluteUrl(serviceHoursHref(edition.start));
  const lines = [
    `Good news for teens, week of ${edition.rangeLabel}`,
    "",
    `From ${siteConfig.name} (${pageUrl}). Summaries are from the original reports. ${siteConfig.name} did not report these firsthand.`,
    "",
  ];
  if (!edition.stories.length) {
    lines.push("No matching story was published for this week. This note does not add one.");
  }
  edition.stories.forEach((pick, index) => {
    const story = pick.story;
    const storyUrl = absoluteUrl(`/story/${story.slug}`);
    const archive = pick.fromArchive ? ` (From the recent archive, published ${formatLongDate(story.date)}.)` : "";
    lines.push(`${index + 1}. ${story.title}${archive}`);
    lines.push(pick.roleLabel);
    lines.push(story.dek.trim());
    lines.push(`Source: ${story.sourceName} — ${story.sourceUrl}`);
    lines.push(`On ${siteConfig.name}: ${storyUrl}`);
    lines.push("");
  });
  if (edition.moves.length) {
    lines.push("Your move:");
    for (const move of edition.moves) lines.push(`- ${move.title}. ${move.detail} ${move.permission}`);
    lines.push("");
  }
  lines.push(`Service hours reflection (stays in the browser): ${hoursUrl}`);
  lines.push(`${siteConfig.editor.name} · ${siteConfig.owner.name}`);
  const text = lines.join("\n").trim();

  const items = edition.stories
    .map((pick) => {
      const story = pick.story;
      const storyUrl = absoluteUrl(`/story/${story.slug}`);
      const archive = pick.fromArchive
        ? `<p><em>From the recent archive, published ${escapeHtml(formatLongDate(story.date))}.</em></p>`
        : "";
      return `<li><a href="${escapeHtml(storyUrl)}">${escapeHtml(story.title)}</a>${archive}<p>${escapeHtml(pick.roleLabel)}</p><p>${escapeHtml(story.dek.trim())}</p><p>Source: <a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(story.sourceName)}</a></p></li>`;
    })
    .join("");
  const moveHtml = edition.moves.length
    ? `<h2>Your move</h2><ul>${edition.moves
        .map((move) => `<li><strong>${escapeHtml(move.title)}.</strong> ${escapeHtml(move.detail)} ${escapeHtml(move.permission)}</li>`)
        .join("")}</ul>`
    : "";
  const empty = edition.stories.length ? "" : "<p>No matching story was published for this week. This note does not add one.</p>";
  const html = `<article><h1>Good news for teens, week of ${escapeHtml(edition.rangeLabel)}</h1><p>From <a href="${escapeHtml(pageUrl)}">${escapeHtml(siteConfig.name)}</a>. Summaries are from the original reports. ${escapeHtml(siteConfig.name)} did not report these firsthand.</p>${empty}<ol>${items}</ol>${moveHtml}<p><a href="${escapeHtml(hoursUrl)}">Service hours reflection</a>. It stays in the browser.</p><p>${escapeHtml(siteConfig.editor.name)} · ${escapeHtml(siteConfig.owner.name)}</p></article>`;
  return { text, html };
}

export function emptyTeenEditorConfig(): TeenEditorConfig {
  return { exclude: [], weeks: {} };
}

export function parseTeenEditorConfig(value: unknown): TeenEditorConfig {
  const result = editorSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`Teen hub editor file: ${details}`);
  }
  return result.data;
}

export function loadTeenEditorConfig(): TeenEditorConfig {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error("Missing data/teens.json");
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    throw new Error("data/teens.json is not valid JSON");
  }
  return parseTeenEditorConfig(raw);
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

function toPick<T extends TeenCandidate>(story: T, start: string, pinned: boolean): TeenPick<T> {
  const fromArchive = weekStart(story.date) !== start;
  return { story, pinned, fromArchive, roleLabel: teenRoleLabel(story) };
}

export function teenPinErrors<T extends TeenCandidate>(stories: T[], config: TeenEditorConfig): string[] {
  const errors: string[] = [];
  const bySlug = new Map(stories.filter((story) => !story.draft).map((story) => [story.slug, story]));
  for (const slug of config.exclude) {
    if (!bySlug.has(slug)) errors.push(`exclude ${slug} is not a published story`);
  }
  for (const [start, pins] of Object.entries(config.weeks)) {
    const end = addDays(start, 6);
    for (const slug of pins) {
      const story = bySlug.get(slug);
      if (!story) {
        errors.push(`${start} pin ${slug} is not a published story`);
        continue;
      }
      if (story.date > end) errors.push(`${slug} is dated ${story.date}, after the week ending ${end}`);
      const reason = teenBlockReason(story);
      if (reason) errors.push(`${slug} is blocked (${reason}) and cannot be pinned`);
    }
  }
  return errors;
}

export function buildTeenEditions<T extends TeenCandidate>(
  stories: T[],
  config: TeenEditorConfig,
  today = mountainDay(),
): TeenBuild<T> {
  const pinErrors = teenPinErrors(stories, config);
  const excluded = new Set(config.exclude);
  const published = stories.filter((story) => !story.draft);
  const bySlug = new Map(published.map((story) => [story.slug, story]));
  const matching = published.filter((story) => !excluded.has(story.slug) && teenIdentity(story));
  const editions: TeenEdition<T>[] = [];

  for (const start of mondaysThrough(today)) {
    const end = addDays(start, 6);
    const pinSlugs = config.weeks[start] ?? [];
    const pinned: T[] = [];
    for (const slug of pinSlugs) {
      const story = bySlug.get(slug);
      if (!story || story.date > end || teenBlockReason(story)) continue;
      pinned.push(story);
    }
    const pinnedIds = new Set(pinned.map((story) => story.slug));
    const room = Math.max(0, TEEN_STORY_MAX - pinned.length);
    const weekStories = matching
      .filter((story) => weekStart(story.date) === start && !pinnedIds.has(story.slug))
      .sort(compareTeen)
      .slice(0, room);
    const chosen = [...pinned, ...weekStories];
    const chosenIds = new Set(chosen.map((story) => story.slug));
    let archive: T[] = [];
    if (chosen.length < TEEN_STORY_MIN) {
      archive = matching
        .filter((story) => weekStart(story.date) < start && !chosenIds.has(story.slug))
        .sort((a, b) => (a.date === b.date ? compareTeen(a, b) : a.date < b.date ? 1 : -1))
        .slice(0, TEEN_STORY_MIN - chosen.length);
    }
    const picks = [
      ...pinned.map((story) => toPick(story, start, true)),
      ...weekStories.map((story) => toPick(story, start, false)),
      ...archive.map((story) => toPick(story, start, false)),
    ];
    const inProgress = start === weekStart(today);
    const rangeLabel = formatWeekRange(start, end);
    const weekCount = picks.filter((pick) => !pick.fromArchive).length;
    const archiveCount = picks.filter((pick) => pick.fromArchive).length;
    const moves = teenMoves(picks.map((pick) => pick.story));
    const prompts = teenPrompts(picks.map((pick) => pick.story));
    const shortPage = picks.length < TEEN_STORY_MIN;
    const photo = picks[0]?.story;
    const latest = picks.reduce<string | undefined>((max, pick) => (!max || pick.story.date > max ? pick.story.date : max), undefined);
    const count = picks.length;
    const storyWord = count === 1 ? "story" : "stories";
    let intro: string;
    if (count === 0) {
      intro = "No story this week matched the teen filter. This page does not add a story to fill the gap.";
    } else if (archiveCount > 0) {
      intro = `${weekCount} ${weekCount === 1 ? "story" : "stories"} from this week. ${archiveCount} more, labeled below, ${archiveCount === 1 ? "is" : "are"} from recent weeks. Nothing here was written to fill the page.`;
    } else {
      intro = `${weekCount} ${storyWord} about young people making a difference this week.${inProgress ? " Stories published so far." : ""}`;
    }
    const description =
      count === 0
        ? `Good news for teens, week of ${rangeLabel}. No matching story was published, and this page does not invent one.`
        : `${count} verified ${storyWord} for teens, student councils, and youth clubs (${rangeLabel}). Club ideas, discussion prompts, and a newsletter you can copy.`;
    const draft = {
      start,
      rangeLabel,
      stories: picks,
      moves,
    };
    const newsletter = newsletterFor(draft);
    editions.push({
      start,
      end,
      path: teenPath(start),
      inProgress,
      rangeLabel,
      title: inProgress ? `Good News for Teens, So Far: ${rangeLabel}` : `Good News for Teens: ${rangeLabel}`,
      heading: inProgress ? "Good news for teens, so far." : "Good news for teens.",
      description,
      intro,
      shortPage,
      stories: picks,
      weekCount,
      archiveCount,
      moves,
      prompts,
      newsletterText: newsletter.text,
      newsletterHtml: newsletter.html,
      image: photo?.image,
      imageAlt: photo?.imageAlt,
      latest,
    });
  }

  return { editions, pinErrors };
}

let cache: TeenBuild<Story> | null = null;

export function getTeenBuild(today = mountainDay()): TeenBuild<Story> {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const built = buildTeenEditions(getPublishedStories(), loadTeenEditorConfig(), today);
  if (process.env.NODE_ENV === "production") cache = built;
  return built;
}

export function getTeenEditions(today = mountainDay()): TeenEdition<Story>[] {
  const built = getTeenBuild(today);
  if (built.pinErrors.length) {
    throw new Error(`Teen hub pins: ${built.pinErrors.join("; ")}`);
  }
  return built.editions;
}

export function teensToPrerender(editions = getTeenEditions()): TeenEdition<Story>[] {
  if (editions.length <= MAX_PRERENDERED_WEEKS) return editions;
  return editions
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}

export function teenEditionByStart(start: string, editions = getTeenEditions()): TeenEdition<Story> | undefined {
  return editions.find((edition) => edition.start === start);
}
