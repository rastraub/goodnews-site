/**
 * Good News Holiday Break Pack.
 *
 * /break features the edition that contains today's Denver date, or the next
 * one when today is between editions. /break/{slug} is one edition.
 * Stories come from the classroom archive. Pins cannot bypass the filter.
 * Dates use America/Denver, the same clock as the morning edition.
 */
import { BREAK_ACTIVITIES, type BreakActivityConfig } from "@/data/break-activities";
import { BREAK_EDITIONS, type BreakEditionDef } from "@/data/break-editions";
import { BREAK_PINS, type BreakPinFile } from "@/data/break-pins";
import { BINGO_ACTS } from "@/data/kindness-bingo";
import { siteConfig } from "@/site.config";
import type { BingoAct } from "./bingo-card";
import { hashString } from "./bingo-card";
import { isClassroomReady } from "./classroom-pack";
import { latestQuiz } from "./quiz";
import { absoluteUrl } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { tableTalkBlockReason } from "./table-talk";
import { addDays, formatWeekRange, mountainDay } from "./weeks";

export const BREAK_INDEX_PATH = "/break";
export const BINGO_PATH = "/kindness-bingo";

export const BREAK_INDEX_TITLE = "Good News Holiday Break Pack";
export const BREAK_INDEX_DESCRIPTION =
  "A free Good News Holiday Break Pack for families. Printable stories, Kindness Bingo, and screen-light activities for Thanksgiving week and winter break.";

export const BINGO_TITLE = "Kindness Bingo for Kids";
export const BINGO_DESCRIPTION =
  "A printable 5 by 5 Kindness Bingo card for kids and families. Free kind acts, a free center square, and a new card from a shared link. Nothing is stored on our servers.";

export const BREAK_STORY_TARGET = 6;
export const BREAK_STORY_MIN = 5;
export const BREAK_STORY_MAX = 7;
export const BREAK_RECENT_DAYS = 42;

export const BREAK_PARENT_NOTE =
  "Print this pack at home and do it together. It is meant to be screen-light: an adult reads the stories aloud, then the devices can wait. Kindness Bingo is small free kind acts, not a contest. We do not ask for a child's name, age, or email, and a checked square stays in this browser only.";

const INJURY =
  /\b(?:injur(?:y|ies|ed)|wounded|wounds?|accidents?(?!-free)|crashed|car crashes?|wrecked|hospitals?|emergency rooms?|broke (?:his|her|their)|broken (?:arm|leg|bone|bones|wrist|ankle)|concussion|unconscious|bleeding|bloody|widows?|orphans?)\b/i;

const DANGER =
  /\b(?:went missing|reported missing|found safe|search and rescue|search teams?|searchers|mine shafts?|fell into|firefighters?|paramedics?|ambulances?|hoisted|stranded hikers?|helicopter rescue)\b/i;

export type EditionStatus = "current" | "upcoming" | "past";

export type ResolvedActivity = {
  id: string;
  href: string;
  label: string;
  detail: string;
};

export type BreakDirectoryEntry = {
  slug: string;
  name: string;
  path: string;
  rangeLabel: string;
  status: EditionStatus;
  seoTitle: string;
};

export type BreakPack = {
  edition: BreakEditionDef;
  path: string;
  status: EditionStatus;
  rangeLabel: string;
  stories: Story[];
  activities: ResolvedActivity[];
  today: string;
};

export function breakEditionPath(slug: string): string {
  return `${BREAK_INDEX_PATH}/${slug}`;
}

export function editionStatus(edition: Pick<BreakEditionDef, "start" | "end">, today: string): EditionStatus {
  if (today < edition.start) return "upcoming";
  if (today > edition.end) return "past";
  return "current";
}

export function listBreakEditions(today = mountainDay()): BreakDirectoryEntry[] {
  return BREAK_EDITIONS.slice()
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .map((edition) => ({
      slug: edition.slug,
      name: edition.name,
      path: breakEditionPath(edition.slug),
      rangeLabel: formatWeekRange(edition.start, edition.end),
      status: editionStatus(edition, today),
      seoTitle: edition.seoTitle,
    }));
}

/** The edition that contains today, otherwise the soonest upcoming one, otherwise the latest past one. */
export function featuredBreakEdition(today = mountainDay()): BreakEditionDef {
  const editions = BREAK_EDITIONS.slice().sort((a, b) => (a.start < b.start ? -1 : 1));
  const current = editions.find((edition) => editionStatus(edition, today) === "current");
  if (current) return current;
  const upcoming = editions.find((edition) => editionStatus(edition, today) === "upcoming");
  if (upcoming) return upcoming;
  return editions[editions.length - 1];
}

export function breakBlockReason(story: Story): string | undefined {
  if (story.draft) return "draft";
  if (!story.kidFriendly || !story.kidSummary || (story.kidQuestions?.length ?? 0) < 2) return "not-classroom";
  if (!isClassroomReady(story)) return "not-ready";
  const blocked = tableTalkBlockReason(story);
  if (blocked) return blocked;
  const text = [
    story.title,
    story.dek,
    story.body,
    story.kidSummary,
    story.imageAlt,
    story.imageCaption,
    ...(story.kidQuestions ?? []),
  ].join("\n");
  if (INJURY.test(text)) return "injury";
  if (DANGER.test(text)) return "danger";
  return undefined;
}

function placeKey(story: Story): string {
  if (story.country === "US") return `US-${story.state || story.city}`;
  return story.country;
}

function diversityScore(story: Story, picked: Story[]): number {
  const categories = new Set(picked.map((item) => item.category));
  const places = new Set(picked.map(placeKey));
  let score = 0;
  if (!categories.has(story.category)) score += 2;
  if (!places.has(placeKey(story))) score += 1;
  return score;
}

function takeNext(pool: Story[], picked: Story[], editionSlug: string): Story | undefined {
  let best: Story | undefined;
  let bestKey = "";
  for (const story of pool) {
    const tie = hashString(`${editionSlug}:${story.slug}`).toString().padStart(10, "0");
    const key = `${story.date}|${diversityScore(story, picked)}|${tie}`;
    if (!best || key > bestKey) {
      best = story;
      bestKey = key;
    }
  }
  return best;
}

export function selectBreakStories(
  stories: Story[],
  edition: BreakEditionDef,
  config: BreakPinFile,
  today: string,
): { stories: Story[]; errors: string[] } {
  const errors: string[] = [];
  const asOf = today < edition.end ? today : edition.end;
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const seenPins = new Set<string>();
  const seenExcluded = new Set<string>();

  for (const slug of config.exclude) {
    if (seenExcluded.has(slug)) errors.push(`Duplicate exclude ${slug}`);
    seenExcluded.add(slug);
    if (!bySlug.has(slug)) errors.push(`Exclude ${slug} is not a published story`);
  }
  for (const slug of config.pins) {
    if (seenPins.has(slug)) errors.push(`Duplicate pin ${slug}`);
    seenPins.add(slug);
    if (seenExcluded.has(slug)) errors.push(`Pin ${slug} is also excluded`);
  }

  const eligible = stories.filter((story) => story.date <= asOf && !seenExcluded.has(story.slug) && !breakBlockReason(story));
  const eligibleBySlug = new Map(eligible.map((story) => [story.slug, story]));
  const picked: Story[] = [];

  for (const slug of config.pins) {
    if (picked.length >= BREAK_STORY_MAX) {
      errors.push(`Edition ${edition.slug} has more than ${BREAK_STORY_MAX} pins`);
      break;
    }
    const story = bySlug.get(slug);
    if (!story) {
      if (!seenExcluded.has(slug)) errors.push(`Pin ${slug} is not a published story`);
      continue;
    }
    if (story.date > asOf) {
      errors.push(`Pin ${slug} is dated after ${asOf}`);
      continue;
    }
    const reason = breakBlockReason(story);
    if (reason) {
      errors.push(`Pin ${slug} is blocked (${reason})`);
      continue;
    }
    if (!eligibleBySlug.has(slug)) continue;
    picked.push(story);
  }

  const used = new Set(picked.map((story) => story.slug));
  const cutoff = addDays(asOf, -BREAK_RECENT_DAYS);
  let recent = eligible.filter((story) => !used.has(story.slug) && story.date >= cutoff);
  let older = eligible.filter((story) => !used.has(story.slug) && story.date < cutoff);

  while (picked.length < BREAK_STORY_TARGET) {
    const next = takeNext(recent, picked, edition.slug);
    if (!next) break;
    picked.push(next);
    recent = recent.filter((story) => story.slug !== next.slug);
  }
  while (picked.length < BREAK_STORY_TARGET) {
    const next = takeNext(older, picked, edition.slug);
    if (!next) break;
    picked.push(next);
    older = older.filter((story) => story.slug !== next.slug);
  }

  if (picked.length < BREAK_STORY_MIN) {
    errors.push(`Edition ${edition.slug} has ${picked.length} stories after the filter, and the pack needs ${BREAK_STORY_MIN}`);
  }
  return { stories: picked.slice(0, BREAK_STORY_MAX), errors };
}

export function activitiesForEdition(slug: string, activities: readonly BreakActivityConfig[] = BREAK_ACTIVITIES): ResolvedActivity[] {
  const quizPath = latestQuiz()?.path ?? "/quiz";
  return activities.flatMap((activity) => {
    if (activity.editions && !activity.editions.includes(slug)) return [];
    const href = activity.href === "latest-quiz" ? quizPath : activity.href;
    return [{ id: activity.id, href, label: activity.label, detail: activity.detail }];
  });
}

export function getBreakPack(slug: string, today = mountainDay()): BreakPack {
  const edition = BREAK_EDITIONS.find((item) => item.slug === slug);
  if (!edition) throw new Error(`Unknown break edition ${slug}`);
  const config = BREAK_PINS[slug] ?? { pins: [], exclude: [] };
  const selected = selectBreakStories(getPublishedStories(), edition, config, today);
  if (selected.errors.length) {
    throw new Error(`Break pack ${slug}: ${selected.errors.join("; ")}`);
  }
  return {
    edition,
    path: breakEditionPath(slug),
    status: editionStatus(edition, today),
    rangeLabel: formatWeekRange(edition.start, edition.end),
    stories: selected.stories,
    activities: activitiesForEdition(slug),
    today,
  };
}

export function resolvedBingoActs(stories = getPublishedStories()): { acts: BingoAct[]; errors: string[] } {
  const errors: string[] = [];
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const seen = new Set<string>();
  const acts: BingoAct[] = [];
  for (const act of BINGO_ACTS) {
    if (seen.has(act.id)) errors.push(`Duplicate bingo act ${act.id}`);
    seen.add(act.id);
    if (!act.storySlug) {
      acts.push({ id: act.id, text: act.text });
      continue;
    }
    const story = bySlug.get(act.storySlug);
    if (!story) {
      errors.push(`Bingo act ${act.id} links to missing story ${act.storySlug}`);
      acts.push({ id: act.id, text: act.text });
      continue;
    }
    const reason = breakBlockReason(story);
    if (reason) {
      errors.push(`Bingo act ${act.id} links to ${act.storySlug}, blocked (${reason})`);
      acts.push({ id: act.id, text: act.text });
      continue;
    }
    acts.push({
      id: act.id,
      text: act.text,
      storyPath: `/story/${story.slug}`,
      storyTitle: story.title,
    });
  }
  return { acts, errors };
}

export function getBingoActs(stories = getPublishedStories()): BingoAct[] {
  const resolved = resolvedBingoActs(stories);
  if (resolved.errors.length) throw new Error(resolved.errors.join("; "));
  return resolved.acts;
}

type Crumb = { name: string; path: string };

function breadcrumbNode(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

function bingoResource(path: string, name: string) {
  return {
    "@type": "LearningResource",
    "@id": `${absoluteUrl(path)}#kindness-bingo`,
    name,
    description: "A printable 5 by 5 card of small free kind acts for kids and families, with a free center square.",
    url: `${absoluteUrl(path)}#kindness-bingo`,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    learningResourceType: "activity",
    educationalLevel: "Ages 6–12",
    author: {
      "@type": "Organization",
      name: siteConfig.editor.name,
      url: absoluteUrl("/about#masthead"),
    },
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };
}

export function breakIndexJsonLd(entries: BreakDirectoryEntry[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: BREAK_INDEX_TITLE,
        description: BREAK_INDEX_DESCRIPTION,
        url: absoluteUrl(BREAK_INDEX_PATH),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: entries.length,
          itemListElement: entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.seoTitle,
            url: absoluteUrl(entry.path),
          })),
        },
      },
      bingoResource(BREAK_INDEX_PATH, "Kindness Bingo"),
      breadcrumbNode([
        { name: "Today", path: "/" },
        { name: BREAK_INDEX_TITLE, path: BREAK_INDEX_PATH },
      ]),
    ],
  };
}

export function breakEditionJsonLd(pack: BreakPack) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: pack.edition.seoTitle,
        description: pack.edition.description,
        url: absoluteUrl(pack.path),
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: pack.stories.length,
          itemListElement: pack.stories.map((story, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: story.title,
            url: absoluteUrl(`/story/${story.slug}`),
          })),
        },
      },
      bingoResource(pack.path, `Kindness Bingo for ${pack.edition.name}`),
      breadcrumbNode([
        { name: "Today", path: "/" },
        { name: BREAK_INDEX_TITLE, path: BREAK_INDEX_PATH },
        { name: pack.edition.name, path: pack.path },
      ]),
    ],
  };
}

export function bingoJsonLd() {
  const acts = BINGO_ACTS;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...bingoResource(BINGO_PATH, BINGO_TITLE),
        url: absoluteUrl(BINGO_PATH),
        "@id": `${absoluteUrl(BINGO_PATH)}#resource`,
        description: BINGO_DESCRIPTION,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: acts.length,
          itemListElement: acts.slice(0, 40).map((act, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: act.text,
          })),
        },
      },
      breadcrumbNode([
        { name: "Today", path: "/" },
        { name: "Kindness Bingo", path: BINGO_PATH },
      ]),
    ],
  };
}
