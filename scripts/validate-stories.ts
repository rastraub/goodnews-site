import fs from "fs";
import path from "path";
import { parseEmailInterest } from "../lib/email";
import { loadEnrichment, mergeStoryFields } from "../lib/enrichment";
import { SMARTNEWS_DESCRIPTION, renderRss, renderSmartNews, storyHtml } from "../lib/feed";
import { feedImageReport } from "../lib/feed-image";
import { largeJpegPath, storyThumbPath } from "../lib/images";
import { buildHubs, getHubIndex, MAX_PRERENDERED_HUBS, MIN_HUB_STORIES, type HubStory } from "../lib/hubs";
import { getKidStories, kidPlaces, storyOfTheDay } from "../lib/kids";
import { MAX_PRERENDERED_PAGES, pageCount, STATIC_STORY_CAP } from "../lib/paging";
import {
  MAX_PRERENDERED_WEEKS,
  MIN_WEEK_STORIES,
  SITE_LAUNCH,
  addDays,
  buildWeeks,
  completedWeeks,
  formatWeekRange,
  getPublishedWeeks,
  launchWeekStart,
  mountainDay,
  renderWeekRss,
  weekStart,
  type WeekSource,
} from "../lib/weeks";
import { storySchema } from "../lib/story-schema";
import { getPublishedStories, loadAllStories } from "../lib/stories";
import { worldSpotlight } from "../lib/world-pick";
import { readSmtpSettings, submissionMailbox } from "../lib/smtp";
import { cleanHttpUrl, escapeHtml, singleLine, storyTipBodies, storyTipSubject } from "../lib/tip-mail";
import { isNewsBreakBannerActive } from "../lib/news-break-banner";
import {
  heavyNewsReason,
  isHeavyNews,
  NEWS_BREAK_DESCRIPTION,
  NEWS_BREAK_TITLE,
  newsBreakHubs,
  newsBreakQuickRead,
  newsBreakTop,
  quickReadLine,
  type NewsBreakStory,
} from "../lib/news-break";
import { newsBreakJsonLd } from "../lib/seo";
import { newsBreakBanner, siteConfig, socialLinks } from "../site.config";

const REQUIRED_SOURCES = [
  "https://www.ideastream.org/health/2026-10-06/mane-attraction-therapy-pony-brings-smiles-and-healing-to-local-hospitals",
  "https://www.wgbh.org/news/local/2026-10-06/endangered-turtles-get-a-boost-with-the-help-of-massachusetts-school-kids",
  "https://www.today.com/food/people/florida-restaurant-owner-gives-regular-customer-job-eviction-notice-rcna601903",
  "https://www.goodmorningamerica.com/news/story/boston-custodian-honored-donating-kidney-teachers-brother-137009160",
  "https://news.wsu.edu/news/2026/10/05/rescue-puppy-overcomes-heart-defect-finds-forever-home-with-wsu-veterinarian/",
];

function assertSchemaRejectsGarbage() {
  const result = storySchema.safeParse({ title: "too short" });
  if (result.success) {
    throw new Error("Schema accepted an incomplete story. Validation is not strict enough.");
  }
}

function minimalStory(extra: Record<string, unknown>) {
  return {
    title: "A verified good news headline",
    dek: "One or two sentences a reader can trust without guessing.",
    date: "2026-10-06",
    city: "Akron",
    category: "community",
    sourceName: "Ideastream",
    sourceUrl: "https://example.com/original-report",
    image: "/images/stories/example.webp",
    imageAlt: "A photo of the actual scene",
    imageCaption: "Illustrative photo of a town square.",
    imageCredit: "Photographer / Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    imageLicense: "CC BY 2.0",
    imageLicenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    howToHelp: [{ label: "A real place a reader can act", url: "https://example.org/help", kind: "donate" }],
    editorApproved: true,
    ...extra,
  };
}

function assertCountryRules() {
  const us = storySchema.safeParse(minimalStory({ state: "OH" }));
  if (!us.success || us.data.country !== "US" || us.data.state !== "OH") {
    throw new Error("A US story that omits country should default to US and keep its state.");
  }
  const missingState = storySchema.safeParse(minimalStory({}));
  if (missingState.success) throw new Error("A US story without a state should fail.");
  const japan = storySchema.safeParse(minimalStory({ country: "JP", city: "Osaka" }));
  if (!japan.success || japan.data.country !== "JP" || japan.data.state) {
    throw new Error("A Japan story should pass without a state.");
  }
  const japanState = storySchema.safeParse(minimalStory({ country: "JP", state: "CA", city: "Osaka" }));
  if (japanState.success) throw new Error("A non-US story with a state should fail.");
  const unknown = storySchema.safeParse(minimalStory({ country: "ZZ", city: "Nowhere" }));
  if (unknown.success) throw new Error("An unknown country code should fail.");
  const usPick = storySchema.safeParse(minimalStory({ state: "OH", worldPick: true }));
  if (usPick.success) throw new Error("A US story cannot be the world pick.");
  const japanPick = storySchema.safeParse(minimalStory({ country: "JP", city: "Osaka", worldPick: true }));
  if (!japanPick.success || japanPick.data.worldPick !== true) {
    throw new Error("A Japan story should be allowed as the world pick.");
  }
}

function assertWorldSpotlight() {
  const osaka = { slug: "osaka-kindness", date: "2026-10-18", country: "JP", worldPick: false };
  const lyon = { slug: "lyon-library", date: "2026-10-19", country: "FR", worldPick: false };
  const day = "2026-10-20";
  const first = worldSpotlight([osaka, lyon], day);
  const again = worldSpotlight([lyon, osaka], day);
  if (!first || first.slug !== again?.slug) {
    throw new Error("The world spotlight should stay on the same story for a date.");
  }
  const nextDay = worldSpotlight([osaka, lyon], "2026-10-21");
  if (!nextDay || nextDay.slug === first.slug) {
    throw new Error("The world spotlight should rotate across dates.");
  }
  const flagged = worldSpotlight([{ ...osaka, worldPick: true }, lyon], day);
  if (flagged?.slug !== osaka.slug) throw new Error("worldPick should win the spotlight.");
  if (worldSpotlight([{ ...osaka, country: "US" }], day)) {
    throw new Error("A US story should not be the world spotlight.");
  }
  if (worldSpotlight([], day)) throw new Error("No international story means no spotlight.");
}

function hubStory(partial: Partial<HubStory> & Pick<HubStory, "slug">): HubStory {
  return {
    date: "2026-10-01",
    city: "Denver",
    country: "US",
    state: "CO",
    alsoStates: [],
    category: "animals",
    tags: [],
    ...partial,
  };
}

function assertHubs() {
  const thin = buildHubs([
    hubStory({ slug: "one" }),
    hubStory({ slug: "two", date: "2026-10-02" }),
  ]);
  if (thin.cities.length || thin.stateCategories.length || thin.topics.length) {
    throw new Error("Two stories should not publish a hub page.");
  }
  const ready = buildHubs([
    hubStory({ slug: "one", tags: ["school-lunch"] }),
    hubStory({ slug: "two", date: "2026-10-02", tags: ["school-lunch"] }),
    hubStory({ slug: "three", date: "2026-10-03", city: "Boulder", tags: ["school-lunch"] }),
    hubStory({ slug: "four", date: "2026-10-04" }),
  ]);
  const animals = ready.stateCategories.find((hub) => hub.path === "/state/colorado/animals");
  const denver = ready.cities.find((hub) => hub.path === "/state/colorado/city/denver");
  const topic = ready.topics.find((hub) => hub.path === "/topic/school-lunch");
  if (!animals || animals.count < MIN_HUB_STORIES) throw new Error("Colorado animals should be a hub once three stories exist.");
  if (!denver || denver.count !== 3) throw new Error("Denver should be a city hub, and Boulder should not.");
  if (ready.cities.some((hub) => hub.path.includes("boulder"))) throw new Error("A single Boulder story should not be a city page.");
  if (!topic) throw new Error("A shared tag should become a topic page at three stories.");
  const badTag = storySchema.safeParse(minimalStory({ state: "OH", tags: ["School Lunch"] }));
  if (badTag.success) throw new Error("Tags have to be kebab-case.");
  const unknownTag = storySchema.safeParse(minimalStory({ state: "OH", tags: ["not-a-real-topic"] }));
  if (unknownTag.success) throw new Error("Tags outside the vocabulary should fail.");
  const duplicate = storySchema.safeParse(minimalStory({ state: "OH", tags: ["dogs", "dogs"] }));
  if (duplicate.success) throw new Error("Duplicate tags should fail.");
  const known = storySchema.safeParse(minimalStory({ state: "OH", tags: ["dogs", "animal-rescue"] }));
  if (!known.success) throw new Error("Tags from the vocabulary should pass.");
  const index = getHubIndex();
  for (const hub of [...index.stateCategories, ...index.cities, ...index.topics]) {
    if (hub.count < MIN_HUB_STORIES) throw new Error(`${hub.path} is thinner than ${MIN_HUB_STORIES} stories.`);
  }
  console.log(`Hubs: ${index.stateCategories.length} state topics, ${index.cities.length} cities, ${index.topics.length} topics.`);
}

function assertKidClassrooms() {
  const summary = "A short classroom summary a teacher can read aloud to the class.";
  const questions = [
    "What did the people in this story do?",
    "How could a class try something kind this week?",
  ];
  const plain = storySchema.safeParse(minimalStory({ state: "OH" }));
  if (!plain.success || plain.data.kidFriendly !== false || plain.data.kidSummary || plain.data.kidQuestions) {
    throw new Error("Classroom fields should stay optional.");
  }
  const flagged = storySchema.safeParse(minimalStory({ state: "OH", kidFriendly: true }));
  if (flagged.success) throw new Error("kidFriendly needs a summary and discussion questions.");
  const one = storySchema.safeParse(
    minimalStory({ state: "OH", kidFriendly: true, kidSummary: summary, kidQuestions: [questions[0]] }),
  );
  if (one.success) throw new Error("One discussion question is not enough.");
  const four = storySchema.safeParse(
    minimalStory({
      state: "OH",
      kidFriendly: true,
      kidSummary: summary,
      kidQuestions: [...questions, "What else did you notice?", "Who would you thank?"],
    }),
  );
  if (four.success) throw new Error("Four discussion questions is too many.");
  const ready = storySchema.safeParse(minimalStory({ state: "OH", kidFriendly: true, kidSummary: summary, kidQuestions: questions }));
  if (!ready.success || ready.data.kidQuestions?.length !== 2) {
    throw new Error("Two questions and a summary should pass.");
  }
  const third = storySchema.safeParse(
    minimalStory({
      state: "OH",
      kidFriendly: true,
      kidSummary: summary,
      kidQuestions: [...questions, "Who would you thank?"],
    }),
  );
  if (!third.success) throw new Error("Three discussion questions should pass.");
  const orphan = storySchema.safeParse(minimalStory({ state: "OH", kidSummary: summary }));
  if (orphan.success) throw new Error("A kid summary without kidFriendly should fail.");
  const questionsOnly = storySchema.safeParse(minimalStory({ state: "OH", kidQuestions: questions }));
  if (questionsOnly.success) throw new Error("Discussion questions without kidFriendly should fail.");

  const day = "2026-10-20";
  const alpha = { slug: "alpha-story", date: "2026-10-18", kidFriendly: true };
  const bravo = { slug: "bravo-story", date: "2026-10-19", kidFriendly: true };
  const first = storyOfTheDay([alpha, bravo], day);
  const again = storyOfTheDay([bravo, alpha], day);
  if (!first || first.slug !== again?.slug) {
    throw new Error("The classroom story should stay on the same story for a date.");
  }
  const next = storyOfTheDay([alpha, bravo], "2026-10-21");
  if (!next || next.slug === first.slug) throw new Error("The classroom story should rotate across dates.");
  const today = storyOfTheDay([alpha, { slug: "today-tale", date: day, kidFriendly: true }], day);
  if (today?.slug !== "today-tale") throw new Error("A classroom story dated today should be the story of the day.");
  if (storyOfTheDay([{ ...alpha, kidFriendly: false }], day)) {
    throw new Error("A story that is not kid-friendly should not print.");
  }
  if (storyOfTheDay([{ ...alpha, draft: true }], day)) throw new Error("A draft should not be the classroom story.");
  if (storyOfTheDay([], day)) throw new Error("No classroom story means no story of the day.");

  if (parseEmailInterest("teachers") !== "teachers") throw new Error("The teacher list tag should be accepted.");
  if (parseEmailInterest("membership") !== "membership") throw new Error("Membership should stay its own tag.");
  if (parseEmailInterest("nope") !== "daily") throw new Error("Unknown email interest should stay on the daily list.");

  const places = kidPlaces();
  for (const place of places) {
    if (place.count < 1) throw new Error(`${place.path} has no classroom stories.`);
    if (place.kind === "country" && place.code === "US") throw new Error("US classroom stories belong on state pages.");
    if (place.kind === "state" && !place.path.startsWith("/kids/state/")) {
      throw new Error(`${place.path} should live under /kids/state.`);
    }
    if (place.kind === "country" && !place.path.startsWith("/kids/country/")) {
      throw new Error(`${place.path} should live under /kids/country.`);
    }
  }
  console.log(`Kid-friendly stories: ${getKidStories().length}. Places: ${places.length}.`);
}

function assertPrerenderCoversArchive(storyCount: number) {
  if (STATIC_STORY_CAP < 10_000) {
    throw new Error(`STATIC_STORY_CAP is ${STATIC_STORY_CAP}. Keep it at or above 10000 so a 10k archive stays static.`);
  }
  if (storyCount > STATIC_STORY_CAP) {
    throw new Error(
      `${storyCount} stories exceed the prerender cap of ${STATIC_STORY_CAP}. Raise STATIC_STORY_CAP. Do not switch the overflow to on-demand rendering; each crawler would invoke a function after every deploy.`,
    );
  }
  const pages = pageCount(storyCount);
  if (pages > MAX_PRERENDERED_PAGES) {
    throw new Error(`The archive is ${pages} listing pages and the cap is ${MAX_PRERENDERED_PAGES}. Raise MAX_PRERENDERED_PAGES.`);
  }
  const index = getHubIndex();
  const hubCount = index.stateCategories.length + index.cities.length + index.topics.length;
  if (hubCount > MAX_PRERENDERED_HUBS) {
    throw new Error(`${hubCount} hub pages exceed the prerender cap of ${MAX_PRERENDERED_HUBS}. Raise MAX_PRERENDERED_HUBS.`);
  }
  if (MAX_PRERENDERED_WEEKS < 2_000) {
    throw new Error(`MAX_PRERENDERED_WEEKS is ${MAX_PRERENDERED_WEEKS}. Keep it at or above 2000 so decades of weekly pages stay static.`);
  }
  const weekCount = getPublishedWeeks().length;
  if (weekCount > MAX_PRERENDERED_WEEKS) {
    throw new Error(
      `${weekCount} week pages exceed the prerender cap of ${MAX_PRERENDERED_WEEKS}. Raise MAX_PRERENDERED_WEEKS. Do not switch the overflow to on-demand rendering; each crawler would invoke a function after every deploy.`,
    );
  }
  console.log(`Prerender: ${storyCount} stories, ${pages} archive pages, ${hubCount} hubs, ${weekCount} weeks. Caps ${STATIC_STORY_CAP} / ${MAX_PRERENDERED_PAGES} / ${MAX_PRERENDERED_HUBS} / ${MAX_PRERENDERED_WEEKS}.`);
}

function sampleWeekStory(partial: Partial<WeekSource> & Pick<WeekSource, "slug" | "date">): WeekSource {
  return {
    title: `A verified good news story ${partial.slug}`,
    country: "US",
    state: "CO",
    alsoStates: [],
    category: "community",
    image: `/images/stories/${partial.slug}.webp`,
    imageAlt: "A photo from the week",
    ...partial,
  };
}

function assertWeeks() {
  if (launchWeekStart() !== "2026-10-05") throw new Error("Launch week should start Monday, October 5, 2026.");
  if (weekStart("2026-10-07") !== "2026-10-05") throw new Error("October 7 belongs to the October 5 week.");
  if (weekStart("2026-10-11") !== "2026-10-05") throw new Error("Sunday October 11 belongs to the October 5 week.");
  if (weekStart("2026-10-12") !== "2026-10-12") throw new Error("October 12 is a Monday.");
  if (weekStart("2026-10-25") !== "2026-10-19") throw new Error("October 25 belongs to the October 19 week.");
  if (formatWeekRange("2026-10-19", "2026-10-25") !== "Oct 19 to 25, 2026") {
    throw new Error("A week inside one month should read like Oct 19 to 25, 2026.");
  }
  if (formatWeekRange("2026-10-26", "2026-11-01") !== "Oct 26 to Nov 1, 2026") {
    throw new Error("A week across months should name both months.");
  }
  if (formatWeekRange("2026-12-28", "2027-01-03") !== "Dec 28, 2026 to Jan 3, 2027") {
    throw new Error("A week across years should name both years.");
  }
  const beforeMidnight = mountainDay(new Date("2026-10-20T05:30:00.000Z"));
  const afterMidnight = mountainDay(new Date("2026-10-20T07:00:00.000Z"));
  if (beforeMidnight !== "2026-10-19" || afterMidnight !== "2026-10-20") {
    throw new Error("The open week should follow Mountain Time, not UTC midnight.");
  }

  const thin = buildWeeks(
    Array.from({ length: 9 }, (_, index) => sampleWeekStory({ slug: `thin-${index}`, date: addDays("2026-10-05", index % 7) })),
    "2026-10-20",
  );
  if (thin.length) throw new Error("Nine stories should not publish a week page.");

  const beforeLaunch = buildWeeks(
    Array.from({ length: 12 }, (_, index) => sampleWeekStory({ slug: `early-${index}`, date: addDays("2026-09-28", index % 7) })),
    "2026-10-20",
  );
  if (beforeLaunch.length) throw new Error("A week that ended before launch should not be a roundup.");

  const future = buildWeeks(
    Array.from({ length: 10 }, (_, index) => sampleWeekStory({ slug: `future-${index}`, date: addDays("2026-10-26", index % 7) })),
    "2026-10-20",
  );
  if (future.length) throw new Error("A week that has not started should wait.");

  const marked = [
    sampleWeekStory({ slug: "featured-one", date: "2026-10-07", featured: true, top5: 4 }),
    sampleWeekStory({ slug: "rank-one", date: "2026-10-06", top5: 1 }),
    sampleWeekStory({ slug: "rank-two", date: "2026-10-08", top5: 2 }),
    sampleWeekStory({ slug: "world-one", date: "2026-10-09", worldPick: true, country: "JP", state: undefined, cheers: 1 }),
    sampleWeekStory({ slug: "cheered-high", date: "2026-10-05", cheers: 100, alsoStates: ["WY"] }),
    sampleWeekStory({ slug: "cheered-mid", date: "2026-10-10", cheers: 40 }),
    ...Array.from({ length: 6 }, (_, index) => sampleWeekStory({ slug: `plain-${index}`, date: addDays("2026-10-05", index % 7) })),
  ];
  const finished = buildWeeks(marked, "2026-10-20");
  if (finished.length !== 1 || finished[0].path !== "/week/2026-10-05" || finished[0].inProgress) {
    throw new Error("The October 5 week should be a finished roundup on October 20.");
  }
  const standouts = finished[0].standouts.map((story) => story.slug);
  if (standouts.join(",") !== "featured-one,rank-one,rank-two,world-one,cheered-high") {
    throw new Error(`Standouts should be homepage marks, then cheers. Got ${standouts.join(",")}.`);
  }
  if (!finished[0].standoutNote.includes("story of the day") || !finished[0].standoutNote.includes("Today's Top 5") || !finished[0].standoutNote.includes("world pick") || !finished[0].standoutNote.includes("cheered")) {
    throw new Error("The standout note should explain the marks that were used.");
  }
  if (!finished[0].intro.includes("12 verified stories") || !finished[0].intro.includes("2 states") || !finished[0].intro.includes("1 country (Japan)")) {
    throw new Error(`The intro should count stories, states, and countries. Got: ${finished[0].intro}`);
  }
  const sameDay = buildWeeks(
    [
      sampleWeekStory({ slug: "only-rank", date: "2026-10-12", top5: 1 }),
      ...Array.from({ length: 9 }, (_, index) => sampleWeekStory({ slug: `rest-${index}`, date: "2026-10-12" })),
    ],
    "2026-10-20",
  );
  if (!sameDay[0]?.standoutNote.includes("newest stories still in the week")) {
    throw new Error("Stories that fill an open standout spot should be described as the newest in the week.");
  }
  const withCapital = buildWeeks(
    [
      ...Array.from({ length: 9 }, (_, index) => sampleWeekStory({ slug: `dc-state-${index}`, date: "2026-10-12", state: "CO" })),
      sampleWeekStory({ slug: "dc-story", date: "2026-10-12", state: "DC" }),
    ],
    "2026-10-20",
  );
  if (!withCapital[0]?.intro.includes("1 state and Washington, D.C.")) {
    throw new Error(`Washington, D.C. should not be counted as a state. Got: ${withCapital[0]?.intro}`);
  }
  if (finished[0].image !== finished[0].standouts[0].image) throw new Error("The share image should be the first standout photo.");
  if (!finished[0].states.some((state) => state.slug === "wyoming")) throw new Error("alsoStates should count toward the state list.");
  if (finished[0].world.length !== 1) throw new Error("The Japan story should be in Around the World.");

  const openStories = Array.from({ length: 10 }, (_, index) =>
    sampleWeekStory({ slug: `open-${index}`, date: addDays("2026-10-19", index % 7), cheers: index === 0 ? 0 : 0 }),
  );
  const open = buildWeeks(openStories, "2026-10-20");
  if (open.length !== 1 || !open[0].inProgress || open[0].path !== "/week/2026-10-19") {
    throw new Error("The current Mountain Time week should stay open and say so far.");
  }
  if (!open[0].title.startsWith("This Week in Good News, So Far:")) throw new Error("The open week title should say so far.");
  if (!open[0].heading.includes("so far")) throw new Error("The open week heading should say so far.");
  if (open[0].rangeLabel !== "Oct 19 to 25, 2026") throw new Error("The open week range should be Oct 19 to 25, 2026.");
  const feed = renderWeekRss([...completedWeeks(finished), ...open]);
  if (!feed.includes("/week/2026-10-05") || feed.includes("/week/2026-10-19")) {
    throw new Error("The week feed should include finished weeks and leave the open week out.");
  }

  const today = mountainDay();
  const currentStart = weekStart(today);
  const weeks = getPublishedWeeks();
  const published = new Set(weeks.map((week) => week.start));
  const counts = new Map<string, number>();
  for (const story of loadAllStories()) {
    if (story.draft || story.date < launchWeekStart()) continue;
    const start = weekStart(story.date);
    if (start > currentStart) continue;
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  for (const [start, count] of counts) {
    if (count >= MIN_WEEK_STORIES && !published.has(start)) {
      throw new Error(`${start} has ${count} stories and should be a week page.`);
    }
    if (count < MIN_WEEK_STORIES && published.has(start)) {
      throw new Error(`${start} has only ${count} stories and should not be a week page.`);
    }
  }
  for (const week of weeks) {
    if (week.stories.length < MIN_WEEK_STORIES) throw new Error(`${week.path} is thinner than ${MIN_WEEK_STORIES} stories.`);
    if (week.start < launchWeekStart()) throw new Error(`${week.path} starts before launch week.`);
    if (week.start !== weekStart(week.start) || week.end !== addDays(week.start, 6)) {
      throw new Error(`${week.path} is not a Monday-to-Sunday week.`);
    }
    if (week.inProgress !== (week.start === currentStart)) throw new Error(`${week.path} has the wrong so-far flag.`);
    if (!week.standouts.length || week.image !== week.standouts[0].image) throw new Error(`${week.path} is missing a standout photo.`);
    if (!week.intro.includes(String(week.stories.length))) throw new Error(`${week.path} intro should include the story count.`);
    const grouped = week.categories.reduce((sum, category) => sum + category.stories.length, 0);
    if (grouped !== week.stories.length) throw new Error(`${week.path} should group every story by category.`);
  }
  const paths = weeks.map((week) => week.path).join(", ");
  console.log(`Weeks: ${weeks.length} roundups since ${launchWeekStart()} (${SITE_LAUNCH} launch). ${paths || "none yet"}.`);
}

function assertEnrichmentMerge() {
  const summary = "A classroom summary that is long enough for the schema when it is copied onto a story file.";
  const questions = ["What did the people in this story do?", "How could a class try something kind this week?"];
  const extra = {
    tags: ["cats", "animal-rescue"] as string[],
    kidFriendly: true as const,
    kidSummary: summary,
    kidQuestions: questions,
  };
  const filled = mergeStoryFields({}, extra);
  if (!Array.isArray(filled.tags) || filled.tags[0] !== "cats" || filled.kidFriendly !== true) {
    throw new Error("Missing front matter should take tags and classroom text from the backfill.");
  }
  const tagsWin = mergeStoryFields({ tags: ["dogs"] }, extra);
  if (!Array.isArray(tagsWin.tags) || tagsWin.tags.length !== 1 || tagsWin.tags[0] !== "dogs") {
    throw new Error("Front matter tags should win over the backfill.");
  }
  const kidsWin = mergeStoryFields({ kidFriendly: false }, extra);
  if (kidsWin.kidSummary || kidsWin.kidFriendly !== false) {
    throw new Error("Front matter classroom fields should win over the backfill.");
  }
  const emptyTags = mergeStoryFields({ tags: [] }, extra);
  if (!Array.isArray(emptyTags.tags) || emptyTags.tags.length !== 0) {
    throw new Error("An explicit empty tag list in front matter should not be replaced.");
  }

  const enrichment = loadEnrichment();
  const slugs = new Set(stories.map((story) => story.slug));
  for (const slug of Object.keys(enrichment)) {
    if (!slugs.has(slug)) throw new Error(`Enrichment slug ${slug} does not match a story file.`);
  }
  let tagged = 0;
  const untagged: string[] = [];
  for (const story of stories) {
    if (story.draft) continue;
    if (story.tags.length === 0 && !enrichment[story.slug]) {
      // A file added on main after this backfill, before its own tags land.
      // Unknown tags still fail in the schema. Do not fail the deploy for a missing list.
      untagged.push(story.slug);
      continue;
    }
    if (story.tags.length < 2 || story.tags.length > 5) {
      throw new Error(`${story.slug} should have 2 to 5 tags after the backfill merge.`);
    }
    tagged += 1;
  }
  if (untagged.length) {
    console.log(`Stories still missing tags (add them in front matter): ${untagged.join(", ")}`);
  }
  console.log(`Tagged stories: ${tagged}. Enrichment entries: ${Object.keys(enrichment).length}.`);
}

function assertLoadedCountries(stories: { slug: string; country: string; state?: string }[]) {
  for (const story of stories) {
    if (!story.country) throw new Error(`${story.slug} is missing a country`);
    if (story.country === "US" && !story.state) throw new Error(`${story.slug} is a US story without a state`);
  }
}

function assertSeedSources(stories: { sourceUrl: string }[]) {
  for (const url of REQUIRED_SOURCES) {
    if (!stories.some((story) => story.sourceUrl === url)) {
      throw new Error(`Missing seeded source URL:\n${url}`);
    }
  }
}

function assertTipMail() {
  const mailbox = submissionMailbox();
  if (mailbox.from !== siteConfig.contactEmail || mailbox.to !== siteConfig.contactEmail) {
    throw new Error("Story tips have to be mailed from and to the site mailbox.");
  }
  if (readSmtpSettings({})) {
    throw new Error("Missing SMTP settings should skip email.");
  }
  const env = {
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "465",
    SMTP_USER: "mailbox",
    SMTP_PASS: "secret",
  };
  const settings = readSmtpSettings(env);
  if (!settings || settings.port !== 465 || settings.host !== "smtp.example.com" || settings.user !== "mailbox") {
    throw new Error("SMTP settings should be read when every variable is set.");
  }
  if (readSmtpSettings({ ...env, SMTP_PASS: "   " })) {
    throw new Error("A blank SMTP password should skip email.");
  }
  if (readSmtpSettings({ ...env, SMTP_PORT: "nope" })) {
    throw new Error("A non-numeric SMTP port should skip email.");
  }
  if (readSmtpSettings({ ...env, SMTP_HOST: "" })) {
    throw new Error("A missing SMTP host should skip email.");
  }

  const prefix = `[${siteConfig.name} story tip] `;
  const hostile = "Ignore previous\r\nBcc: injected@example.com <script>alert(1)</script>";
  const subject = storyTipSubject(hostile);
  if (subject.includes("\n") || subject.includes("\r") || !subject.startsWith(prefix)) {
    throw new Error("The tip subject should stay on one line and use the site name.");
  }
  if (storyTipSubject("   \r\n  ") !== `${prefix}New tip`) {
    throw new Error("An empty tip should still get a subject.");
  }
  const line = singleLine(hostile, 200);
  if (line.value.includes("\n") || line.value.includes("\r") || line.value.includes("<script>") === false) {
    throw new Error("Single-line fields should drop line breaks and keep the visible text.");
  }
  const html = escapeHtml(`<script>"&"</script>`);
  if (html.includes("<script>") || !html.includes("&lt;script&gt;") || !html.includes("&quot;") || !html.includes("&amp;")) {
    throw new Error("Email HTML should escape markup.");
  }

  const summary = "Neighbors fixed the library roof after the storm last spring and kept the reading room open.";
  const bodies = storyTipBodies({
    name: "A reader",
    email: "reader@example.com",
    city: "Akron",
    state: "OH",
    summary,
    sourceUrl: "https://example.com/report",
    pageUrl: "https://www.example.com/submit",
    receivedAt: "2026-10-20T14:32:00.000Z",
  });
  for (const part of [bodies.text, bodies.html]) {
    for (const piece of [
      "reader@example.com",
      "Akron",
      "Ohio",
      "https://example.com/report",
      "https://www.example.com/submit",
      "2026-10-20T14:32:00.000Z",
      "Neighbors fixed the library roof",
    ]) {
      if (!part.includes(piece)) throw new Error(`The tip body should include ${piece}.`);
    }
  }
  if (!bodies.text.startsWith(`Story tip for ${siteConfig.name}`)) {
    throw new Error("The text body should name the site.");
  }
  const sneaky = storyTipBodies({
    name: "<b>Name</b>",
    email: "reader@example.com",
    city: "Akron",
    state: "OH",
    summary: `<script>alert(1)</script> ${summary}`,
    sourceUrl: "https://user:pass@example.com/secret",
    pageUrl: "javascript:alert(1)",
    receivedAt: "2026-10-20T14:32:00.000Z",
  });
  if (sneaky.html.includes("<script>") || sneaky.html.includes("<b>")) {
    throw new Error("Submitted fields should be escaped in the HTML email.");
  }
  if (sneaky.html.includes("javascript:") || sneaky.text.includes("javascript:")) {
    throw new Error("Unsafe page URLs should be left out of the email.");
  }
  if (sneaky.text.includes("user:pass") || sneaky.html.includes("user:pass")) {
    throw new Error("Source URLs with passwords should be left out of the email.");
  }
  if (!cleanHttpUrl("https://example.com/a")) throw new Error("https URLs should be kept.");
  if (cleanHttpUrl("javascript:alert(1)")) throw new Error("Script URLs should be dropped.");
}

function assertOnlyMailbox() {
  const expected = `cheers@${siteConfig.domain}`;
  if (siteConfig.contactEmail !== expected) {
    throw new Error(`contactEmail must be the only mailbox, ${expected}.`);
  }
  const pattern = new RegExp(`[A-Za-z0-9._%+-]+@${siteConfig.domain.replaceAll(".", "\\.")}`, "gi");
  const skip = new Set(["node_modules", ".next", ".git", "public", "assets", "data"]);
  const hits: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|mjs|md|css|json|yml|yaml|html|example|txt)$/.test(entry.name)) continue;
      if (entry.name === "package-lock.json") continue;
      const text = fs.readFileSync(full, "utf8");
      const found = text.match(pattern) ?? [];
      for (const address of found) {
        if (address.toLowerCase() !== expected) {
          hits.push(`${path.relative(process.cwd(), full)} contains ${address}`);
        }
      }
    }
  }

  walk(process.cwd());
  if (hits.length) {
    throw new Error(`Every public address has to be ${expected}:\n- ${hits.join("\n- ")}`);
  }
}

function assertBrandLivesInOneFile() {
  const needles = [
    siteConfig.name,
    siteConfig.domain,
    siteConfig.logoText,
    ...Object.values(siteConfig.social),
  ].filter((value, index, all) => value && all.indexOf(value) === index);

  const allow = new Set(["site.config.ts", "README.md"]);
  const skip = new Set(["node_modules", ".next", ".git", "public", "assets", "data"]);
  const hits: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|mjs|md|css|json|yml|yaml|html)$/.test(entry.name)) continue;
      if (entry.name === "package-lock.json") continue;
      const rel = path.relative(process.cwd(), full);
      if (allow.has(rel)) continue;
      const text = fs.readFileSync(full, "utf8");
      for (const needle of needles) {
        if (text.includes(needle)) hits.push(`${rel} contains “${needle}”`);
      }
    }
  }

  walk(process.cwd());
  if (hits.length) {
    throw new Error(`Brand strings must live in site.config.ts (README may mention them):\n- ${hits.join("\n- ")}`);
  }
}

function decodeXml(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"');
}

function assertFeeds() {
  const links = socialLinks();
  const expected = `https://x.com/${siteConfig.social.x}`;
  if (links.length !== 1 || links[0]?.href !== expected) {
    throw new Error("Footer and structured data should list only confirmed social accounts.");
  }

  const rss = renderRss();
  if (rss.includes("xmlns:snf") || rss.includes("<snf:") || rss.includes("xmlns:nb")) {
    throw new Error("Section RSS feeds must not carry the SmartNews or NewsBreak namespaces.");
  }
  const main = renderRss({ newsBreak: true });
  if (!main.includes('xmlns:nb="https://www.newsbreak.com/"')) {
    throw new Error("The main RSS feed must declare the NewsBreak namespace.");
  }
  if (/<item>[\s\S]*?<author>/.test(main)) {
    throw new Error("RSS items should use dc:creator and not author.");
  }
  const descriptions = [...main.matchAll(/<description>([^<]*)<\/description>/g)].slice(1).map((match) => decodeXml(match[1] ?? ""));
  const short = descriptions.filter((text) => text.length < 300);
  if (short.length) throw new Error(`${short.length} RSS descriptions are under 300 characters.`);
  const dates = [...main.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((match) => match[1]);
  if (new Set(dates).size !== dates.length) throw new Error("RSS pubDates must be unique.");

  const smart = renderSmartNews();
  if (!smart.includes("<snf:logo>") || !smart.includes("<snf:darkModeLogo>")) {
    throw new Error("The SmartNews feed needs the light and dark logos.");
  }
  if (smart.includes("<author>") || smart.includes("xmlns:nb")) {
    throw new Error("The SmartNews feed should not include item author or the NewsBreak namespace.");
  }
  if (SMARTNEWS_DESCRIPTION.length > 30) throw new Error("SmartNews channel description must be 30 characters or less.");
  const channel = smart.match(/<description>([^<]*)<\/description>/);
  if (channel?.[1] !== SMARTNEWS_DESCRIPTION) throw new Error("SmartNews channel description does not match the short line.");

  const sample = getPublishedStories()[0];
  if (sample) {
    const html = storyHtml(sample);
    if (!html.includes("<strong>How to help:</strong>")) throw new Error("Feed bodies need a How to help paragraph.");
    if (html.includes("More good news")) throw new Error("Feed bodies must not add a related-stories list.");
  }
}

function assertImageVariants() {
  const versioned = "/images/stories/pony-v2.webp";
  if (storyThumbPath(versioned) !== "/images/stories/pony-v2-sm.webp") {
    throw new Error("Thumbnail path dropped the version stem.");
  }
  if (largeJpegPath(versioned) !== "/images/stories/pony-v2-1600.jpg") {
    throw new Error("Large JPEG path dropped the version stem.");
  }
  if (storyThumbPath("/images/stories/pony.webp") !== "/images/stories/pony-sm.webp") {
    throw new Error("Unversioned thumbnail path changed.");
  }
}

function sampleStory(extra: Partial<NewsBreakStory> = {}): NewsBreakStory {
  return {
    slug: "sample",
    title: "Neighbors planted a library garden",
    dek: "A short verified summary with enough words to stand as a sentence.",
    body: "Volunteers filled the beds and left the gate open for anyone who wanted tomatoes.",
    tags: [],
    sourceName: "A local paper",
    ...extra,
  };
}

function assertNewsBreak() {
  const election = heavyNewsReason(sampleStory({ title: "A town election ends tonight", dek: "Voters chose a new council in a quiet count." }));
  if (!election || !/election/i.test(election)) throw new Error("An election story should be filtered off the news break.");
  if (!isHeavyNews(sampleStory({ body: "Witnesses described a shooting on the block before help arrived." }))) {
    throw new Error("A shooting story should be filtered off the news break.");
  }
  if (!isHeavyNews(sampleStory({ body: "The department reviewed a use of force from the weekend call." }))) {
    throw new Error("A use-of-force story should be filtered off the news break.");
  }
  if (!isHeavyNews(sampleStory({ tags: ["election"] }))) throw new Error("An election tag should be filtered.");
  if (!isHeavyNews(sampleStory({ tags: ["use-of-force"] }))) throw new Error("A use-of-force tag should be filtered.");
  if (!isHeavyNews(sampleStory({ body: "Congress passed a measure the town had asked for." }))) {
    throw new Error("A Congress story should be filtered when it is not a street address.");
  }
  if (!isHeavyNews(sampleStory({ body: "She spoke at a congressional hearing about the park." }))) {
    throw new Error("A congressional story should be filtered.");
  }
  if (!isHeavyNews(sampleStory({ dek: "The contest counted nearly a third of all ballots." }))) {
    throw new Error("The word ballot should be filtered.");
  }

  const kept = [
    sampleStory({ body: "The shaded vines grew longer shoots than the vines in full sun." }),
    sampleStory({ dek: "It replaces a daily basal shot with one a week." }),
    sampleStory({ body: "The library board president said the greenhouse is open during library hours." }),
    sampleStory({ body: "The town inaugurated a seed cabinet anyone can use." }),
    sampleStory({ body: "Grauer's gorillas live only in the eastern Democratic Republic of the Congo." }),
    sampleStory({
      sourceName: "Times Republican",
      body: "The Times Republican reported that the library greenhouse is growing tomatoes.",
    }),
    sampleStory({
      sourceName: "Arkansas Democrat-Gazette",
      body: "The Arkansas Democrat-Gazette reported that the trail is open.",
    }),
    sampleStory({
      sourceName: "The Cynthiana Democrat",
      body: "The Cynthiana Democrat reported the welcome-home crowd.",
    }),
    sampleStory({ tags: ["police"] }),
    sampleStory({ body: "The playground opened at 1310 Old Congress Ave. in West Palm Beach." }),
    sampleStory({ imageCaption: "Illustrative photo from the Library of Congress." }),
  ];
  const falsePositive = kept.find((story) => isHeavyNews(story));
  if (falsePositive) {
    throw new Error(`News break filter rejected a calm story: ${heavyNewsReason(falsePositive)}`);
  }

  const line = quickReadLine(
    "When the driver could not catch her breath, a fifth grader called her dad. He boarded the bus and called for help.",
  );
  if (line !== "When the driver could not catch her breath, a fifth grader called her dad.") {
    throw new Error(`Quick-read line split in the wrong place: ${line}`);
  }
  if (quickReadLine("U.S. Fish and Wildlife opened a short refuge trail for visitors this month.") !== "U.S. Fish and Wildlife opened a short refuge trail for visitors this month.") {
    throw new Error("A short first fragment should keep the whole dek.");
  }

  if (newsBreakBanner.start !== "2026-10-31" || newsBreakBanner.end !== "2026-11-06") {
    throw new Error("News break banner window should be 2026-10-31 through 2026-11-06.");
  }
  if (newsBreakBanner.timeZone !== "America/New_York") {
    throw new Error("News break banner should use the edition time zone.");
  }
  const windowCases: [string, boolean][] = [
    ["2026-10-30T23:30:00-04:00", false],
    ["2026-10-31T00:30:00-04:00", true],
    ["2026-10-31T03:30:00.000Z", false],
    ["2026-11-03T15:00:00.000Z", true],
    ["2026-11-07T03:30:00.000Z", true],
    ["2026-11-07T05:00:00.000Z", false],
  ];
  for (const [iso, expected] of windowCases) {
    const actual = isNewsBreakBannerActive(new Date(iso));
    if (actual !== expected) throw new Error(`Banner window for ${iso}: expected ${expected}, got ${actual}.`);
  }

  const banned = /\b(elections?|midterms?|ballots?|democrats?|republicans?|shootings?|congress|senators?)\b/i;
  const page = fs.readFileSync(path.join(process.cwd(), "app/news-break/page.tsx"), "utf8");
  const banner = fs.readFileSync(path.join(process.cwd(), "components/news-break-banner.tsx"), "utf8");
  const hubs = newsBreakHubs();
  const copy = [page, banner, NEWS_BREAK_TITLE, NEWS_BREAK_DESCRIPTION, newsBreakBanner.label, ...hubs.map((hub) => `${hub.title} ${hub.text} ${hub.cta}`)].join("\n");
  const bannedHit = copy.match(banned);
  if (bannedHit) throw new Error(`News break copy contains “${bannedHit[0]}”.`);
  if (!page.includes('id="daily-email"') && !page.includes("id=\"daily-email\"")) {
    throw new Error("News break page should use the existing email signup.");
  }
  if (!page.includes("max-image-preview")) throw new Error("News break metadata should allow a large image preview.");

  const allowed = new Set(["/kids", "/week", "/local", "/help", "/topic/kindness"]);
  for (const hub of hubs) {
    if (!allowed.has(hub.href)) throw new Error(`News break linked a hub that was not confirmed: ${hub.href}`);
  }
  for (const href of ["/kids", "/week", "/local", "/help"]) {
    if (!hubs.some((hub) => hub.href === href)) throw new Error(`News break is missing ${href}.`);
  }
  if (!getHubIndex().byPath.has("/topic/kindness") || !hubs.some((hub) => hub.href === "/topic/kindness")) {
    throw new Error("News break should link the kindness topic that already exists.");
  }
  const absent = ["/quiz", "/explainers", "/on-this-day", "/kindness-challenge"];
  if (hubs.some((hub) => absent.includes(hub.href))) throw new Error("News break linked a hub that does not exist.");

  const schema = newsBreakJsonLd({
    name: NEWS_BREAK_TITLE,
    description: NEWS_BREAK_DESCRIPTION,
    path: newsBreakBanner.path,
    stories: [{ slug: "sample", title: "Neighbors planted a library garden" }],
  });
  const node = schema["@graph"][0] as { "@type": string[] };
  if (!node["@type"].includes("WebPage") || !node["@type"].includes("CollectionPage")) {
    throw new Error("News break schema should be a WebPage and a CollectionPage.");
  }

  const sitemap = fs.readFileSync(path.join(process.cwd(), "app/sitemap.ts"), "utf8");
  const footer = fs.readFileSync(path.join(process.cwd(), "components/footer.tsx"), "utf8");
  if (!sitemap.includes("newsBreakBanner.path")) throw new Error("Sitemap is missing the news break page.");
  if (!footer.includes("newsBreakBanner.path")) throw new Error("Footer is missing the news break link.");

  const published = getPublishedStories();
  const top = newsBreakTop(published);
  if (top.length < 5) throw new Error("News break should fill five stories from the current archive.");
  if (top.some((story) => isHeavyNews(story))) throw new Error("News break top included a filtered story.");
  const featured = published.find((story) => story.featured && !isHeavyNews(story));
  if (featured && top[0]?.slug !== featured.slug) throw new Error("The story of the day should lead the news break.");
  const ranks = top.slice(1).flatMap((story) => (story.top5 ? [story.top5] : []));
  for (let index = 1; index < ranks.length; index += 1) {
    if (ranks[index]! < ranks[index - 1]!) throw new Error("Ranked stories after the lead should stay in order.");
  }
  const quick = newsBreakQuickRead(published, top.map((story) => story.slug));
  const topSlugs = new Set(top.map((story) => story.slug));
  if (!quick.length || quick.some((story) => topSlugs.has(story.slug) || isHeavyNews(story))) {
    throw new Error("The 60-second list should be calm stories that are not already in the five.");
  }

  const keep = [
    "cedar-rapids-bus-hero",
    "albion-library-greenhouse",
    "tshiaberimu-gorilla-birth",
    "little-rock-south-lake-trails",
    "fayetteville-immerse-arkansas",
    "cynthiana-honor-flight",
    "laterza-agrivoltaic-grapes",
    "silver-spring-awiqli",
    "west-palm-addys-playground",
  ];
  for (const slug of keep) {
    const story = published.find((item) => item.slug === slug);
    if (story && isHeavyNews(story)) throw new Error(`${slug} should stay on the news break page.`);
  }
  const ginkgo = published.find((story) => story.slug === "geelong-ginkgo-tree");
  if (ginkgo && !isHeavyNews(ginkgo)) {
    throw new Error("The Geelong tree story uses ballots and should stay off this page.");
  }
  const policeHeavy = published.filter((story) => story.tags.includes("police") && isHeavyNews(story));
  if (policeHeavy.length) {
    throw new Error(`A police tag alone should not exclude stories: ${policeHeavy.map((story) => story.slug).join(", ")}`);
  }
  const excluded = published.filter((story) => isHeavyNews(story));
  console.log(`News break filter excluded ${excluded.length}: ${excluded.map((story) => `${story.slug} (${heavyNewsReason(story)})`).join(", ") || "none"}.`);
}

const stories = loadAllStories();
assertImageVariants();
assertNewsBreak();
assertSchemaRejectsGarbage();
assertCountryRules();
assertWorldSpotlight();
assertHubs();
assertKidClassrooms();
assertWeeks();
assertPrerenderCoversArchive(stories.filter((story) => !story.draft).length);
assertEnrichmentMerge();
assertLoadedCountries(stories);
assertSeedSources(stories);
assertTipMail();
assertOnlyMailbox();
assertBrandLivesInOneFile();
assertFeeds();
const published = stories.filter((story) => !story.draft);
const images = feedImageReport(published.map((story) => story.image));
console.log(`Validated ${stories.length} stories. Feed images: ${images.large} large JPEGs, ${images.fallback} WebP fallbacks.`);
