/**
 * Good News Starters. One Monday page of three free or cheap local actions.
 * Each action is a reusable template in data/starter-actions.ts, matched to a
 * real story by keywords and tags. Editors pin or exclude stories in
 * data/starter-pins.ts.
 *
 * A match is confident when a phrase appears in the title or deck, or a
 * single keyword appears there and the story shares a tag. Category overlap
 * only raises the score. The safety filter runs first and a pin cannot
 * override it. Dates use the same Denver Monday calendar as /week.
 */
import { STARTER_ACTIONS } from "@/data/starter-actions";
import { STARTER_BOX_EXCLUDE, STARTER_PINS, STARTER_WEEK_EXCLUDES } from "@/data/starter-pins";
import { heavyNewsReason } from "./news-break";
import { getPublishedExplainers } from "./explainers";
import { absoluteUrl, publishedIso } from "./seo";
import { STARTERS_FEED_PATH, STARTERS_INDEX_PATH, starterWeekPath } from "./starter-path";
import type { StarterAction, StarterPin, StarterStory, StarterWeekExclude } from "./starter-types";
import { editionYear } from "./format";
import { getPublishedStories, type Story } from "./stories";
import { addDays, formatWeekRange, launchWeekStart, mountainDay, parseIsoDate, weekStart } from "./weeks";
import { siteConfig } from "@/site.config";

export const STARTER_PICK_COUNT = 3;

/** Minimum score that counts as a confident match. */
export const CONFIDENT_SCORE = 8;

export const STARTERS_INDEX_TITLE = "Good News Starters";

export const STARTERS_INDEX_DESCRIPTION =
  "Three free or cheap local actions each week, each one inspired by a verified good-news story. Copy them where you live.";

export type { StarterAction, StarterPin, StarterStory, StarterWeekExclude };

export type StarterOrigin = "pinned" | "week" | "archive";

export type StarterPick<T extends StarterStory = StarterStory> = {
  action: StarterAction;
  story: T;
  score: number;
  origin: StarterOrigin;
};

export type StarterWeek<T extends StarterStory = StarterStory> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  picks: StarterPick<T>[];
  latest: string;
  image: string;
  imageAlt: string;
};

export type StarterBox = {
  action: StarterAction;
  href: string;
  rangeLabel: string;
};

const MEDICAL_TAGS = new Set(["medical-research", "public-health", "vision-care"]);

const MEDICAL_ADVICE =
  /\b(?:clinical trials?|prescriptions?|dosages?|milligrams?|fda[- ]approv\w*|side effects?|chemotherapy|immunotherap\w*|this (?:drug|medicine))\b/i;

const CRIME =
  /\b(?:crimes?|criminals?|felon(?:y|ies)|misdemeanors?|suspects?|arrested|under arrest|taken into custody|charged with|indict(?:ed|ment)|convicted|robber(?:y|ies)|burglar(?:y|ies)|homicides?|manslaughter|traffick(?:ing|ed)|cartels?|thefts?)\b/i;

const VIOLENCE =
  /\b(?:violence|violent|assault(?:ed|s)?|stabb(?:ed|ing|s)?|murders?|murdered|bombings?|bomb threats?|terror(?:ist|ism)?|suicid(?:e|al)|weapons?|firearms?|handguns?|rifles?|pistols?|gunfire|gunshots?|shootings?|shooters?|abuse(?:d|s)?|abusive)\b/i;

const TITLE_TRAGEDY =
  /\b(?:killed|murdered|homicide|funeral|obituary|died|dies|death|deaths|dead|fatal|fatality|suicide|overdose|mourning|tragic|tragedy)\b/i;

const DEK_TRAGEDY =
  /\b(?:murdered|homicide|funeral|obituary|suicide|overdose|mourning|tragic|tragedy|was killed|were killed|shot and killed|passed away)\b/i;

const HEAVY_VIOLENCE = /shoot|gun|force|weapon|taser/i;

const EMAIL = /@/;
const PHONE = /\b\d{3}[-.)]\s*\d{3}[-.)]\s*\d{4}\b/;
const NAMED_CONTACT = /\b(?:call|text|email|e-mail)\s+[A-Z][a-z]{2,}\b/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTerm(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
}

function leadText(story: StarterStory): string {
  return `${story.title}\n${story.shortTitle ?? ""}\n${story.dek}`;
}

function titleText(story: StarterStory): string {
  return `${story.title} ${story.shortTitle ?? ""}`.trim();
}

/** Why a story cannot inspire an action. A pin cannot override this. */
export function starterBlockReason(story: StarterStory): string | undefined {
  if (story.draft) return "draft";
  if (story.category === "health-tech") return "medical";
  const tags = story.tags ?? [];
  if (tags.some((tag) => MEDICAL_TAGS.has(tag))) return "medical";
  const lead = leadText(story);
  if (MEDICAL_ADVICE.test(lead)) return "medical";
  if (CRIME.test(lead)) return "crime";
  if (VIOLENCE.test(lead)) return "violence";
  if (TITLE_TRAGEDY.test(titleText(story))) return "tragedy";
  if (DEK_TRAGEDY.test(story.dek)) return "tragedy";
  const heavy = heavyNewsReason({
    slug: story.slug,
    title: story.title,
    shortTitle: story.shortTitle,
    dek: story.dek,
    body: story.body,
    tags: [...tags],
    sourceName: story.sourceName,
  });
  if (!heavy) return undefined;
  return HEAVY_VIOLENCE.test(heavy) ? "violence" : "politics";
}

export function starterMatchScore(action: StarterAction, story: StarterStory): number {
  if (starterBlockReason(story)) return 0;
  const tags = new Set(story.tags ?? []);
  const shared = action.tags.filter((tag) => tags.has(tag)).length;
  const categoryHit = action.categories.includes(story.category as StarterAction["categories"][number]);
  const title = titleText(story);
  const dek = story.dek;
  const body = story.body ?? "";
  let phrasePoints = 0;
  let wordPoints = 0;
  let bodyPhrase = 0;
  for (const keyword of action.keywords) {
    const phrase = keyword.includes(" ");
    if (hasTerm(title, keyword)) {
      if (phrase) phrasePoints += 12;
      else wordPoints += 6;
    } else if (hasTerm(dek, keyword)) {
      if (phrase) phrasePoints += 9;
      else wordPoints += 4;
    } else if (phrase && hasTerm(body, keyword)) {
      bodyPhrase += 3;
    }
  }
  if (phrasePoints + wordPoints > 0) {
    if (phrasePoints === 0 && shared === 0) return 0;
    let score = phrasePoints + wordPoints + shared * 4;
    if (categoryHit) score += 2;
    return score;
  }
  if (bodyPhrase > 0 && shared > 0 && categoryHit) return bodyPhrase + shared * 4 + 2;
  return 0;
}

export function isConfidentStarterMatch(action: StarterAction, story: StarterStory): boolean {
  return starterMatchScore(action, story) >= CONFIDENT_SCORE;
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function describeWeek(rangeLabel: string, picks: readonly { action: { title: string } }[], inProgress: boolean): string {
  const names = picks.map((pick, index) => {
    const title = pick.action.title;
    if (index === 0) return title;
    return title.charAt(0).toLowerCase() + title.slice(1);
  });
  const lead = inProgress ? `So far for ${rangeLabel}` : `For ${rangeLabel}`;
  const listed = listPhrase(names);
  if (!listed) return `${lead}, local actions inspired by verified good-news stories. Each one is free or cheap.`;
  return `${lead}: ${listed}. Each one is free or cheap, and each one is inspired by a verified story.`;
}

function bestStory<T extends StarterStory>(
  action: StarterAction,
  stories: readonly T[],
  used: ReadonlySet<string>,
): { story: T; score: number } | undefined {
  let best: { story: T; score: number } | undefined;
  for (const story of stories) {
    if (used.has(story.slug) || story.draft) continue;
    const score = starterMatchScore(action, story);
    if (score < CONFIDENT_SCORE) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && (story.date > best.story.date || (story.date === best.story.date && story.slug < best.story.slug)))
    ) {
      best = { story, score };
    }
  }
  return best;
}

function weekExcludes(week: string, excludes: readonly StarterWeekExclude[]) {
  const stories = new Set<string>();
  const actions = new Set<string>();
  for (const entry of excludes) {
    if (entry.week !== week) continue;
    for (const slug of entry.stories ?? []) stories.add(slug);
    for (const id of entry.actions ?? []) actions.add(id);
  }
  return { stories, actions };
}

export function buildStarterWeekPicks<T extends StarterStory>(options: {
  week: string;
  today: string;
  stories: readonly T[];
  actions?: readonly StarterAction[];
  pins?: readonly StarterPin[];
  excludes?: readonly StarterWeekExclude[];
  previousActionIds?: readonly string[];
}): StarterPick<T>[] {
  const actions = options.actions ?? STARTER_ACTIONS;
  const pins = (options.pins ?? []).filter((pin) => pin.week === options.week);
  const excluded = weekExcludes(options.week, options.excludes ?? []);
  const end = addDays(options.week, 6);
  const bySlug = new Map(options.stories.map((story) => [story.slug, story]));
  const weekStories = options.stories.filter(
    (story) => !story.draft && !excluded.stories.has(story.slug) && story.date >= options.week && story.date <= end && story.date <= options.today,
  );
  const archiveStories = options.stories.filter(
    (story) => !story.draft && !excluded.stories.has(story.slug) && story.date < options.week && story.date <= options.today,
  );
  const picks: StarterPick<T>[] = [];
  const usedStories = new Set<string>();
  const usedActions = new Set<string>();
  const previous = new Set(options.previousActionIds ?? []);

  for (const pin of pins) {
    if (picks.length >= STARTER_PICK_COUNT) break;
    if (excluded.actions.has(pin.action) || excluded.stories.has(pin.story)) continue;
    if (usedActions.has(pin.action) || usedStories.has(pin.story)) continue;
    const action = actions.find((item) => item.id === pin.action);
    const story = bySlug.get(pin.story);
    if (!action || !story || story.draft || starterBlockReason(story)) continue;
    picks.push({ action, story, score: starterMatchScore(action, story), origin: "pinned" });
    usedActions.add(action.id);
    usedStories.add(story.slug);
  }

  const fill = (pool: readonly T[], origin: "week" | "archive", allowRepeats: boolean) => {
    const ranked: { action: StarterAction; score: number }[] = [];
    for (const action of actions) {
      if (usedActions.has(action.id) || excluded.actions.has(action.id)) continue;
      if (!allowRepeats && previous.has(action.id)) continue;
      const choice = bestStory(action, pool, usedStories);
      if (!choice) continue;
      ranked.push({ action, score: choice.score });
    }
    ranked.sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));
    for (const item of ranked) {
      if (picks.length >= STARTER_PICK_COUNT) return;
      if (usedActions.has(item.action.id)) continue;
      const choice = bestStory(item.action, pool, usedStories);
      if (!choice) continue;
      picks.push({ action: item.action, story: choice.story, score: choice.score, origin });
      usedActions.add(item.action.id);
      usedStories.add(choice.story.slug);
    }
  };

  fill(weekStories, "week", false);
  if (picks.length < STARTER_PICK_COUNT) fill(weekStories, "week", true);
  if (picks.length < STARTER_PICK_COUNT) fill(archiveStories, "archive", false);
  if (picks.length < STARTER_PICK_COUNT) fill(archiveStories, "archive", true);
  return picks;
}

function finishStarterWeek<T extends StarterStory>(start: string, today: string, picks: StarterPick<T>[]): StarterWeek<T> {
  const end = addDays(start, 6);
  const inProgress = start === weekStart(today);
  const rangeLabel = formatWeekRange(start, end);
  const photo = picks.find((pick) => pick.origin !== "archive" && pick.story.image) ?? picks.find((pick) => pick.story.image);
  const latest = picks.reduce((max, pick) => (pick.story.date > max ? pick.story.date : max), start);
  const title = inProgress ? `Good News Starters, so far: ${rangeLabel}` : `Good News Starters: ${rangeLabel}`;
  return {
    start,
    end,
    path: starterWeekPath(start),
    inProgress,
    rangeLabel,
    title,
    heading: `${title}.`,
    description: describeWeek(rangeLabel, picks, inProgress),
    picks,
    latest,
    image: photo?.story.image ?? "",
    imageAlt: photo?.story.imageAlt ?? photo?.action.title ?? title,
  };
}

/** Mondays from launch week through the current Denver week, oldest first. */
export function starterWeekStarts(today = mountainDay()): string[] {
  const first = launchWeekStart();
  const current = weekStart(today);
  if (current < first) return [];
  const weeks: string[] = [];
  for (let cursor = first; cursor <= current; cursor = addDays(cursor, 7)) weeks.push(cursor);
  return weeks;
}

export function buildStarterWeeks<T extends StarterStory>(options: {
  stories: readonly T[];
  today?: string;
  actions?: readonly StarterAction[];
  pins?: readonly StarterPin[];
  excludes?: readonly StarterWeekExclude[];
}): StarterWeek<T>[] {
  const today = options.today ?? mountainDay();
  const weeks: StarterWeek<T>[] = [];
  let previous: string[] = [];
  for (const start of starterWeekStarts(today)) {
    const picks = buildStarterWeekPicks({
      week: start,
      today,
      stories: options.stories,
      actions: options.actions,
      pins: options.pins,
      excludes: options.excludes,
      previousActionIds: previous,
    });
    if (!picks.length) {
      previous = [];
      continue;
    }
    weeks.push(finishStarterWeek(start, today, picks));
    previous = picks.map((pick) => pick.action.id);
  }
  return weeks;
}

export function starterBoxForStory<T extends StarterStory>(
  story: T,
  weeks: readonly StarterWeek<T>[],
  boxExclude: readonly string[] = [],
  actions: readonly StarterAction[] = STARTER_ACTIONS,
): StarterBox | undefined {
  if (story.draft || boxExclude.includes(story.slug) || starterBlockReason(story)) return undefined;
  const featured = weeks.flatMap((week) =>
    week.picks.filter((pick) => pick.story.slug === story.slug).map((pick) => ({ week, pick })),
  );
  const storyWeek = parseIsoDate(story.date) ? weekStart(story.date) : undefined;
  const featuredHit = featured.find((item) => item.week.start === storyWeek) ?? featured[featured.length - 1];
  if (featuredHit) {
    return {
      action: featuredHit.pick.action,
      href: `${featuredHit.week.path}#${featuredHit.pick.action.id}`,
      rangeLabel: featuredHit.week.rangeLabel,
    };
  }

  let best: { action: StarterAction; score: number } | undefined;
  for (const action of actions) {
    const score = starterMatchScore(action, story);
    if (score < CONFIDENT_SCORE) continue;
    if (!best || score > best.score || (score === best.score && action.id < best.action.id)) best = { action, score };
  }
  if (!best) return undefined;
  const hasAction = (week: StarterWeek<T>) => week.picks.some((pick) => pick.action.id === best.action.id);
  const own = storyWeek ? weeks.find((week) => week.start === storyWeek && hasAction(week)) : undefined;
  const current = weeks.find((week) => week.inProgress && hasAction(week));
  const any = [...weeks].reverse().find((week) => hasAction(week));
  const target = own ?? current ?? any;
  if (!target) return undefined;
  return { action: best.action, href: `${target.path}#${best.action.id}`, rangeLabel: target.rangeLabel };
}

function actionCopy(action: StarterAction): string {
  return [
    action.title,
    action.why,
    action.estimate,
    action.kidsNote ?? "",
    action.safetyNote ?? "",
    ...action.steps.flatMap((step) => [step.name, step.text]),
    ...action.shortSteps,
  ].join("\n");
}

export function starterTemplateProblems(explainerSlugs: ReadonlySet<string> = new Set(getPublishedExplainers().map((item) => item.slug))): string[] {
  const problems: string[] = [];
  if (STARTER_ACTIONS.length < 12 || STARTER_ACTIONS.length > 15) {
    problems.push(`Expected 12 to 15 starter actions, found ${STARTER_ACTIONS.length}.`);
  }
  const ids = new Set<string>();
  for (const action of STARTER_ACTIONS) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(action.id)) problems.push(`${action.id}: id must be kebab-case`);
    if (ids.has(action.id)) problems.push(`${action.id}: duplicate action id`);
    ids.add(action.id);
    if (action.steps.length < 4 || action.steps.length > 6) problems.push(`${action.id}: needs 4 to 6 steps`);
    if (action.shortSteps.length < 2 || action.shortSteps.length > 3) problems.push(`${action.id}: needs 2 or 3 short steps`);
    if (action.why.trim().length < 80) problems.push(`${action.id}: why should be one or two real sentences`);
    const seenKeywords = new Set<string>();
    for (const keyword of action.keywords) {
      if (keyword !== keyword.toLowerCase() || keyword.trim().length < 3) problems.push(`${action.id}: keyword ${keyword} should be lowercase and at least 3 characters`);
      if (seenKeywords.has(keyword)) problems.push(`${action.id}: duplicate keyword ${keyword}`);
      seenKeywords.add(keyword);
    }
    if (action.explainerSlug && !explainerSlugs.has(action.explainerSlug)) {
      problems.push(`${action.id}: unknown explainer ${action.explainerSlug}`);
    }
    const copy = actionCopy(action);
    if (EMAIL.test(copy) || PHONE.test(copy)) problems.push(`${action.id}: action copy must not include an email address or phone number`);
    if (NAMED_CONTACT.test(copy)) problems.push(`${action.id}: action copy must not tell a reader to contact a named person`);
    if (/\billegal\b/i.test(copy)) problems.push(`${action.id}: do not instruct anything illegal`);
  }
  return problems;
}

export function starterEditorProblems(stories: readonly StarterStory[], pins = STARTER_PINS, excludes = STARTER_WEEK_EXCLUDES, boxExclude = STARTER_BOX_EXCLUDE): string[] {
  const problems: string[] = [];
  const slugs = new Set(stories.map((story) => story.slug));
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const actionIds = new Set(STARTER_ACTIONS.map((action) => action.id));
  const launch = launchWeekStart();
  const seenPins = new Set<string>();
  const seenPinStories = new Set<string>();
  for (const pin of pins) {
    const label = `${pin.week || "(missing week)"} ${pin.action || "(missing action)"}`;
    if (!parseIsoDate(pin.week) || weekStart(pin.week) !== pin.week) problems.push(`${label}: week must be a Monday`);
    else if (pin.week < launch) problems.push(`${label}: week is before launch`);
    if (!actionIds.has(pin.action)) problems.push(`${label}: unknown action`);
    const story = bySlug.get(pin.story);
    if (!story) problems.push(`${label}: unknown story ${pin.story}`);
    else if (starterBlockReason(story)) problems.push(`${label}: ${pin.story} is blocked by the safety filter`);
    const pinKey = `${pin.week}:${pin.action}`;
    const storyKey = `${pin.week}:${pin.story}`;
    if (seenPins.has(pinKey)) problems.push(`${label}: that action is already pinned this week`);
    if (seenPinStories.has(storyKey)) problems.push(`${label}: that story is already pinned this week`);
    seenPins.add(pinKey);
    seenPinStories.add(storyKey);
    const drop = excludes.find((entry) => entry.week === pin.week);
    if (drop?.stories?.includes(pin.story)) problems.push(`${label}: ${pin.story} is both pinned and excluded`);
    if (drop?.actions?.includes(pin.action)) problems.push(`${label}: ${pin.action} is both pinned and excluded`);
  }
  for (const entry of excludes) {
    if (!parseIsoDate(entry.week) || weekStart(entry.week) !== entry.week) problems.push(`${entry.week}: exclude week must be a Monday`);
    else if (entry.week < launch) problems.push(`${entry.week}: exclude week is before launch`);
    for (const slug of entry.stories ?? []) {
      if (!slugs.has(slug)) problems.push(`${entry.week}: unknown excluded story ${slug}`);
    }
    for (const id of entry.actions ?? []) {
      if (!actionIds.has(id)) problems.push(`${entry.week}: unknown excluded action ${id}`);
    }
  }
  const seenBox = new Set<string>();
  for (const slug of boxExclude) {
    if (seenBox.has(slug)) problems.push(`box exclude: duplicate ${slug}`);
    seenBox.add(slug);
    if (!slugs.has(slug)) problems.push(`box exclude: unknown story ${slug}`);
  }
  return problems;
}

let cache: StarterWeek<Story>[] | null = null;

export function getStarterWeeks(): StarterWeek<Story>[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const stories = getPublishedStories();
  const problems = [...starterTemplateProblems(), ...starterEditorProblems(stories)];
  if (problems.length) throw new Error(`Good News Starters\n- ${problems.join("\n- ")}`);
  const weeks = buildStarterWeeks({ stories, pins: STARTER_PINS, excludes: STARTER_WEEK_EXCLUDES });
  cache = weeks;
  return weeks;
}

export function latestStarterWeek(weeks = getStarterWeeks()): StarterWeek<Story> | undefined {
  return weeks.find((week) => week.inProgress) ?? weeks[weeks.length - 1];
}

export function starterForStory(story: Story): StarterBox | undefined {
  return starterBoxForStory(story, getStarterWeeks(), STARTER_BOX_EXCLUDE);
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

/** One item per finished week. The open week stays out until Sunday is over. */
export function renderStarterRss(weeks: readonly StarterWeek[] = getStarterWeeks()): string {
  const finished = weeks.filter((week) => !week.inProgress).slice().sort((a, b) => (a.start < b.start ? 1 : -1));
  const self = absoluteUrl(STARTERS_FEED_PATH);
  const updated = finished[0] ? new Date(publishedIso(addDays(finished[0].end, 1))).toUTCString() : new Date().toUTCString();
  const items = finished
    .map((week) => {
      const link = absoluteUrl(week.path);
      const actions = week.picks
        .map((pick) => {
          const storyUrl = absoluteUrl(`/story/${pick.story.slug}`);
          return `<li><a href="${escapeXml(`${link}#${pick.action.id}`)}">${escapeXml(pick.action.title)}</a>, inspired by <a href="${escapeXml(storyUrl)}">${escapeXml(pick.story.title)}</a></li>`;
        })
        .join("");
      const html = `<p>${escapeXml(week.description)}</p><ul>${actions}</ul>`;
      const image = week.image
        ? `<media:content url="${escapeXml(absoluteUrl(week.image))}" medium="image" type="image/webp"><media:title>${escapeXml(week.title)}</media:title><media:description>${escapeXml(week.imageAlt)}</media:description></media:content><enclosure url="${escapeXml(absoluteUrl(week.image))}" type="image/webp" />`
        : "";
      return `<item>
      <title>${escapeXml(week.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(publishedIso(addDays(week.end, 1))).toUTCString()}</pubDate>
      <description>${escapeXml(week.description)}</description>
      <content:encoded>${cdata(html)}</content:encoded>
      <dc:creator>${escapeXml(siteConfig.editor.name)}</dc:creator>
      ${image}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`${siteConfig.name}: Good News Starters`)}</title>
    <link>${absoluteUrl(STARTERS_INDEX_PATH)}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml("Three free or cheap local actions for each finished week, inspired by verified stories.")}</description>
    <language>en-us</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <copyright>© ${editionYear()} ${escapeXml(siteConfig.name)}</copyright>
    <managingEditor>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</managingEditor>
    <webMaster>${escapeXml(`${siteConfig.contactEmail} (${siteConfig.editor.name})`)}</webMaster>
    ${items}
  </channel>
</rss>`;
}

export function starterWeekJsonLd(week: StarterWeek) {
  const url = absoluteUrl(week.path);
  const crumbs = [
    { name: "Today", path: "/" },
    { name: "Good News Starters", path: STARTERS_INDEX_PATH },
    { name: week.rangeLabel, path: week.path },
  ];
  const howtos = week.picks.map((pick) => ({
    "@type": "HowTo",
    "@id": `${url}#${pick.action.id}`,
    name: pick.action.title,
    description: `${pick.action.why} ${pick.action.estimate}`,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    ...(pick.story.image ? { image: absoluteUrl(pick.story.image) } : {}),
    step: pick.action.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: `${url}#${pick.action.id}-step-${index + 1}`,
    })),
    isBasedOn: [absoluteUrl(`/story/${pick.story.slug}`), pick.story.sourceUrl].filter((value): value is string => Boolean(value)),
  }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: week.title,
        description: week.description,
        url,
        numberOfItems: week.picks.length,
        itemListElement: week.picks.map((pick, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: pick.action.title,
          url: `${url}#${pick.action.id}`,
        })),
      },
      ...howtos,
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.path),
        })),
      },
    ],
  };
}

function sampleStory(partial: Partial<StarterStory> & Pick<StarterStory, "slug" | "title" | "dek" | "date">): StarterStory {
  return {
    category: "community",
    tags: [],
    ...partial,
  };
}

/** Fixture checks for the matcher and the safety filter. validate-stories calls this. */
export function assertStarterHelpers() {
  const templates = starterTemplateProblems(new Set(STARTER_ACTIONS.flatMap((action) => (action.explainerSlug ? [action.explainerSlug] : []))));
  const unknownExplainer = templates.find((line) => line.includes("unknown explainer"));
  if (unknownExplainer) throw new Error(unknownExplainer);
  const shape = starterTemplateProblems();
  if (shape.length) throw new Error(`Starter templates should be valid: ${shape.join("; ")}`);

  const pantry = STARTER_ACTIONS.find((action) => action.id === "little-free-pantry");
  const books = STARTER_ACTIONS.find((action) => action.id === "book-drive");
  const teachers = STARTER_ACTIONS.find((action) => action.id === "thank-teachers");
  const seniors = STARTER_ACTIONS.find((action) => action.id === "senior-calls");
  const garden = STARTER_ACTIONS.find((action) => action.id === "garden-hour");
  if (!pantry || !books || !teachers || !seniors || !garden) throw new Error("Missing a starter action used by the matcher checks.");

  const match = sampleStory({
    slug: "pantry-match",
    title: "Neighbors opened a food pantry on Main Street",
    dek: "The pantry stocks groceries for anyone who needs them.",
    date: "2026-11-10",
    tags: ["food-banks"],
  });
  if (!isConfidentStarterMatch(pantry, match)) throw new Error("A pantry story with the food-banks tag should match.");
  const tagOnly = sampleStory({
    slug: "tag-only",
    title: "Neighbors helped on a quiet afternoon",
    dek: "They spent the day together.",
    date: "2026-11-10",
    tags: ["food-banks"],
  });
  if (isConfidentStarterMatch(pantry, tagOnly) || starterMatchScore(pantry, tagOnly) !== 0) {
    throw new Error("A tag without a keyword should not be a confident starter match.");
  }
  const wordWithoutTag = sampleStory({
    slug: "word-only",
    title: "The new pantry on Main Street",
    dek: "People stopped to look.",
    date: "2026-11-10",
    tags: ["kindness"],
  });
  if (starterMatchScore(pantry, wordWithoutTag) !== 0) throw new Error("A keyword without a shared tag should not match.");

  const politics = sampleStory({
    slug: "election-pantry",
    title: "Election night food pantry opens",
    dek: "Volunteers stocked a food pantry.",
    date: "2026-11-10",
    tags: ["food-banks"],
  });
  if (starterBlockReason(politics) !== "politics") throw new Error("Politics should block a starter match.");
  if (isConfidentStarterMatch(pantry, politics)) throw new Error("A blocked story should not match.");

  const violence = sampleStory({
    slug: "shooting-books",
    title: "A shooting led neighbors to start a book drive",
    dek: "The little free library still opened.",
    date: "2026-11-10",
    tags: ["libraries"],
  });
  if (starterBlockReason(violence) !== "violence") throw new Error("Violence should block a starter match.");

  const crime = sampleStory({
    slug: "arrest-pantry",
    title: "Neighbors stocked a food pantry",
    dek: "A suspect was arrested nearby the same afternoon.",
    date: "2026-11-10",
    tags: ["food-banks"],
  });
  if (starterBlockReason(crime) !== "crime") throw new Error("Crime should block a starter match.");

  const tragedy = sampleStory({
    slug: "funeral-library",
    title: "After the funeral, a library opened",
    dek: "The book box is on Main Street.",
    date: "2026-11-10",
    tags: ["libraries"],
  });
  if (starterBlockReason(tragedy) !== "tragedy") throw new Error("A tragedy headline should block a starter match.");

  const medical = sampleStory({
    slug: "trial-library",
    title: "A library stayed open",
    dek: "The clinical trial enrolled patients down the street.",
    date: "2026-11-10",
    tags: ["libraries"],
  });
  if (starterBlockReason(medical) !== "medical") throw new Error("Medical advice language should block a starter match.");
  const research = sampleStory({
    slug: "research-pantry",
    title: "A food pantry opened near the lab",
    dek: "Neighbors stocked the shelves.",
    date: "2026-11-10",
    category: "health-tech",
    tags: ["medical-research", "food-banks"],
  });
  if (starterBlockReason(research) !== "medical") throw new Error("Health and medical-research stories should stay off starters.");

  const kindergarten = sampleStory({
    slug: "kinder",
    title: "A kindergarten class read aloud",
    dek: "The kindergarten readers shared picture books.",
    date: "2026-11-10",
    tags: ["students"],
  });
  if (starterMatchScore(garden, kindergarten) !== 0) throw new Error("Kindergarten should not match a garden action.");

  const cheer = sampleStory({
    slug: "cheer",
    title: "Sun Valley seniors carry thank-yous to the teachers who taught them",
    dek: "Fifteen senior cheerleaders thanked teachers and a custodian.",
    date: "2026-10-30",
    tags: ["teachers", "students", "kindness", "schools"],
  });
  if (starterMatchScore(seniors, cheer) !== 0) throw new Error("High-school seniors should not match the senior call list without the seniors tag.");
  if (!isConfidentStarterMatch(teachers, cheer)) throw new Error("A teacher thank-you should match the teacher action.");
  const notes = STARTER_ACTIONS.find((action) => action.id === "neighbor-note");
  if (!notes) throw new Error("Missing the neighbor-note action.");
  const roof = sampleStory({
    slug: "roof",
    title: "Volunteers replaced a neighbor's roof for free",
    dek: "Businesses and volunteers helped a neighbor.",
    date: "2026-11-04",
    tags: ["neighbors", "kindness", "volunteers"],
  });
  if (starterMatchScore(notes, roof) !== 0) throw new Error("A roof repair should not match a note just because it says neighbor.");
  const noteStory = sampleStory({
    slug: "note",
    title: "Students wrote a thank-you note for someone they know",
    dek: "The thank-you note stayed with a neighbor they already talk to.",
    date: "2026-11-04",
    tags: ["kindness"],
  });
  if (!isConfidentStarterMatch(notes, noteStory)) throw new Error("A thank-you note should match the neighbor note action.");

  const pinnedAway = buildStarterWeekPicks({
    week: "2026-11-09",
    today: "2026-11-11",
    stories: [politics, match],
    actions: [pantry],
    pins: [{ week: "2026-11-09", action: "little-free-pantry", story: "election-pantry" }],
  });
  if (pinnedAway.some((pick) => pick.story.slug === "election-pantry")) {
    throw new Error("A pin should not override the safety filter.");
  }

  const strong = sampleStory({
    slug: "strong-lib",
    title: "A little free library opened downtown",
    dek: "Anyone can take a book.",
    date: "2026-11-10",
    tags: ["little-free-libraries"],
  });
  const weak = sampleStory({
    slug: "weak-lib",
    title: "Neighbors shared a library corner",
    dek: "The library shelf is in the lobby.",
    date: "2026-11-10",
    tags: ["libraries"],
  });
  const pinned = buildStarterWeekPicks({
    week: "2026-11-09",
    today: "2026-11-11",
    stories: [strong, weak],
    actions: [books],
    pins: [{ week: "2026-11-09", action: "book-drive", story: "weak-lib" }],
  });
  if (pinned.length !== 1 || pinned[0]?.story.slug !== "weak-lib" || pinned[0]?.origin !== "pinned") {
    throw new Error("A pin should choose that story for the action.");
  }
  const excluded = buildStarterWeekPicks({
    week: "2026-11-09",
    today: "2026-11-11",
    stories: [strong, weak],
    actions: [books],
    excludes: [{ week: "2026-11-09", stories: ["strong-lib"] }],
  });
  if (excluded.length !== 1 || excluded[0]?.story.slug !== "weak-lib") {
    throw new Error("A week exclude should drop that story.");
  }
  const duplicates = buildStarterWeekPicks({
    week: "2026-11-09",
    today: "2026-11-11",
    stories: [strong, weak],
    actions: [books],
  });
  if (duplicates.length !== 1) throw new Error("One action should be picked once even when two stories match.");

  const oldLibrary = sampleStory({
    slug: "old-library",
    title: "A little free library opened in October",
    dek: "The book box sits on Main Street.",
    date: "2026-10-08",
    tags: ["little-free-libraries"],
  });
  const oldGarden = sampleStory({
    slug: "old-garden",
    title: "A community garden opened for the block",
    dek: "Neighbors share the beds.",
    date: "2026-10-09",
    tags: ["community-garden"],
  });
  const thin = buildStarterWeekPicks({
    week: "2026-11-09",
    today: "2026-11-11",
    stories: [match, oldLibrary, oldGarden],
    actions: [pantry, books, garden],
  });
  if (thin.length !== 3) throw new Error(`A thin week should fill from the archive, got ${thin.length}.`);
  const origins = new Set(thin.map((pick) => pick.origin));
  if (!origins.has("week") || !origins.has("archive")) throw new Error("Archive fallback should sit beside an in-week pick.");
  if (new Set(thin.map((pick) => pick.action.id)).size !== 3 || new Set(thin.map((pick) => pick.story.slug)).size !== 3) {
    throw new Error("The three picks should use different actions and different stories.");
  }

  const weeks = buildStarterWeeks({
    stories: [match, oldLibrary, oldGarden],
    today: "2026-11-11",
    actions: [pantry, books, garden],
  });
  const current = weeks.find((week) => week.start === "2026-11-09");
  if (!current) throw new Error("The fixture week should build a starters page.");
  const box = starterBoxForStory(match, weeks, []);
  if (!box || !box.href.includes("/starters/2026-11-09#little-free-pantry")) {
    throw new Error(`A matched story should link to its starters week, got ${box?.href ?? "nothing"}.`);
  }
  if (starterBoxForStory(match, weeks, ["pantry-match"])) throw new Error("The box exclude list should hide the story box.");
  if (starterBoxForStory(politics, weeks, [])) throw new Error("A blocked story should not get a story box.");
  if (starterBoxForStory(tagOnly, weeks, [])) throw new Error("A weak match should not get a story box.");

  const rss = renderStarterRss([
    { ...current, inProgress: true },
    { ...current, start: "2026-10-05", end: "2026-10-11", path: "/starters/2026-10-05", inProgress: false, title: "Good News Starters: Oct 5 to 11, 2026" },
  ]);
  if (rss.includes("/starters/2026-11-09")) throw new Error("The open starters week should stay out of the RSS feed.");
  if (!rss.includes("/starters/2026-10-05") || !rss.includes(siteConfig.editor.name)) {
    throw new Error("A finished starters week should be in the RSS feed under the organization byline.");
  }

  const editor = starterEditorProblems([match], [{ week: "2026-11-10", action: "little-free-pantry", story: "pantry-match" }]);
  if (!editor.some((line) => line.includes("Monday"))) throw new Error("A pin that is not a Monday should fail.");
  const missing = starterEditorProblems([match], [{ week: "2026-11-09", action: "missing-action", story: "pantry-match" }]);
  if (!missing.some((line) => line.includes("unknown action"))) throw new Error("An unknown pinned action should fail.");

  const live = getStarterWeeks();
  const liveCurrent = live.find((week) => week.inProgress);
  const livePrior = [...live].reverse().find((week) => !week.inProgress);
  if (!liveCurrent || liveCurrent.picks.length < STARTER_PICK_COUNT) {
    throw new Error(`The current starters week should have ${STARTER_PICK_COUNT} actions.`);
  }
  if (!livePrior || livePrior.picks.length < STARTER_PICK_COUNT) {
    throw new Error(`A prior starters week should have ${STARTER_PICK_COUNT} actions.`);
  }
  for (const week of [liveCurrent, livePrior]) {
    if (new Set(week.picks.map((pick) => pick.action.id)).size !== week.picks.length) {
      throw new Error(`${week.start} repeats an action.`);
    }
    if (new Set(week.picks.map((pick) => pick.story.slug)).size !== week.picks.length) {
      throw new Error(`${week.start} repeats a story.`);
    }
    for (const pick of week.picks) {
      const reason = starterBlockReason(pick.story);
      if (reason) throw new Error(`${week.start} used a blocked story ${pick.story.slug} (${reason}).`);
    }
  }
}
