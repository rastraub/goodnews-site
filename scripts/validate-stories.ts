import fs from "fs";
import path from "path";
import {
  CLASSROOM_QUESTIONS,
  EXCLUSION_RULES,
  FIRST_RESPONDERS_DAY_PATH,
  FIRST_RESPONDERS_RESOLUTION_URL,
  THANK_YOU_LINKS,
  assignedRoles,
  buildFirstRespondersDayHub,
  emptyEditorConfig,
  exclusionLabel,
  firstRespondersDayInSeason,
  getFirstRespondersDayHub,
  isFirstResponderCandidate,
  loadFirstRespondersEditorConfig,
  parseFirstRespondersEditorConfig,
  readsAsPositive,
  storyQualifies,
} from "../lib/first-responders-day";
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
import sitemap from "../app/sitemap";
import { worldSpotlight } from "../lib/world-pick";
import { readSmtpSettings, submissionMailbox } from "../lib/smtp";
import { cleanHttpUrl, escapeHtml, singleLine, storyTipBodies, storyTipSubject } from "../lib/tip-mail";
import { siteConfig, socialLinks } from "../site.config";

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

function assertFirstRespondersDay() {
  const cardiac = {
    title: "A deputy is home after cardiac arrest",
    dek: "EMS resuscitated him and he was later discharged.",
    body: "No further victims were suspected. Survival after cardiac arrest is uncommon.",
  };
  if (exclusionLabel(cardiac)) throw new Error("Cardiac arrest, discharged, and suspected must stay on the hub.");
  const shooting = {
    title: "Officers shot a suspect after a pursuit",
    dek: "Police shot and killed a suspect after a high-speed chase.",
    body: "The department described the use of force.",
  };
  const blocked = exclusionLabel(shooting);
  if (!blocked) throw new Error("A shooting, pursuit, and suspect story should be excluded.");
  if (!EXCLUSION_RULES.some((rule) => rule.label === blocked)) {
    throw new Error(`Unexpected exclusion label ${blocked}.`);
  }
  const politics = {
    title: "A political rally for a candidate",
    dek: "The election night party filled a station parking lot.",
    body: "Partisan signs lined the sidewalk.",
  };
  if (!exclusionLabel(politics)) throw new Error("A political story should be excluded.");
  if (
    exclusionLabel({
      title: "Firefighters saved a neighbor",
      dek: "The crew pulled her out and she is safe.",
      body: "The rescue was finished before sunrise.",
    })
  ) {
    throw new Error("A rescue should not match the exclusion list.");
  }

  const published = getPublishedStories();
  const base = published.find((story) => story.slug === "dayton-officer-mote");
  if (!base) throw new Error("Expected the Dayton officer story in the archive.");
  const older = {
    ...base,
    slug: "oh-old",
    date: "2026-01-01",
    title: "Firefighters saved a family in Dayton",
    dek: "The crew pulled everyone out of the house before the roof fell.",
    body: "Firefighters saved the family and stayed until everyone was safe.",
    tags: ["first-responders", "firefighters"],
    state: "OH",
    alsoStates: [],
  };
  const newerCamp = {
    ...older,
    slug: "oh-new",
    date: "2026-10-20",
    title: "A firefighter camp opened in Dayton",
    dek: "The department hosted a free training camp for neighbors.",
    body: "The camp was a kindness for people who wanted to learn the work.",
    tags: ["first-responders", "firefighters"],
  };
  const violent = {
    ...older,
    slug: "oh-shooting",
    title: "Officers shot a suspect after a pursuit",
    dek: "Police shot and killed a suspect after a high-speed chase.",
    body: "The use of force was reviewed the next day.",
  };
  const neutral = {
    ...older,
    slug: "oh-budget",
    title: "The department budget was on a meeting agenda",
    dek: "Council members discussed vehicles and radios for the year.",
    body: "The meeting covered equipment costs and staffing charts for next year.",
    tags: ["first-responders"],
  };

  const auto = buildFirstRespondersDayHub([older, newerCamp, neutral], emptyEditorConfig(), 2026);
  const ohio = auto.slots.find((slot) => slot.state.code === "OH");
  if (ohio?.story?.slug !== "oh-old") throw new Error("A rescue should beat a newer camp when both are in the same state.");
  if (auto.stories.some((story) => story.slug === "oh-budget")) throw new Error("A budget story should not auto-fill the hub.");
  if (auto.stories.some((story) => story.slug === "oh-shooting")) throw new Error("A shooting fixture leaked onto the hub.");
  if (!auto.roles.find((role) => role.slug === "fire")?.stories.some((item) => item.story.slug === "oh-old")) {
    throw new Error("The Dayton rescue should land in the firefighter group.");
  }

  const pinnedConfig = emptyEditorConfig();
  pinnedConfig.states = { OH: "oh-new" };
  const pinned = buildFirstRespondersDayHub([older, newerCamp], pinnedConfig, 2027);
  const pinnedOhio = pinned.slots.find((slot) => slot.state.code === "OH");
  if (!pinnedOhio?.pinned || pinnedOhio.story?.slug !== "oh-new") throw new Error("A state pin should replace the automatic pick.");
  if (pinned.year !== 2027) throw new Error("The hub year should follow the year passed in.");

  const rolePin = emptyEditorConfig();
  rolePin.roles.ems = ["oh-old"];
  const moved = buildFirstRespondersDayHub([older], rolePin, 2026);
  if (moved.roles.find((role) => role.slug === "fire")?.stories.some((item) => item.story.slug === "oh-old")) {
    throw new Error("A role pin should take the story out of the automatic group.");
  }
  const emsPin = moved.roles.find((role) => role.slug === "ems")?.stories.find((item) => item.story.slug === "oh-old");
  if (!emsPin?.pinned) throw new Error("A role pin should show in that group and say it is pinned.");

  const blockedPin = emptyEditorConfig();
  blockedPin.states = { OH: "oh-shooting" };
  const blockedHub = buildFirstRespondersDayHub([older, violent], blockedPin, 2026);
  if (!blockedHub.pinErrors.some((error) => error.includes("OH") && error.includes("oh-shooting"))) {
    throw new Error("A pin that fails the content filter should be an error.");
  }
  if (blockedHub.stories.some((story) => story.slug === "oh-shooting")) {
    throw new Error("A rejected pin should not publish the shooting story.");
  }

  const excluded = emptyEditorConfig();
  excluded.exclude = ["oh-old"];
  const hidden = buildFirstRespondersDayHub([older, newerCamp], excluded, 2026);
  if (hidden.stories.some((story) => story.slug === "oh-old")) throw new Error("An editor exclude should remove the story.");
  if (hidden.pinErrors.length) throw new Error(`A real slug on the exclude list should not be an error: ${hidden.pinErrors.join("; ")}`);

  const missingExclude = emptyEditorConfig();
  missingExclude.exclude = ["not-a-real-story"];
  const missing = buildFirstRespondersDayHub([older], missingExclude, 2026);
  if (!missing.pinErrors.some((error) => error.includes("not-a-real-story"))) {
    throw new Error("An exclude slug that is not published should fail.");
  }

  if (!readsAsPositive(older) || !storyQualifies(older, emptyEditorConfig())) {
    throw new Error("The rescue fixture should qualify.");
  }
  if (readsAsPositive(neutral)) throw new Error("A budget agenda should not read as rescue, help, or kindness.");
  if (storyQualifies(violent, emptyEditorConfig())) throw new Error("Keyword exclusion should block a story before ranking.");
  if (!isFirstResponderCandidate(older)) throw new Error("A tagged story should be a candidate.");
  if (isFirstResponderCandidate({ ...older, draft: true, tags: ["first-responders"] })) {
    throw new Error("A draft should not be a candidate.");
  }

  const henefer = published.find((story) => story.slug === "henefer-coach-cpr");
  const mission = published.find((story) => story.slug === "mission-viejo-garage-fire");
  const pittsburgh = published.find((story) => story.slug === "pittsburgh-concord-fire");
  const elko = published.find((story) => story.slug === "elko-midflight-baby");
  const pinkham = published.find((story) => story.slug === "pinkham-glen-ellis-rescue");
  if (!henefer || !mission || !pittsburgh || !elko || !pinkham) throw new Error("Expected first-responder fixtures in the archive.");
  const liveConfig = emptyEditorConfig();
  if (assignedRoles(henefer, liveConfig).includes("dispatch")) {
    throw new Error("A dispatcher named only in the body should not file the story under dispatch.");
  }
  if (assignedRoles(mission, liveConfig).includes("fire")) {
    throw new Error("Firefighters who only arrived after a neighbor's rescue should not take the firefighter group.");
  }
  if (!assignedRoles(pittsburgh, liveConfig).includes("fire")) throw new Error("Pittsburgh should group as firefighters.");
  if (!assignedRoles(base, liveConfig).includes("police")) throw new Error("The Dayton officer story should group as police.");
  if (!assignedRoles(elko, liveConfig).includes("ems")) throw new Error("The Elko flight crew should group as EMS.");
  if (!assignedRoles(pinkham, liveConfig).includes("search-and-rescue")) {
    throw new Error("The Glen Ellis story should group as search and rescue.");
  }

  for (const year of [2025, 2026, 2027]) {
    if (!firstRespondersDayInSeason(`${year}-10-21`) || !firstRespondersDayInSeason(`${year}-10-28`) || !firstRespondersDayInSeason(`${year}-10-29`)) {
      throw new Error(`The banner should show October 21 through 29 in ${year}.`);
    }
    if (firstRespondersDayInSeason(`${year}-10-20`) || firstRespondersDayInSeason(`${year}-10-30`) || firstRespondersDayInSeason(`${year}-11-01`)) {
      throw new Error(`The banner should stay off outside October 21 through 29 in ${year}.`);
    }
  }
  if (firstRespondersDayInSeason("October 28")) throw new Error("A banner date has to be YYYY-MM-DD.");

  const emptyPins = parseFirstRespondersEditorConfig({
    exclude: [],
    states: {},
    roles: { fire: [], police: [], ems: [], dispatch: [], "search-and-rescue": [] },
  });
  if (emptyPins.exclude.length || Object.keys(emptyPins.states).length) throw new Error("An empty config should mean no pins.");
  for (const value of [{ exclude: ["Not A Slug"] }, { states: { Ohio: "dayton-officer-mote" } }, { extra: true }, ["exclude"]]) {
    let threw = false;
    try {
      parseFirstRespondersEditorConfig({ ...emptyEditorConfig(), ...(value as object) });
    } catch {
      threw = true;
    }
    if (!threw) throw new Error(`Config should reject ${JSON.stringify(value)}`);
  }

  const config = loadFirstRespondersEditorConfig();
  const live = getFirstRespondersDayHub();
  const rebuilt = buildFirstRespondersDayHub(published, config, live.year);
  if (live.pinErrors.length || rebuilt.pinErrors.length) {
    throw new Error(`First Responders Day config: ${[...live.pinErrors, ...rebuilt.pinErrors].join("; ")}`);
  }
  if (live.slots.length !== 51 || live.covered.length + live.gaps.length !== 51) {
    throw new Error("The hub should have one slot for every state and Washington, D.C.");
  }
  if (live.covered.length < 10) throw new Error("The hub should render real archive stories.");
  for (const role of ["fire", "police", "ems", "search-and-rescue"] as const) {
    if (!live.roles.find((item) => item.slug === role)?.stories.length) {
      throw new Error(`The ${role} group should include at least one archive story.`);
    }
  }
  if (!live.roles.some((role) => role.slug === "dispatch")) throw new Error("The dispatcher group should be on the page even when it is empty.");
  for (const story of live.stories) {
    if (exclusionLabel(story)) throw new Error(`${story.slug} is on the hub but matches the content filter.`);
    if (config.exclude.includes(story.slug)) throw new Error(`${story.slug} is excluded and still on the hub.`);
    if (!isFirstResponderCandidate(story)) throw new Error(`${story.slug} is on the hub without a first-responder tag.`);
  }
  if (!live.imageStory || !live.stories.some((story) => story.slug === live.imageStory?.slug)) {
    throw new Error("The social image has to be a story that is actually on the hub.");
  }
  if (live.gaps.some((slot) => slot.story) || live.covered.some((slot) => !slot.story)) {
    throw new Error("Open states and filled states got mixed up.");
  }
  for (const link of THANK_YOU_LINKS) {
    if (link.external && !link.href.startsWith("https://")) throw new Error(`${link.label} should use https.`);
  }
  const hosts = THANK_YOU_LINKS.map((link) => link.href).join(" ");
  if (!hosts.includes("cpr.heart.org") || !hosts.includes("redcrossblood.org") || !hosts.includes("911.gov")) {
    throw new Error("Thanks links should point at the American Heart Association, the Red Cross, and 911.gov.");
  }
  if (!FIRST_RESPONDERS_RESOLUTION_URL.startsWith("https://www.congress.gov/")) {
    throw new Error("The resolution citation should be the congress.gov page.");
  }
  if (CLASSROOM_QUESTIONS.length !== 3) throw new Error("The classroom corner needs 3 discussion questions.");

  const urls = sitemap().map((entry) => entry.url);
  if (!urls.some((url) => url.endsWith(FIRST_RESPONDERS_DAY_PATH))) {
    throw new Error("The sitemap should include the First Responders Day hub.");
  }
  const indexNow = fs.readFileSync(path.join(process.cwd(), "scripts/indexnow.ts"), "utf8");
  if (!indexNow.includes("FIRST_RESPONDERS_DAY_PATH")) throw new Error("IndexNow should ping the First Responders Day hub.");
  const home = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
  if (!home.includes("FirstRespondersDayBanner")) throw new Error("The homepage should mount the First Responders Day banner.");
  const footer = fs.readFileSync(path.join(process.cwd(), "components/footer.tsx"), "utf8");
  if (!footer.includes("FIRST_RESPONDERS_DAY_PATH")) throw new Error("The footer should link to the First Responders Day hub.");
  const topic = fs.readFileSync(path.join(process.cwd(), "components/hub-browse.tsx"), "utf8");
  if (!topic.includes("FIRST_RESPONDERS_DAY_PATH")) throw new Error("The first-responders topic page should link to the hub.");
  const page = fs.readFileSync(path.join(process.cwd(), "app/first-responders-day/page.tsx"), "utf8");
  if (!page.includes("siteConfig.editor.name") || !page.includes("CLASSROOM_QUESTIONS") || !page.includes("THANK_YOU_LINKS")) {
    throw new Error("The hub page should use the masthead byline, classroom questions, and thanks links.");
  }
  if (!page.includes("listingJsonLd") || !page.includes("EmailSignup") || !page.includes("ShareButtons")) {
    throw new Error("The hub page should include schema, a newsletter signup, and share text.");
  }
  if (page.includes("Jane ") || page.includes("By John")) throw new Error("The hub byline should not use a personal name.");

  const missingStates = live.gaps.map((slot) => slot.state.name);
  console.log(
    missingStates.length
      ? `First Responders Day: ${live.covered.length} of ${live.slots.length} places covered. Still open: ${missingStates.join(", ")}`
      : `First Responders Day: all ${live.slots.length} places covered.`,
  );
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

const stories = loadAllStories();
assertImageVariants();
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
assertFirstRespondersDay();
const published = stories.filter((story) => !story.draft);
const images = feedImageReport(published.map((story) => story.image));
console.log(`Validated ${stories.length} stories. Feed images: ${images.large} large JPEGs, ${images.fallback} WebP fallbacks.`);
