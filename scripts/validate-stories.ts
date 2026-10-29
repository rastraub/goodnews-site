import fs from "fs";
import path from "path";
import { parseEmailInterest } from "../lib/email";
import { loadEnrichment, mergeStoryFields } from "../lib/enrichment";
import { SMARTNEWS_DESCRIPTION, renderRss, renderSmartNews, storyHtml } from "../lib/feed";
import { feedImageReport } from "../lib/feed-image";
import { largeJpegPath, storyThumbPath } from "../lib/images";
import { citySlug } from "../lib/cities";
import { formatCityReport } from "../lib/city-report";
import {
  CLASSROOM_INDEX_DESCRIPTION,
  CLASSROOM_INDEX_PATH,
  CLASSROOM_INDEX_TITLE,
  PACK_SIZE,
  buildClassroomPacks,
  getClassroomPacks,
  isClassroomReady,
  packQuestions,
  packVocabulary,
  selectPackStories,
  whereInTheWorld,
  type PackCandidate,
} from "../lib/classroom-pack";
import { buildHubs, getHubIndex, indexableHubs, MAX_PRERENDERED_HUBS, MIN_CITY_INDEX_STORIES, MIN_HUB_STORIES, slugify, type HubStory } from "../lib/hubs";
import { getStateByCode } from "../lib/states";
import { getKidStories, kidPlaces, storyOfTheDay } from "../lib/kids";
import { assertListenText } from "../lib/listen-text";
import { classroomJsonLd } from "../lib/seo";
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
import {
  FIRST_INDEX_MONTH,
  MAX_PRERENDERED_INDEXES,
  buildIndexes,
  formatPerMillion,
  getPublishedIndexes,
  helpUrlKey,
  isSupportKind,
  monthEnd,
  monthKey,
  renderIndexCsv,
  stateIndexLink,
  storiesPerMillion,
  type IndexStory,
} from "../lib/good-news-index";
import { renderIndexMap } from "../components/index-map";
import { POPULATION_US_TOTAL, populationOf, populationTotal } from "../lib/population";
import { absoluteUrl } from "../lib/seo";
import { STATES } from "../lib/states";
import { buildOutlets, formatOutletCsv, getOutletForStory, getOutlets, outletNameKey, type OutletCredit } from "../lib/outlets";
import { monthDayFromIso, onThisDayPath, parseMonthDaySlug } from "../lib/calendar-day";
import { loadOnThisDay, storiesForMonthDay } from "../lib/on-this-day";
import { onThisDayFileSchema } from "../lib/on-this-day-schema";
import { storySchema } from "../lib/story-schema";
import { thanksBannerVisible, thanksBoard, thanksSeason } from "../lib/thanks";
import { getPublishedStories, getStory, loadAllStories, type Story } from "../lib/stories";
import { quizShareText, quizShareUrl } from "../lib/quiz-copy";
import {
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
  buildQuizzes,
  quizChoiceLabel,
  quizJsonLd,
  type QuizQuestion,
  type QuizSource,
} from "../lib/quiz";
import { stateName } from "../lib/states";
import { explainerSchema } from "../lib/explainer-schema";
import { explainerMatchesStory, explainerPaths, explainersForStory, getPublishedExplainers, storiesForExplainer } from "../lib/explainers";
import { GIVING_TUESDAY_PINS } from "../lib/giving-tuesday-pins";
import {
  buildGivingGuide,
  freeActionOf,
  isGivingTuesdaySeason,
  organizationName,
  type GivingStory,
} from "../lib/giving-tuesday";
import { compareStateStories, pickStateStories, type StateHubStory } from "../lib/state-story-hub";
import {
  buildVeteransDayHub,
  getVeteransDayHub,
  isVeteranStory,
  loadVeteransDayPins,
  parseVeteransDayPins,
  veteranStoryQuality,
  veteransDayInSeason,
  VETERANS_DAY_PATH,
} from "../lib/veterans-day";
import { worldSpotlight } from "../lib/world-pick";
import sitemap from "../app/sitemap";
import { readSmtpSettings, submissionMailbox } from "../lib/smtp";
import { cleanHttpUrl, escapeHtml, singleLine, storyTipBodies, storyTipSubject } from "../lib/tip-mail";
import { BADGE_VARIANTS, badgeSvg } from "../lib/badges";
import { badgeEmbedHtml, embedDocumentForSlug, embedScriptSource, iframeSnippet, renderEmbedDocument, storyShareLines } from "../lib/partner-kit";
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
  const alone = buildHubs([hubStory({ slug: "one" })]);
  const oneDenver = alone.cities.find((hub) => hub.path === "/state/colorado/city/denver");
  if (!oneDenver || oneDenver.count !== 1 || oneDenver.indexable) {
    throw new Error("A single city story should render a noindex city page.");
  }
  if (alone.stateCategories.length || alone.topics.length) {
    throw new Error("One story should not publish a state topic or tag hub.");
  }
  const thin = buildHubs([
    hubStory({ slug: "one" }),
    hubStory({ slug: "two", date: "2026-10-02" }),
  ]);
  const twoDenver = thin.cities.find((hub) => hub.path === "/state/colorado/city/denver");
  if (!twoDenver || twoDenver.count !== 2 || !twoDenver.indexable) {
    throw new Error("Two stories in one city should be an indexable city hub.");
  }
  if (thin.stateCategories.length || thin.topics.length) {
    throw new Error("Two stories should not publish a state topic or tag hub.");
  }
  const mixed = buildHubs([
    hubStory({ slug: "a", city: "DENVER" }),
    hubStory({ slug: "b", city: "denver", date: "2026-10-02" }),
    hubStory({ slug: "c", city: "St. Louis", state: "MO", date: "2026-10-03" }),
    hubStory({ slug: "d", city: "Saint Louis", state: "MO", date: "2026-10-04" }),
    hubStory({ slug: "e", city: "Ft. Worth", state: "TX", date: "2026-10-05" }),
    hubStory({ slug: "f", city: "Fort Worth", state: "TX", date: "2026-10-06" }),
    hubStory({ slug: "g", city: "Springfield", state: "IL", date: "2026-10-07" }),
    hubStory({ slug: "h", city: "Springfield", state: "MO", date: "2026-10-08" }),
  ]);
  const cased = mixed.cities.find((hub) => hub.path === "/state/colorado/city/denver");
  if (!cased || cased.count !== 2 || !cased.heading.startsWith("Good news from Denver,")) {
    throw new Error(`Denver case variants should share one page titled Denver. Got ${cased?.heading}`);
  }
  const louis = mixed.cities.find((hub) => hub.path === "/state/missouri/city/saint-louis");
  if (!louis || louis.count !== 2 || !louis.indexable) {
    throw new Error("St. Louis and Saint Louis should share one indexable hub.");
  }
  const worth = mixed.cities.find((hub) => hub.path === "/state/texas/city/fort-worth");
  if (!worth || worth.count !== 2) throw new Error("Fort Worth and Ft. Worth should share one hub.");
  const springs = mixed.cities.filter((hub) => hub.path.endsWith("/springfield"));
  if (springs.length !== 2 || springs.some((hub) => hub.indexable || hub.count !== 1)) {
    throw new Error("Springfield in different states should stay separate noindex pages.");
  }
  const ready = buildHubs([
    hubStory({ slug: "one", tags: ["school-lunch"] }),
    hubStory({ slug: "two", date: "2026-10-02", tags: ["school-lunch"] }),
    hubStory({ slug: "three", date: "2026-10-03", city: "Boulder", tags: ["school-lunch"] }),
    hubStory({ slug: "four", date: "2026-10-04" }),
  ]);
  const animals = ready.stateCategories.find((hub) => hub.path === "/state/colorado/animals");
  const denver = ready.cities.find((hub) => hub.path === "/state/colorado/city/denver");
  const boulder = ready.cities.find((hub) => hub.path === "/state/colorado/city/boulder");
  const topic = ready.topics.find((hub) => hub.path === "/topic/school-lunch");
  if (!animals || animals.count < MIN_HUB_STORIES || !animals.indexable) {
    throw new Error("Colorado animals should be a hub once three stories exist.");
  }
  if (!denver || denver.count !== 3 || !denver.indexable) throw new Error("Denver should be an indexable city hub.");
  if (!denver.description.includes("3 verified stories") || !denver.description.includes("October 1, 2026") || !denver.description.includes("October 4, 2026") || !denver.description.includes("Animals")) {
    throw new Error(`Denver intro should count stories, dates, and categories. Got: ${denver.description}`);
  }
  if (!boulder || boulder.count !== 1 || boulder.indexable) {
    throw new Error("A single Boulder story should be a noindex city page.");
  }
  if (!topic || !topic.indexable) throw new Error("A shared tag should become a topic page at three stories.");
  const badTag = storySchema.safeParse(minimalStory({ state: "OH", tags: ["School Lunch"] }));
  if (badTag.success) throw new Error("Tags have to be kebab-case.");
  const unknownTag = storySchema.safeParse(minimalStory({ state: "OH", tags: ["not-a-real-topic"] }));
  if (unknownTag.success) throw new Error("Tags outside the vocabulary should fail.");
  const duplicate = storySchema.safeParse(minimalStory({ state: "OH", tags: ["dogs", "dogs"] }));
  if (duplicate.success) throw new Error("Duplicate tags should fail.");
  const known = storySchema.safeParse(minimalStory({ state: "OH", tags: ["dogs", "animal-rescue"] }));
  if (!known.success) throw new Error("Tags from the vocabulary should pass.");
  const index = getHubIndex();
  for (const hub of [...index.stateCategories, ...index.topics]) {
    if (hub.count < MIN_HUB_STORIES || !hub.indexable) {
      throw new Error(`${hub.path} should stay indexable only at ${MIN_HUB_STORIES} stories.`);
    }
  }
  let indexableCities = 0;
  let quietCities = 0;
  for (const hub of index.cities) {
    if (hub.count < 1) throw new Error(`${hub.path} has no stories.`);
    if (hub.indexable !== hub.count >= MIN_CITY_INDEX_STORIES) {
      throw new Error(`${hub.path} indexable flag does not match its story count.`);
    }
    if (!hub.description.includes(String(hub.count))) {
      throw new Error(`${hub.path} intro should include the story count.`);
    }
    if (hub.indexable) indexableCities += 1;
    else quietCities += 1;
  }
  for (const hub of indexableHubs(index)) {
    if (hub.kind === "city" && hub.count < MIN_CITY_INDEX_STORIES) {
      throw new Error(`${hub.path} would be in the sitemap with too few stories.`);
    }
    if (hub.kind !== "city" && hub.count < MIN_HUB_STORIES) {
      throw new Error(`${hub.path} would be in the sitemap with too few stories.`);
    }
  }
  const listedCities = new Set(indexableHubs(index).filter((hub) => hub.kind === "city").map((hub) => hub.path));
  for (const hub of index.cities) {
    if (!hub.indexable && listedCities.has(hub.path)) {
      throw new Error(`${hub.path} is noindex and should stay out of the sitemap.`);
    }
  }
  assertCitySlugsStayPut(getPublishedStories());
  console.log(`Hubs: ${index.stateCategories.length} state topics, ${index.cities.length} cities (${indexableCities} indexable, ${quietCities} noindex), ${index.topics.length} topics.`);
  console.log(formatCityReport(index.cities));
}

/** Pages already indexable under the old slug stay put. Abbreviation merges are the only allowed slug change. */
function assertCitySlugsStayPut(stories: { city: string; country: string; state?: string }[]) {
  const legacyCounts = new Map<string, number>();
  for (const story of stories) {
    if (story.country !== "US" || !story.state) continue;
    const state = getStateByCode(story.state);
    const legacy = slugify(story.city);
    if (!state || !legacy) continue;
    const path = `/state/${state.slug}/city/${legacy}`;
    legacyCounts.set(path, (legacyCounts.get(path) ?? 0) + 1);
  }
  const index = getHubIndex();
  for (const story of stories) {
    const legacy = slugify(story.city);
    const next = citySlug(story.city);
    if (!legacy || legacy === next) continue;
    const abbreviation = /(?:^|-)(st|ft|mt)(?:-|$)/.test(legacy);
    if (!abbreviation) {
      throw new Error(`${story.city} slug changed from ${legacy} to ${next} without an abbreviation.`);
    }
  }
  for (const [path, count] of legacyCounts) {
    if (count < MIN_HUB_STORIES) continue;
    if (!index.byPath.has(path)) {
      throw new Error(`${path} has ${count} stories under its original slug and should keep that URL.`);
    }
  }
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
  const wordOnly = storySchema.safeParse(
    minimalStory({ state: "OH", kidFriendly: true, kidSummary: summary, kidQuestions: questions, kidWord: "nest" }),
  );
  if (wordOnly.success) throw new Error("A vocabulary word needs a definition.");
  const defined = storySchema.safeParse(
    minimalStory({
      state: "OH",
      kidFriendly: true,
      kidSummary: summary,
      kidQuestions: questions,
      kidWord: "nest",
      kidDefinition: "A home a bird builds.",
    }),
  );
  if (!defined.success || defined.data.kidWord !== "nest" || defined.data.kidDefinition !== "A home a bird builds.") {
    throw new Error("A word and a definition should pass.");
  }
  const orphanWord = storySchema.safeParse(
    minimalStory({ state: "OH", kidWord: "nest", kidDefinition: "A home a bird builds." }),
  );
  if (orphanWord.success) throw new Error("A vocabulary word without kidFriendly should fail.");

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

function assertPartnerKit() {
  for (const variant of BADGE_VARIANTS) {
    const svg = badgeSvg(variant);
    if (!svg.includes(siteConfig.name)) throw new Error(`Badge ${variant.id} is missing the site name.`);
    if (svg.includes("<script")) throw new Error(`Badge ${variant.id} should not contain a script.`);
  }

  const embed = badgeEmbedHtml({
    variant: BADGE_VARIANTS[0],
    href: "/story/example",
    format: "svg",
  });
  if (!embed.includes(`${siteConfig.url}/story/example`)) throw new Error("Badge embed should link to the story.");
  if (!embed.includes("/brand/featured/light-horizontal.svg")) throw new Error("Badge embed should use the SVG file.");
  if (embed.includes("<script")) throw new Error("Badge embed should be an image link, not a script.");

  const nasty = renderEmbedDocument({
    heading: "More & <good>",
    moreHref: `${siteConfig.url}/state/colorado`,
    moreLabel: "All stories",
    items: [{ href: `${siteConfig.url}/story/a`, title: `<script>alert("x")</script>`, meta: "Denver & Co." }],
  });
  if (nasty.includes("<script>") || nasty.includes("<good>")) throw new Error("Widget HTML should escape titles.");
  if (!nasty.includes("noindex")) throw new Error("Widget pages should be noindex.");

  const iframe = iframeSnippet({ place: "latest", title: "News & <views>" });
  if (!iframe.includes("&amp;") || iframe.includes("<views>")) throw new Error("Iframe snippet should escape the title.");
  if (!iframe.startsWith("<iframe ") || !iframe.includes("title=")) throw new Error("Iframe snippet should be an iframe with a title.");

  const js = embedScriptSource();
  if (!js.includes(siteConfig.url)) throw new Error("Embed script should point at this site.");
  if (/\b(cookie|gtag|analytics|fetch\s*\(|XMLHttpRequest|localStorage)\b/i.test(js)) {
    throw new Error("Embed script should not track, store data, or call the network.");
  }

  const story = getPublishedStories()[0];
  if (story) {
    for (const line of storyShareLines(story)) {
      const mentions = line.text.match(/@[A-Za-z0-9_]+/g) ?? [];
      for (const mention of mentions) {
        if (mention.slice(1) !== siteConfig.social.x) {
          throw new Error(`Share text mentions ${mention}, which is not a confirmed account.`);
        }
      }
      if (!line.text.includes(`/story/${story.slug}`)) throw new Error("Story share text should include the story URL.");
    }
    const widget = embedDocumentForSlug("latest");
    if (!widget || !widget.includes("/story/")) throw new Error("Latest widget should link to stories.");
    const stateWidget = embedDocumentForSlug("colorado");
    if (!stateWidget || !stateWidget.includes("/state/colorado")) throw new Error("State widget should link to the state page.");
  }

  const urls = sitemap().map((entry) => entry.url);
  if (!urls.includes(absoluteUrl("/featured"))) throw new Error("Sitemap should include /featured.");
  if (!urls.includes(absoluteUrl("/widgets"))) throw new Error("Sitemap should include /widgets.");
  if (urls.some((url) => url.includes("/featured/"))) throw new Error("Sitemap should not include per-story kits.");
  if (urls.some((url) => url.includes("/embed"))) throw new Error("Sitemap should not include embed widgets.");
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

function assertExplainers() {
  const bad = explainerSchema.safeParse({ title: "too short" });
  if (bad.success) throw new Error("Explainer schema accepted an incomplete file.");

  const explainers = getPublishedExplainers();
  if (explainers.length < 10) throw new Error(`Expected at least 10 explainers, found ${explainers.length}.`);
  for (const explainer of explainers) {
    if (!storiesForExplainer(explainer).length) {
      throw new Error(`${explainer.slug} should link at least one archive story.`);
    }
    if (explainer.schema === "HowTo" && (explainer.steps?.length ?? 0) < 3) {
      throw new Error(`${explainer.slug} is a HowTo without steps.`);
    }
    if (explainer.schema === "Article" && explainer.steps?.length) {
      throw new Error(`${explainer.slug} is an Article with HowTo steps.`);
    }
  }

  const bySlug = new Map(explainers.map((explainer) => [explainer.slug, explainer]));
  const fridge = storiesForExplainer(bySlug.get("how-a-community-fridge-works")!).map((story) => story.slug);
  if (!fridge.includes("new-ulm-library-fridge")) throw new Error("The fridge explainer should link the New Ulm story.");

  const flights = bySlug.get("how-honor-flights-work")!;
  for (const slug of ["anchorage-honor-flight", "des-moines-honor-flight", "fresno-honor-flight", "phoenix-honor-flight"]) {
    const story = getStory(slug);
    if (!story || !explainerMatchesStory(flights, story)) throw new Error(`Honor Flight explainer missed ${slug}.`);
  }

  const food = storiesForExplainer(bySlug.get("how-food-banks-rescue-food")!).map((story) => story.slug);
  if (food.includes("traverse-city-pet-pantry") || food.includes("sioux-falls-dog-food")) {
    throw new Error("Pet food stories should stay off the food-bank explainer.");
  }

  const fortMyers = getStory("fort-myers-diner-second-chance");
  if (!fortMyers) throw new Error("Missing the Fort Myers story used to check foster matching.");
  if (explainersForStory(fortMyers).some((explainer) => explainer.slug === "how-animal-shelter-foster-programs-work")) {
    throw new Error("A story about a person who grew up in foster care should not link the animal foster explainer.");
  }

  const newUlm = getStory("new-ulm-library-fridge");
  if (!newUlm) throw new Error("Missing the New Ulm fridge story.");
  const newUlmLinks = explainersForStory(newUlm);
  if (newUlmLinks[0]?.slug !== "how-a-community-fridge-works") {
    throw new Error("New Ulm should lead with the community fridge explainer.");
  }
  if (!newUlmLinks.some((explainer) => explainer.slug === "how-food-banks-rescue-food")) {
    throw new Error("New Ulm should also link the food bank explainer.");
  }

  const library = getStory("effingham-little-library");
  if (!library || !explainersForStory(library).some((explainer) => explainer.slug === "how-to-start-a-little-free-library")) {
    throw new Error("Little Free Library stories should link the explainer.");
  }

  const paths = explainerPaths();
  if (!paths.includes("/explainers") || paths.length !== explainers.length + 1) {
    throw new Error("Explainer paths should include the index and every page.");
  }

  const urls = sitemap().map((entry) => entry.url);
  if (!urls.some((url) => url.endsWith("/explainers"))) throw new Error("Sitemap is missing the explainer index.");
  if (!urls.some((url) => url.endsWith("/explainers/how-honor-flights-work"))) {
    throw new Error("Sitemap is missing an explainer page.");
  }
  if (!siteConfig.editor.name.endsWith("Editorial Team")) {
    throw new Error("Explainer bylines should stay the editorial team named in site config.");
  }
}

function veteranFixture(partial: Partial<StateHubStory> & Pick<StateHubStory, "slug" | "state">): StateHubStory {
  return {
    date: "2026-10-01",
    title: "Neighbors helped a veteran in a concrete way",
    dek: "The help was specific, finished, and reported by a local newsroom.",
    country: "US",
    alsoStates: [],
    tags: ["veterans"],
    ...partial,
  };
}

function assertVeteransDayHub() {
  if (
    !isVeteranStory({
      country: "US",
      tags: ["kindness"],
      title: "A Navy veteran in Omaha got a new ramp",
      dek: "Neighbors built the ramp over a weekend.",
    })
  ) {
    throw new Error("A military veteran in the headline should qualify.");
  }
  if (
    !isVeteranStory({
      country: "US",
      tags: ["community"],
      title: "The 36th honor flight landed in Fresno",
      dek: "Travelers came home to a crowd at the airport.",
    })
  ) {
    throw new Error("An honor flight should qualify even without the veterans tag.");
  }
  if (
    isVeteranStory({
      country: "US",
      tags: ["kids"],
      title: "A 16-year NBA veteran hosted a free basketball camp for Jackson kids",
      dek: "Dozens of children spent the morning at a camp.",
    })
  ) {
    throw new Error("A sports veteran should not qualify.");
  }
  if (
    isVeteranStory({
      country: "US",
      tags: ["food-banks"],
      title: "Students collected 3,200 pounds of food",
      dek: "The drive delivered food to a county food bank.",
    })
  ) {
    throw new Error("A headline that never mentions veterans should not qualify.");
  }
  if (
    isVeteranStory({
      country: "CA",
      tags: ["veterans"],
      title: "A veteran story outside the United States",
      dek: "This hub is for states and Washington, D.C.",
    })
  ) {
    throw new Error("Stories outside the United States should stay off the hub.");
  }
  if (
    isVeteranStory({
      country: "US",
      tags: ["veterans"],
      title: "A draft story about veterans in Ohio",
      dek: "Drafts stay off the site until they are published.",
      draft: true,
    })
  ) {
    throw new Error("A draft should not qualify.");
  }
  if (
    !isVeteranStory({
      country: "US",
      tags: ["veterans"],
      title: "An award for free home repairs in Boston",
      dek: "The nonprofit repairs homes for seniors, veterans, and families.",
    })
  ) {
    throw new Error("The veterans tag should qualify a story.");
  }

  const newer = veteranFixture({ slug: "co-new", state: "CO", date: "2026-10-20", title: "A stand down served veterans in Colorado" });
  const older = veteranFixture({
    slug: "co-old",
    state: "CO",
    date: "2026-10-01",
    title: "A home for veterans opened in Colorado",
    featured: true,
  });
  const walk = veteranFixture({
    slug: "id-walk",
    state: "ID",
    date: "2026-10-19",
    title: "A veteran is walking to the coast",
    alsoStates: ["OR", "FL"],
  });
  const texasHome = veteranFixture({ slug: "tx-home", state: "TX", date: "2026-09-01", title: "Texas veterans got a repaired home" });
  const newerPassThrough = veteranFixture({
    slug: "nm-new",
    state: "NM",
    date: "2026-10-20",
    title: "A newer honor flight crossed a state line",
    alsoStates: ["TX"],
  });
  const featuredSameDay = veteranFixture({
    slug: "ga-featured",
    state: "GA",
    date: "2026-10-20",
    title: "Georgia veterans were welcomed home",
    featured: true,
  });
  const plainSameDay = veteranFixture({ slug: "ga-plain", state: "GA", date: "2026-10-20", title: "Neighbors wrote veterans a note" });
  const ranked = veteranFixture({ slug: "wa-ranked", state: "WA", date: "2026-10-12", title: "A veteran in Washington got a ramp", top5: 2 });
  const unranked = veteranFixture({ slug: "wa-plain", state: "WA", date: "2026-10-12", title: "A veteran in Washington got a meal" });
  const honor = veteranFixture({
    slug: "al-honor",
    state: "AL",
    date: "2026-10-08",
    title: "An honor flight left Alabama",
    dek: "Veterans flew to the memorials.",
  });
  const plainHonorTie = veteranFixture({
    slug: "al-plain",
    state: "AL",
    date: "2026-10-08",
    title: "Neighbors helped a veteran in Alabama",
    dek: "The crew finished the yard work.",
  });
  const nba = veteranFixture({
    slug: "ms-nba",
    state: "MS",
    tags: ["kids"],
    title: "A 16-year NBA veteran hosted a free basketball camp for Jackson kids",
    dek: "Dozens of children spent the morning at a camp.",
  });

  const fixture = [
    newer,
    older,
    walk,
    texasHome,
    newerPassThrough,
    featuredSameDay,
    plainSameDay,
    ranked,
    unranked,
    honor,
    plainHonorTie,
    nba,
  ];
  const picked = pickStateStories({
    stories: fixture,
    qualifies: isVeteranStory,
    quality: veteranStoryQuality,
  });
  const slot = (code: string) => {
    const found = picked.slots.find((item) => item.state.code === code);
    if (!found) throw new Error(`Missing slot ${code}`);
    return found;
  };
  if (picked.slots.length !== 51) throw new Error("The hub should have one slot for every state and D.C.");
  if (slot("CO").story?.slug !== "co-new") throw new Error("A newer home-state story should beat an older featured one.");
  if (slot("GA").story?.slug !== "ga-featured") throw new Error("On the same day, featured should win.");
  if (slot("WA").story?.slug !== "wa-ranked") throw new Error("On the same day, a Top 5 rank should win.");
  if (slot("AL").story?.slug !== "al-honor") throw new Error("On a full tie, the stronger veteran headline should win.");
  if (slot("TX").story?.slug !== "tx-home") throw new Error("A home-state story should beat a newer story that only passes through.");
  if (slot("NM").story?.slug !== "nm-new") throw new Error("New Mexico should keep its own story.");
  if (slot("ID").story?.slug !== "id-walk" || slot("OR").story?.slug !== "id-walk" || slot("FL").story?.slug !== "id-walk") {
    throw new Error("A story should fill its home state and any alsoStates that have no story of their own.");
  }
  if (slot("MS").story) throw new Error("Mississippi should stay open when the only candidate is a sports veteran.");
  if (picked.slots.some((item) => item.story && item.story.state !== item.state.code && !item.story.alsoStates.includes(item.state.code))) {
    throw new Error("A slot used a story that is not filed in that state.");
  }

  const pinned = pickStateStories({
    stories: fixture,
    pins: { CO: "co-old" },
    qualifies: isVeteranStory,
    quality: veteranStoryQuality,
  });
  const pinnedCo = pinned.slots.find((item) => item.state.code === "CO");
  if (!pinnedCo?.pinned || pinnedCo.story?.slug !== "co-old") throw new Error("A valid pin should replace the automatic pick.");

  const badPin = pickStateStories({
    stories: fixture,
    pins: { CO: "ms-nba", NY: "id-walk", ZZ: "co-new", ME: "missing" },
    qualifies: isVeteranStory,
    quality: veteranStoryQuality,
  });
  if (badPin.pinErrors.length !== 4) throw new Error(`Expected 4 pin errors, got ${badPin.pinErrors.join(" | ")}`);
  const badCo = badPin.slots.find((item) => item.state.code === "CO");
  if (badCo?.story?.slug !== "co-new" || badCo.pinned) throw new Error("A bad pin should fall back to the automatic pick.");
  if (badPin.slots.find((item) => item.state.code === "NY")?.story) {
    throw new Error("A story should not be pinned onto a state it is not filed in.");
  }

  const empty = pickStateStories({ stories: [], qualifies: isVeteranStory });
  if (empty.slots.length !== 51 || empty.slots.some((item) => item.story) || empty.pinErrors.length) {
    throw new Error("An empty archive should leave every state open.");
  }

  if (!veteransDayInSeason("2026-11-01") || !veteransDayInSeason("2026-11-11") || !veteransDayInSeason("2026-11-12")) {
    throw new Error("The Veterans Day banner should show from November 1 through November 12.");
  }
  if (veteransDayInSeason("2026-10-26") || veteransDayInSeason("2026-10-31") || veteransDayInSeason("2026-11-13")) {
    throw new Error("The Veterans Day banner should stay off outside November 1 through November 12.");
  }
  if (veteransDayInSeason("November 11")) throw new Error("A banner date has to be YYYY-MM-DD.");

  if (Object.keys(parseVeteransDayPins({})).length !== 0) throw new Error("An empty pin file should mean no pins.");
  for (const value of [{ va: "anchorage-honor-flight" }, { VA: "Not A Slug" }, { VA: 1 }, ["VA"]]) {
    let threw = false;
    try {
      parseVeteransDayPins(value);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error(`Pins should reject ${JSON.stringify(value)}`);
  }

  const pins = loadVeteransDayPins();
  const published = getPublishedStories();
  const live = getVeteransDayHub();
  const rebuilt = buildVeteransDayHub(published, pins);
  if (live.pinErrors.length || rebuilt.pinErrors.length) {
    throw new Error(`Veterans Day pins: ${[...live.pinErrors, ...rebuilt.pinErrors].join("; ")}`);
  }
  if (live.slots.length !== 51 || live.covered.length + live.gaps.length !== 51) {
    throw new Error("The live hub should cover every state slot exactly once.");
  }
  for (const item of live.slots) {
    const pin = pins[item.state.code];
    if (pin) {
      if (!item.pinned || item.story?.slug !== pin) throw new Error(`Pin for ${item.state.code} did not apply.`);
    } else if (item.pinned) {
      throw new Error(`${item.state.code} is marked pinned without a config entry.`);
    }
    if (!item.story) continue;
    if (!isVeteranStory(item.story)) throw new Error(`${item.story.slug} is on the hub without qualifying.`);
    if (item.story.state !== item.state.code && !item.story.alsoStates.includes(item.state.code)) {
      throw new Error(`${item.story.slug} is filed on ${item.state.code} without a matching state.`);
    }
    if (!item.pinned) {
      const homes = published
        .filter((story) => isVeteranStory(story) && story.state === item.state.code)
        .sort((a, b) => compareStateStories(item.state.code, veteranStoryQuality, a, b));
      if (homes.length && item.story.slug !== homes[0]?.slug) {
        throw new Error(`${item.state.code} should use ${homes[0]?.slug}, not ${item.story.slug}.`);
      }
      if (!homes.length && item.story.state === item.state.code) {
        throw new Error(`${item.state.code} used a home story that does not qualify.`);
      }
    }
  }
  const helpUrls = new Set<string>();
  for (const link of live.help) {
    if (helpUrls.has(link.url)) throw new Error(`Duplicate help link ${link.url}`);
    helpUrls.add(link.url);
    const owner = live.covered.find((item) => item.story?.slug === link.storySlug)?.story;
    if (!owner?.howToHelp.some((item) => item.url === link.url && item.label === link.label)) {
      throw new Error(`Help link ${link.url} is not on ${link.storySlug}.`);
    }
  }
  if (!live.socialStory || !live.covered.some((item) => item.story?.slug === live.socialStory?.slug)) {
    throw new Error("The social image has to be a story that is actually on the hub.");
  }
  if (!live.latest || live.latest !== live.socialStory.date) throw new Error("The hub date should match the social story.");

  const urls = sitemap().map((entry) => entry.url);
  if (!urls.some((url) => url.endsWith(VETERANS_DAY_PATH))) throw new Error("The sitemap should include the Veterans Day hub.");
  const indexNow = fs.readFileSync(path.join(process.cwd(), "scripts/indexnow.ts"), "utf8");
  if (!indexNow.includes("VETERANS_DAY_PATH")) throw new Error("IndexNow should ping the Veterans Day hub.");
  const home = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
  if (!home.includes("VeteransDayBanner")) throw new Error("The homepage should mount the Veterans Day banner.");
  const footer = fs.readFileSync(path.join(process.cwd(), "components/footer.tsx"), "utf8");
  if (!footer.includes("VETERANS_DAY_PATH")) throw new Error("The footer should link to the Veterans Day hub.");

  const missing = live.gaps.map((item) => item.state.name);
  console.log(
    missing.length
      ? `Veterans Day: ${live.covered.length} of ${live.slots.length} places covered. Still open: ${missing.join(", ")}`
      : `Veterans Day: all ${live.slots.length} places covered.`,
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

function sampleIndexStory(partial: Partial<IndexStory> & Pick<IndexStory, "slug" | "date">): IndexStory {
  return {
    title: `A verified good news story ${partial.slug}`,
    country: "US",
    state: "CO",
    alsoStates: [],
    category: "community",
    tags: ["parks"],
    howToHelp: [{ label: "Learn more", url: "https://example.org/learn", kind: "learn" }],
    image: `/images/stories/${partial.slug}.webp`,
    imageAlt: "A photo from the month",
    ...partial,
  };
}

function assertGoodNewsIndex() {
  if (FIRST_INDEX_MONTH !== "2026-10") throw new Error("The first Good News Index edition is October 2026.");
  if (monthEnd("2026-10") !== "2026-10-31") throw new Error("October should close on the 31st.");
  if (monthEnd("2026-02") !== "2026-02-28") throw new Error("February 2026 should close on the 28th.");
  if (MAX_PRERENDERED_INDEXES < 600) {
    throw new Error(`MAX_PRERENDERED_INDEXES is ${MAX_PRERENDERED_INDEXES}. Keep it at or above 600 so decades of monthly pages stay static.`);
  }
  if (populationTotal() !== POPULATION_US_TOTAL) {
    throw new Error(`Population table sums to ${populationTotal()}, not ${POPULATION_US_TOTAL}.`);
  }
  if (populationOf("CO") !== 5_957_493) throw new Error("Colorado's July 1, 2024 population should be 5,957,493.");
  for (const state of STATES) {
    if (!populationOf(state.code)) throw new Error(`No Census population for ${state.code}.`);
  }
  if (helpUrlKey("https://www.Example.org/give/") !== "example.org/give") {
    throw new Error("A help URL key should drop www, the query string, and a trailing slash.");
  }
  if (helpUrlKey("https://www.Example.org/give/") !== helpUrlKey("https://example.org/give?utm=1")) {
    throw new Error("www and a query string should not make a second help link.");
  }

  const september = buildIndexes(
    [
      sampleIndexStory({ slug: "sept", date: "2026-09-20" }),
      sampleIndexStory({ slug: "oct", date: "2026-10-02" }),
    ],
    "2026-10-21",
  );
  if (september.length !== 1 || september[0].month !== "2026-10" || september[0].storyCount !== 1) {
    throw new Error("Stories dated before October 2026 should stay out of the index.");
  }
  if (!september[0].inProgress || !september[0].updatedLabel.startsWith("Month to date.")) {
    throw new Error("October should be month to date on October 21.");
  }

  const futureMonth = buildIndexes([sampleIndexStory({ slug: "nov", date: "2026-11-02" })], "2026-10-21");
  if (futureMonth.length) throw new Error("A month that has not started should wait.");

  const windowed = buildIndexes(
    [
      sampleIndexStory({ slug: "late", date: "2026-10-25" }),
      sampleIndexStory({ slug: "today", date: "2026-10-21" }),
      sampleIndexStory({ slug: "early", date: "2026-10-01" }),
    ],
    "2026-10-21",
  );
  const windowSlugs = windowed[0]?.stories.map((story) => story.slug).sort().join(",");
  if (windowSlugs !== "early,today") throw new Error(`A story dated after the build day should wait. Got ${windowSlugs}.`);

  const shared = buildIndexes(
    [
      sampleIndexStory({
        slug: "shared",
        date: "2026-10-10",
        state: "OH",
        alsoStates: ["WY"],
        kidFriendly: true,
      }),
    ],
    "2026-10-21",
  )[0];
  const ohio = shared.states.find((state) => state.code === "OH");
  const wyoming = shared.states.find((state) => state.code === "WY");
  const alabama = shared.states.find((state) => state.code === "AL");
  if (shared.usCount !== 1 || ohio?.stories !== 1 || wyoming?.stories !== 1) {
    throw new Error("alsoStates should count the story in each listed state and once in the national total.");
  }
  if (ohio?.rank !== 1 || wyoming?.rank !== 1 || ohio?.rankLabel !== "tied for 1st" || wyoming?.rankLabel !== "tied for 1st") {
    throw new Error(`Tied states should share 1st. Got ${ohio?.rankLabel} and ${wyoming?.rankLabel}.`);
  }
  if (alabama?.rank !== undefined || alabama?.rankLabel !== "—") {
    throw new Error("A state with no story should be listed and left unranked.");
  }
  if (shared.states.length !== 51) throw new Error("Every edition should list the 50 states and the District of Columbia.");
  if (shared.kidUsCount !== 1 || ohio?.kidStories !== 1 || wyoming?.kidStories !== 1) {
    throw new Error("A classroom story should count once nationally and in each state it appears in.");
  }
  if (ohio && ohio.perMillion !== storiesPerMillion(ohio.stories, ohio.population)) {
    throw new Error("The per-person rate should be stories divided by population, times one million.");
  }

  const helped = buildIndexes(
    [
      sampleIndexStory({
        slug: "give-a",
        date: "2026-10-08",
        state: "CO",
        howToHelp: [
          { label: "Give", url: "https://www.Example.org/give/", kind: "donate" },
          { label: "Read", url: "https://example.org/about", kind: "learn" },
        ],
      }),
      sampleIndexStory({
        slug: "give-b",
        date: "2026-10-09",
        state: "CO",
        howToHelp: [
          { label: "Give again", url: "https://example.org/give?utm=1", kind: "donate" },
          { label: "Thanks", url: "https://example.org/thanks", kind: "thank" },
        ],
      }),
    ],
    "2026-10-21",
  )[0];
  const helpedColorado = helped.states.find((state) => state.code === "CO");
  if (helpedColorado?.helpLinks !== 2 || helped.helpLinkCount !== 2) {
    throw new Error(`Donate and thank links should collapse www and query strings, and learn-more links should stay out. Got ${helpedColorado?.helpLinks} / ${helped.helpLinkCount}.`);
  }

  const closed = buildIndexes([sampleIndexStory({ slug: "oct-only", date: "2026-10-15" })], "2026-11-02")[0];
  if (closed.inProgress || closed.title.includes("month to date") || !closed.title.includes("October 2026")) {
    throw new Error(`A finished month should drop the month-to-date label. Got ${closed.title}.`);
  }
  if (!closed.updatedLabel.startsWith("Closed edition.")) throw new Error("A finished month should say it is a closed edition.");

  const csv = renderIndexCsv(shared);
  if (!csv.startsWith("\uFEFF")) throw new Error("The CSV should start with a UTF-8 BOM.");
  if (!csv.includes("not a measure of how good a state is")) throw new Error("The CSV should carry the methodology caveat.");
  if (!csv.includes("NST-EST2024-POP")) throw new Error("The CSV should cite the Census population table.");
  if (!csv.includes("state,OH,Ohio,1,")) throw new Error("The CSV should include the Ohio state row.");
  if (!shared.citation.includes(siteConfig.editor.name) || !shared.citation.includes(absoluteUrl(shared.path))) {
    throw new Error(`The citation should name the editorial team and the edition URL. Got ${shared.citation}`);
  }

  const today = mountainDay();
  const published = getPublishedStories().filter((story) => story.date <= today);
  const indexes = buildIndexes(published, today);
  if (indexes.length > MAX_PRERENDERED_INDEXES) {
    throw new Error(`${indexes.length} index editions exceed the prerender cap of ${MAX_PRERENDERED_INDEXES}. Raise MAX_PRERENDERED_INDEXES.`);
  }
  if (indexes.some((edition) => edition.month < FIRST_INDEX_MONTH)) {
    throw new Error("An edition before October 2026 should not be built.");
  }
  if (getPublishedIndexes().length !== indexes.length) {
    throw new Error("Published index pages should match the editions built from the archive.");
  }
  const october = indexes.find((edition) => edition.month === "2026-10");
  if (!october) throw new Error("October 2026 should be an edition.");
  const octoberStories = published.filter((story) => story.date.startsWith("2026-10"));
  if (october.storyCount !== octoberStories.length) {
    throw new Error(`October story count ${october.storyCount} does not match the archive (${octoberStories.length}).`);
  }
  const inState = (code: string) =>
    octoberStories.filter((story) => story.country === "US" && (story.state === code || story.alsoStates.includes(code)));
  const coloradoStories = inState("CO");
  const colorado = october.states.find((state) => state.code === "CO");
  const maryland = october.states.find((state) => state.code === "MD");
  const district = october.states.find((state) => state.code === "DC");
  const wyomingRow = october.states.find((state) => state.code === "WY");
  if (!colorado || colorado.stories !== coloradoStories.length) {
    throw new Error(`Colorado's row (${colorado?.stories}) does not match stories filed there (${coloradoStories.length}).`);
  }
  const us = octoberStories.filter((story) => story.country === "US").length;
  const world = octoberStories.filter((story) => story.country !== "US").length;
  const kids = octoberStories.filter((story) => story.kidFriendly);
  if (october.usCount !== us || october.worldCount !== world || october.kidCount !== kids.length) {
    throw new Error(`October totals drifted: page ${october.usCount}/${october.worldCount}/${october.kidCount}, archive ${us}/${world}/${kids.length}.`);
  }
  if (october.kidUsCount !== kids.filter((story) => story.country === "US").length) {
    throw new Error("Classroom stories in the United States should count each story once.");
  }
  if (october.kidUsCount + october.kidWorldCount !== october.kidCount) {
    throw new Error("Classroom counts should add up to the classroom total.");
  }
  if (october.states.length !== STATES.length) throw new Error("October should list every state and the District of Columbia.");
  const categorySum = october.categories.reduce((sum, category) => sum + category.count, 0);
  if (categorySum !== october.storyCount) throw new Error("Category counts should add up to the story count.");
  const community = octoberStories.filter((story) => story.category === "community").length;
  if (october.categories.find((category) => category.slug === "community")?.count !== community) {
    throw new Error("The community category count does not match the archive.");
  }
  const countrySum = october.countries.reduce((sum, country) => sum + country.count, 0);
  if (countrySum !== october.worldCount) throw new Error("Country counts should add up to the world total.");
  const nationalHelp = new Set<string>();
  const coloradoHelp = new Set<string>();
  for (const story of octoberStories) {
    for (const link of story.howToHelp) {
      if (!isSupportKind(link.kind)) continue;
      nationalHelp.add(helpUrlKey(link.url));
    }
  }
  for (const story of coloradoStories) {
    for (const link of story.howToHelp) {
      if (!isSupportKind(link.kind)) continue;
      coloradoHelp.add(helpUrlKey(link.url));
    }
  }
  if (nationalHelp.size !== october.helpLinkCount || coloradoHelp.size !== colorado.helpLinks) {
    throw new Error(`Help-link counts drifted: national ${october.helpLinkCount} vs ${nationalHelp.size}, Colorado ${colorado.helpLinks} vs ${coloradoHelp.size}.`);
  }
  const expectedRate = storiesPerMillion(colorado.stories, colorado.population);
  if (colorado.perMillion !== expectedRate || colorado.perMillionLabel !== formatPerMillion(expectedRate, colorado.stories)) {
    throw new Error("Colorado's per-million display should follow the unrounded Census rate.");
  }
  if (october.inProgress !== (monthKey(today) === "2026-10")) {
    throw new Error("October is month to date only while the build day is still in October.");
  }
  const map = renderIndexMap(october.states);
  if (map.includes('aria-label="Colorado"') || !map.includes("Colorado,")) {
    throw new Error("The map label should include Colorado's count.");
  }
  if (!map.includes("dccircle dc band-")) throw new Error("The District of Columbia circle should take a band color.");
  for (const state of october.states) {
    if (!map.includes(`class="${state.code.toLowerCase()} band-`)) {
      throw new Error(`The map is missing a band for ${state.name}.`);
    }
  }
  const realCsv = renderIndexCsv(october);
  if (!realCsv.includes(`state,CO,Colorado,${colorado.stories},`)) {
    throw new Error("The October CSV should include Colorado's story count.");
  }
  const link = stateIndexLink({ name: "Colorado", slug: "colorado" }, today);
  if (monthKey(today) === october.month && link?.label !== "See how Colorado ranks this month") {
    throw new Error(`The open month should use the this-month state link. Got ${link?.label}.`);
  }
  if (link?.href !== `${october.path}#colorado`) throw new Error(`State pages should link to the state row. Got ${link?.href}.`);
  for (const code of ["MD", "DC", "WY"]) {
    const row = october.states.find((state) => state.code === code);
    const count = inState(code).length;
    if (row?.stories !== count) {
      throw new Error(`${code} has ${row?.stories} on the page and ${count} in the archive.`);
    }
  }
  const topCountry = october.countries[0];
  if (topCountry) {
    const archiveCount = octoberStories.filter((story) => story.country === topCountry.code).length;
    if (archiveCount !== topCountry.count) {
      throw new Error(`${topCountry.label} has ${topCountry.count} on the page and ${archiveCount} in the archive.`);
    }
  }

  const leaders = october.states
    .filter((state) => state.stories > 0)
    .slice(0, 5)
    .map((state) => `${state.code} ${state.stories} (${state.rankLabel})`)
    .join(", ");
  console.log(
    `Good News Index ${october.month} through ${october.latest}: ${october.storyCount} stories, US ${october.usCount}, world ${october.worldCount}, classroom ${october.kidCount} (US ${october.kidUsCount}, world ${october.kidWorldCount}), help links ${october.helpLinkCount}, places with a story ${october.statesWithStories}. Leaders: ${leaders}. CO ${colorado.stories} ${colorado.rankLabel}, ${colorado.perMillionLabel} per million = ${colorado.stories} / ${colorado.population} * 1000000. MD ${maryland?.stories} (${maryland?.rankLabel}), DC ${district?.stories} (${district?.rankLabel}), WY ${wyomingRow?.stories} (${wyomingRow?.rankLabel}, ${wyomingRow?.perMillionLabel} per million). ${topCountry ? `Top country ${topCountry.label} ${topCountry.count}.` : "No world stories."} Editions ${indexes.length}.`,
  );
}

function samplePackStory(partial: Partial<PackCandidate> & Pick<PackCandidate, "slug" | "date">): PackCandidate {
  return {
    title: `Classroom story ${partial.slug}`,
    city: "Denver",
    country: "US",
    state: "CO",
    category: "animals",
    kidFriendly: true,
    kidSummary: "A short classroom summary a teacher can read aloud to the class without adding anything.",
    kidQuestions: ["What did the people in this story do?", "How could a class try something kind this week?"],
    image: `/images/stories/${partial.slug}.webp`,
    imageAlt: "A photo from the classroom pack",
    ...partial,
  };
}

function assertClassroomPacks() {
  if (CLASSROOM_INDEX_PATH !== "/classroom") throw new Error("The classroom index should live at /classroom.");
  if (!CLASSROOM_INDEX_TITLE.toLowerCase().includes("good news for kids this week")) {
    throw new Error("The classroom index title should target good news for kids this week.");
  }
  if (!CLASSROOM_INDEX_DESCRIPTION.toLowerCase().includes("current events for kids, printable")) {
    throw new Error("The classroom index description should target current events for kids printable.");
  }
  const questions = [
    "What did the people in this story do?",
    "How could a class try something kind this week?",
    "Who would you tell about it?",
  ];
  if (packQuestions({ kidQuestions: questions }).length !== 2) throw new Error("A pack should print one or two discussion questions.");
  if (packVocabulary({}) || packVocabulary({ kidWord: "nest" })) throw new Error("A missing vocabulary word should be omitted.");
  const vocab = packVocabulary({ kidWord: " nest ", kidDefinition: " A home a bird builds. " });
  if (!vocab || vocab.word !== "nest" || vocab.definition !== "A home a bird builds.") {
    throw new Error("A vocabulary line should appear only when the story already has a word and a definition.");
  }
  if (whereInTheWorld(samplePackStory({ slug: "denver", date: "2026-10-07" })) !== "Denver, Colorado, United States") {
    throw new Error("A US classroom story should name the city, state, and country.");
  }
  if (whereInTheWorld(samplePackStory({ slug: "osaka", date: "2026-10-07", country: "JP", state: undefined, city: "Osaka" })) !== "Osaka, Japan") {
    throw new Error("A world classroom story should name the city and country once.");
  }

  const bare = samplePackStory({ slug: "bare", date: "2026-10-07", kidFriendly: false, kidSummary: undefined, kidQuestions: undefined });
  const onlyReady = samplePackStory({ slug: "ready-one", date: "2026-10-07" });
  const padded = selectPackStories([bare, bare, bare, bare, onlyReady]);
  if (padded.length !== 1 || padded[0].slug !== "ready-one") {
    throw new Error("A short week should not be filled with stories that have no read-aloud.");
  }

  const animals = ["CO", "OH", "ME", "TX", "CA"].map((state, index) =>
    samplePackStory({ slug: `animal-${state.toLowerCase()}`, date: addDays("2026-10-22", -index), state, category: "animals" }),
  );
  const community = samplePackStory({
    slug: "community-one",
    date: "2026-10-18",
    state: "CO",
    category: "community",
    city: "Boulder",
  });
  const mixed = selectPackStories([...animals, community]);
  if (!mixed.some((story) => story.slug === "community-one")) {
    throw new Error("The pack should mix categories instead of five stories from one section.");
  }
  const france = samplePackStory({
    slug: "lyon",
    date: "2026-10-21",
    country: "FR",
    state: undefined,
    city: "Lyon",
    category: "science",
  });
  const japan = samplePackStory({
    slug: "osaka",
    date: "2026-10-16",
    country: "JP",
    state: undefined,
    city: "Osaka",
    category: "animals",
  });
  const worldly = selectPackStories([...animals, community, japan, france]);
  if (worldly[0]?.slug !== "lyon") throw new Error("The newest classroom-ready world story should lead the pack.");
  if (worldly.length !== PACK_SIZE) throw new Error("A full week should stop at five stories.");
  const plainWorld = samplePackStory({
    slug: "paris",
    date: "2026-10-21",
    country: "FR",
    state: undefined,
    city: "Paris",
    kidFriendly: false,
    kidSummary: undefined,
    kidQuestions: undefined,
  });
  if (selectPackStories([...animals, plainWorld]).some((story) => story.country !== "US")) {
    throw new Error("A world story without classroom text should stay out of the pack.");
  }
  const forward = selectPackStories([france, japan, ...animals]).map((story) => story.slug).join(",");
  const backward = selectPackStories([...animals].reverse().concat([japan, france])).map((story) => story.slug).join(",");
  if (forward !== backward) throw new Error("Pack selection should stay the same if the input order changes.");

  const early = buildClassroomPacks(
    [samplePackStory({ slug: "early", date: "2026-09-30" })],
    "2026-10-20",
  );
  if (early.length) throw new Error("A week before launch should not be a classroom pack.");
  const future = buildClassroomPacks(
    [samplePackStory({ slug: "future", date: "2026-10-26" })],
    "2026-10-20",
  );
  if (future.length) throw new Error("A week that has not started should not be a classroom pack.");
  const finished = buildClassroomPacks(
    [
      samplePackStory({ slug: "mon", date: "2026-10-05", category: "heroes", state: "UT" }),
      samplePackStory({ slug: "wed", date: "2026-10-07", category: "community", state: "NM" }),
    ],
    "2026-10-20",
  );
  if (finished.length !== 1 || finished[0].path !== "/classroom/week/2026-10-05" || finished[0].inProgress) {
    throw new Error("Classroom packs should use the Monday of the week, the same key as the roundup.");
  }
  if (finished[0].friday !== "2026-10-09" || !finished[0].teacherNote.includes("shorter than five")) {
    throw new Error("A two-story week should name Friday and say the pack is shorter than five.");
  }
  if (!finished[0].teacherNote.includes("10 to 15 minutes") || !finished[0].teacherNote.includes("grades 1 to 6")) {
    throw new Error("The teacher note should cover a 10 to 15 minute class for grades 1 to 6.");
  }
  if (!finished[0].challenge.includes("heroes") || !finished[0].challenge.includes("community") || finished[0].challenge.includes("Classroom story")) {
    throw new Error("The kindness challenge should use the week's sections and places, not a story title.");
  }
  if (!finished[0].description.toLowerCase().includes("good news for kids this week") || !finished[0].description.toLowerCase().includes("current events for kids, printable")) {
    throw new Error("A pack description should use the classroom search phrases.");
  }
  const open = buildClassroomPacks(
    Array.from({ length: 6 }, (_, index) =>
      samplePackStory({
        slug: `open-${index}`,
        date: addDays("2026-10-19", index % 4),
        category: index % 2 === 0 ? "animals" : "science",
        state: index % 2 === 0 ? "CO" : "WA",
      }),
    ),
    "2026-10-22",
  );
  if (open.length !== 1 || !open[0].inProgress || open[0].stories.length !== PACK_SIZE || open[0].title.includes("shorter")) {
    throw new Error("The open week should stay marked so far and still cap at five stories.");
  }
  if (open[0].teacherNote.includes("shorter than five")) throw new Error("Five or more classroom stories should not be described as a short pack.");

  const markup = JSON.stringify(
    classroomJsonLd({
      name: finished[0].title,
      description: finished[0].description,
      path: finished[0].path,
      crumbs: [{ name: "Good News Friday", path: CLASSROOM_INDEX_PATH }],
      resources: finished[0].stories.map((story) => ({ name: story.title, path: `/story/${story.slug}` })),
      learningResourceType: "lesson plan",
      timeRequired: "PT15M",
    }),
  );
  if (!markup.includes("LearningResource") || !markup.includes("CollectionPage") || !markup.includes("educationalLevel") || !markup.includes("Ages 6–11 (grades 1–6)")) {
    throw new Error("A pack should be a LearningResource collection with an age level.");
  }

  const today = mountainDay();
  const current = weekStart(today);
  const launch = launchWeekStart();
  const packs = getClassroomPacks();
  const published = getPublishedStories();
  const readyWeeks = new Set<string>();
  let vocabCount = 0;
  for (const story of published) {
    if (story.kidFriendly && !isClassroomReady(story)) {
      throw new Error(`${story.slug} is kid-friendly but cannot be read aloud.`);
    }
    if (packVocabulary(story)) vocabCount += 1;
    if (!isClassroomReady(story)) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    readyWeeks.add(start);
  }
  const packed = new Set(packs.map((pack) => pack.start));
  for (const start of readyWeeks) {
    if (!packed.has(start)) throw new Error(`${start} has a classroom story and should be a Good News Friday pack.`);
  }
  for (const pack of packs) {
    if (!readyWeeks.has(pack.start)) throw new Error(`${pack.path} has no classroom story.`);
    if (pack.stories.length < 1 || pack.stories.length > PACK_SIZE) throw new Error(`${pack.path} should have 1 to 5 stories.`);
    if (pack.start !== weekStart(pack.start) || pack.path !== `/classroom/week/${pack.start}`) {
      throw new Error(`${pack.path} should be keyed to Monday.`);
    }
    if (pack.inProgress !== (pack.start === current)) throw new Error(`${pack.path} has the wrong so-far flag.`);
    const weekStories = published.filter((story) => isClassroomReady(story) && weekStart(story.date) === pack.start);
    const selected = selectPackStories(weekStories).map((story) => story.slug).join(",");
    if (selected !== pack.stories.map((story) => story.slug).join(",")) {
      throw new Error(`${pack.path} selection does not match the pack rules.`);
    }
    if (weekStories.some((story) => story.country !== "US") && !pack.stories.some((story) => story.country !== "US")) {
      throw new Error(`${pack.path} left out a world story.`);
    }
    for (const story of pack.stories) {
      if (!story.kidSummary || packQuestions(story).length < 1) throw new Error(`${story.slug} is in a pack without a read-aloud.`);
    }
  }
  if (readyWeeks.has(launch) && packs[0]?.start !== launch) {
    throw new Error("Launch week has classroom stories and should be the first pack.");
  }
  const short = packs.filter((pack) => pack.stories.length < PACK_SIZE).map((pack) => `${pack.start} (${pack.stories.length})`);
  console.log(
    `Classroom packs: ${packs.length} since ${launch}. Vocabulary fields: ${vocabCount}. Shorter than five: ${short.join(", ") || "none"}.`,
  );
}

function assertThanksBoard() {
  const board = thanksBoard();
  if (board.total !== 51 || board.slots.length !== 51) {
    throw new Error("The thanks hub should cover 50 states and Washington, D.C.");
  }
  if (new Set(board.slots.map((slot) => slot.state.code)).size !== 51) {
    throw new Error("The thanks hub repeated a state.");
  }
  if (board.filled !== board.slots.filter((slot) => slot.story).length) {
    throw new Error("The thanks fill count does not match the slots.");
  }
  for (const slot of board.slots) {
    if (!slot.story) continue;
    if (slot.story.country !== "US" || (slot.story.state !== slot.state.code && !slot.story.alsoStates.includes(slot.state.code))) {
      throw new Error(`${slot.state.code} picked ${slot.story.slug}, which is not filed there`);
    }
  }
  const show = thanksBannerVisible(new Date("2026-11-15T18:00:00Z"));
  const before = thanksBannerVisible(new Date("2026-10-22T18:00:00Z"));
  const after = thanksBannerVisible(new Date("2026-12-01T18:00:00Z"));
  if (thanksSeason.banner) {
    if (!show || before || after) throw new Error("The thanks banner should show only from Nov 1 through Nov 30, 2026.");
  } else if (show || before || after) {
    throw new Error("thanksSeason.banner is false, so the homepage banner should stay hidden.");
  }
}

function credit(partial: Partial<OutletCredit> & Pick<OutletCredit, "slug" | "sourceName" | "sourceUrl">): OutletCredit {
  return {
    slug: partial.slug,
    title: partial.title ?? `A verified story from ${partial.sourceName}`,
    date: partial.date ?? "2026-10-01",
    sourceName: partial.sourceName,
    sourceUrl: partial.sourceUrl,
    country: partial.country ?? "US",
    state: partial.state,
    alsoStates: partial.alsoStates,
    help: partial.help,
  };
}

function assertOutlets() {
  if (outletNameKey("  ABC   News ") !== "abc") throw new Error("A trailing News should fold into the shorter name.");
  if (outletNameKey("ABC") !== "abc") throw new Error("Case should not split a newsroom.");
  if (outletNameKey("Good News Network") !== "good news network") {
    throw new Error("News in the middle of a name should stay.");
  }
  if (outletNameKey("The Herald-News") !== "the herald") throw new Error("A hyphenated trailing News should fold.");
  if (outletNameKey("News") !== "news") throw new Error("A name that is only News should stay.");

  const rows = buildOutlets([
    credit({ slug: "a", sourceName: "ABC News", sourceUrl: "https://www.abc.net.au/news/one", date: "2026-10-01", country: "AU" }),
    credit({ slug: "b", sourceName: "ABC", sourceUrl: "https://www.abc.net.au/news/two", date: "2026-10-02", country: "AU" }),
    credit({ slug: "c", sourceName: "ABC News", sourceUrl: "https://abcnews.go.com/one", date: "2026-10-03", country: "US", state: "NY" }),
    credit({ slug: "d", sourceName: "  Fox   2 Detroit ", sourceUrl: "https://www.fox2detroit.com/d", date: "2026-10-04", state: "MI" }),
    credit({ slug: "e", sourceName: "fox 2 detroit", sourceUrl: "https://fox2detroit.com/e", date: "2026-10-05", state: "MI" }),
    credit({ slug: "f", sourceName: "CBS Colorado", sourceUrl: "https://www.cbsnews.com/colorado/f", date: "2026-10-06", state: "CO" }),
    credit({ slug: "g", sourceName: "CBS Detroit", sourceUrl: "https://www.cbsnews.com/detroit/g", date: "2026-10-07", state: "MI" }),
    credit({ slug: "h", sourceName: "The Herald", sourceUrl: "https://www.herald.example/h", date: "2026-10-08", state: "OH" }),
    credit({ slug: "i", sourceName: "The Herald News", sourceUrl: "https://www.other.example/i", date: "2026-10-09", state: "PA" }),
    credit({ slug: "j", sourceName: "The Herald News", sourceUrl: "https://www.herald.example/j", date: "2026-10-10", state: "OH", alsoStates: ["KY"] }),
    credit({
      slug: "k",
      sourceName: "Lone Star",
      sourceUrl: "https://www.lone.example/k",
      date: "2026-10-11",
      state: "TX",
      alsoStates: ["OK"],
      help: [
        { label: "Friends, Inc.", url: "https://friends.example/help" },
        { label: "Friends, Inc.", url: "https://friends.example/help" },
      ],
    }),
  ]);

  const abcAu = rows.find((outlet) => outlet.domain === "abc.net.au");
  if (!abcAu || abcAu.count !== 2 || !abcAu.hasPage || abcAu.homepage !== "https://www.abc.net.au" || abcAu.name !== "ABC") {
    throw new Error("ABC and ABC News on the same domain should be one newsroom, named from the newest spelling when the counts tie.");
  }
  if (!abcAu.aliases.includes("ABC News") || abcAu.countries[0]?.code !== "AU" || abcAu.pagePath !== "/sources/abc") {
    throw new Error("The merged ABC newsroom should keep the other spelling and its country.");
  }
  const abcUs = rows.find((outlet) => outlet.domain === "abcnews.go.com");
  if (!abcUs || abcUs.count !== 1 || abcUs.hasPage || abcUs.slug === abcAu.slug) {
    throw new Error("The same trailing News on a different domain is a different newsroom, and it does not get a page.");
  }
  const fox = rows.find((outlet) => outlet.domain === "fox2detroit.com");
  if (!fox || fox.count !== 2 || fox.homepage !== "https://fox2detroit.com" || fox.name.toLowerCase() !== "fox 2 detroit") {
    throw new Error("www and spacing should not split a newsroom. The homepage follows the newest origin when they tie.");
  }
  const cbs = rows.filter((outlet) => outlet.domain === "cbsnews.com");
  if (cbs.length !== 2) throw new Error("Different station names on one domain stay separate.");
  const herald = rows.find((outlet) => outlet.domain === "herald.example");
  const otherHerald = rows.find((outlet) => outlet.domain === "other.example");
  if (!herald || herald.count !== 2 || herald.name !== "The Herald News" || !herald.states.some((state) => state.code === "KY")) {
    throw new Error("Trailing News merges only on the same domain, and alsoStates still count.");
  }
  if (!otherHerald || otherHerald.count !== 1 || otherHerald.slug === herald.slug) {
    throw new Error("A trailing News on another domain keeps its own page slug.");
  }
  const lone = rows.find((outlet) => outlet.domain === "lone.example");
  if (!lone || lone.states.map((state) => state.code).join(",") !== "OK,TX" || lone.help.length !== 1) {
    throw new Error("State names should be alphabetical, and duplicate help links should collapse.");
  }

  const csv = formatOutletCsv([
    {
      outlet: 'Say "Hello", Friends',
      domain: "example.com",
      homepage: "https://example.com",
      states: "Ohio",
      storyCount: 2,
      latestDate: "2026-10-11",
      storyUrls: "https://example.com/story/a | https://example.com/story/b",
      nonprofits: "Friends, Inc. (https://friends.example/help)",
    },
  ]);
  if (!csv.startsWith("outlet,domain,homepage,states,story_count,latest_date,story_urls,nonprofits\n")) {
    throw new Error("The outlet CSV header changed.");
  }
  if (!csv.includes('"Say ""Hello"", Friends"')) throw new Error("CSV fields should quote commas and escape quotes.");

  const live = getOutlets();
  const published = getPublishedStories();
  if (live.reduce((sum, outlet) => sum + outlet.count, 0) !== published.length) {
    throw new Error("Every published story should belong to exactly one newsroom.");
  }
  const slugs = new Set<string>();
  for (const outlet of live) {
    if (slugs.has(outlet.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(outlet.slug)) {
      throw new Error(`Newsroom slug is missing or duplicated: ${outlet.slug}`);
    }
    slugs.add(outlet.slug);
    if (outlet.hasPage !== outlet.count >= 2 || Boolean(outlet.pagePath) !== outlet.hasPage) {
      throw new Error(`${outlet.name} has a page flag that does not match its story count.`);
    }
    if (outlet.domain.startsWith("www.") || !outlet.homepage.startsWith("https://")) {
      throw new Error(`${outlet.name} has a bad domain or homepage.`);
    }
  }
  for (const story of published) {
    const outlet = getOutletForStory(story);
    if (!outlet?.stories.some((item) => item.slug === story.slug)) {
      throw new Error(`${story.slug} is missing from the newsroom grouped by its source.`);
    }
  }
  const abcStories = published.filter((story) => {
    try {
      return new URL(story.sourceUrl).hostname.toLowerCase().replace(/^www\./, "") === "abc.net.au";
    } catch {
      return false;
    }
  });
  const abcSameName = abcStories.filter((story) => outletNameKey(story.sourceName) === "abc");
  if (abcSameName.length >= 2) {
    const outlet = getOutletForStory(abcSameName[0]);
    const folded = abcSameName.every((story) => outlet?.stories.some((item) => item.slug === story.slug));
    if (!outlet || outlet.domain !== "abc.net.au" || !folded) {
      throw new Error("ABC and ABC News on abc.net.au should be one credited newsroom.");
    }
  }
  if (live.filter((outlet) => outlet.domain === "cbsnews.com").length < 2) {
    throw new Error("Station names on cbsnews.com should stay separate.");
  }
  if (live.filter((outlet) => outlet.domain === "fox19.com").length < 2) {
    throw new Error("Different names on fox19.com should stay separate.");
  }
}

function sampleQuizStory(partial: Partial<QuizSource> & Pick<QuizSource, "slug" | "date">): QuizSource {
  return {
    title: `Neighbors kept a library hour going ${partial.slug}`,
    shortTitle: `Library hour ${partial.slug}`,
    city: "Denver",
    country: "US",
    state: "CO",
    alsoStates: [],
    category: "community",
    image: `/images/stories/${partial.slug}.webp`,
    imageAlt: `People outside a small library for ${partial.slug}`,
    kidFriendly: false,
    ...partial,
  };
}

function givesAway(prompt: string, answer: string): boolean {
  const escaped = answer.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (escaped.length < 2) return false;
  return new RegExp(`\\b${escaped}\\b`, "i").test(prompt);
}

function assertQuizQuestion(question: QuizQuestion, bySlug: Map<string, QuizSource>, kidOnly: boolean) {
  if (question.choices.length !== 4) throw new Error(`${question.id} should have 4 choices.`);
  if (question.choices.map((choice) => choice.id).join("") !== "abcd") {
    throw new Error(`${question.id} should label choices a through d.`);
  }
  const answer = question.choices.find((choice) => choice.id === question.answerId);
  const subject = bySlug.get(question.storySlug);
  if (!answer || !subject) throw new Error(`${question.id} is missing its answer or story.`);
  if (answer.sourceSlug !== subject.slug) throw new Error(`${question.id} answer should come from its own story.`);
  if (quizChoiceLabel(subject, question.kind) !== answer.label) {
    throw new Error(`${question.id} answer label does not match the story.`);
  }
  if (question.kind !== "headline" && givesAway(question.prompt, answer.label)) {
    throw new Error(`${question.id} prompt gives away the answer.`);
  }
  const bannedStates = new Set((subject.alsoStates ?? []).map((code) => stateName(code)).filter(Boolean));
  const labels = new Set<string>();
  for (const choice of question.choices) {
    const key = choice.label.toLowerCase();
    if (labels.has(key)) throw new Error(`${question.id} repeats a choice.`);
    labels.add(key);
    const source = bySlug.get(choice.sourceSlug);
    if (!source) throw new Error(`${question.id} uses a choice from an unknown story.`);
    if (quizChoiceLabel(source, question.kind) !== choice.label) {
      throw new Error(`${question.id} choice was not taken from that story.`);
    }
    if (choice.id !== question.answerId && choice.sourceSlug === subject.slug) {
      throw new Error(`${question.id} uses the same story as a wrong answer.`);
    }
    if (question.kind === "state" && choice.id !== question.answerId && bannedStates.has(choice.label)) {
      throw new Error(`${question.id} offers another state from the same story as a wrong answer.`);
    }
    if (question.kind === "photo" && choice.image !== source.image) {
      throw new Error(`${question.id} photo choice does not use that story's photo.`);
    }
    if (kidOnly && !source.kidFriendly) throw new Error(`${question.id} kid-mode choice is not a classroom story.`);
  }
}

function assertQuizShape(questions: QuizQuestion[], bySlug: Map<string, QuizSource>, kidOnly: boolean) {
  if (questions.length < MIN_QUIZ_QUESTIONS || questions.length > MAX_QUIZ_QUESTIONS) {
    throw new Error(`A quiz should have 5 to 7 questions. Got ${questions.length}.`);
  }
  questions.forEach((question, index) => {
    if (question.id !== `q${index + 1}`) throw new Error("Question ids should stay in play order.");
    assertQuizQuestion(question, bySlug, kidOnly);
  });
}

function assertQuizzes() {
  if (quizShareText(6, 7) !== `I got 6/7 on this week's ${siteConfig.name} Good News Quiz`) {
    throw new Error("Share text should be the spoiler-free score line.");
  }
  if (quizShareUrl("/quiz/2026-10-19", false) !== `${siteConfig.url}/quiz/2026-10-19`) {
    throw new Error("Share link should be the quiz page.");
  }
  if (quizShareUrl("/quiz/2026-10-19", true) !== `${siteConfig.url}/quiz/2026-10-19?kids=1`) {
    throw new Error("Kid mode share link should keep the score text and add the kid flag.");
  }

  const diverse = [
    sampleQuizStory({ slug: "meal-one", date: "2026-10-06", city: "Denver", state: "CO", category: "community", kidFriendly: true }),
    sampleQuizStory({ slug: "meal-two", date: "2026-10-07", city: "Saint Paul", state: "MN", category: "heroes", kidFriendly: true }),
    sampleQuizStory({ slug: "meal-three", date: "2026-10-08", city: "Austin", state: "TX", category: "animals", kidFriendly: true }),
    sampleQuizStory({
      slug: "meal-four",
      date: "2026-10-09",
      city: "Portland",
      state: "OR",
      category: "science",
      kidFriendly: true,
      alsoStates: ["WA"],
    }),
    sampleQuizStory({ slug: "meal-five", date: "2026-10-10", city: "Augusta", state: "ME", category: "health-tech", kidFriendly: true }),
    sampleQuizStory({ slug: "meal-six", date: "2026-10-06", city: "Kyoto", country: "JP", state: undefined, category: "animals", kidFriendly: true }),
    sampleQuizStory({ slug: "meal-seven", date: "2026-10-11", city: "Nairobi", country: "KE", state: undefined, category: "community" }),
    sampleQuizStory({ slug: "meal-eight", date: "2026-10-05", city: "Savannah", state: "GA", category: "heroes", alsoStates: ["SC"] }),
  ];
  const lone = sampleQuizStory({
    slug: "lone-hour",
    date: "2026-10-13",
    city: "Boulder",
    state: "CO",
    category: "community",
    kidFriendly: true,
  });
  const made = buildQuizzes([...diverse, lone], "2026-10-20");
  if (made.length !== 2 || made[0]?.start !== "2026-10-05" || made[1]?.start !== "2026-10-12" || made[1]?.inProgress) {
    throw new Error("Sample weeks should make two finished quizzes.");
  }
  if (!made[0]?.kidQuestions.length || !made[1]?.kidQuestions.length) {
    throw new Error("Sample weeks with classroom stories should include kid mode.");
  }
  const during = buildQuizzes([...diverse, lone], "2026-10-07");
  if (during.length !== 1 || during[0]?.start !== "2026-10-05" || !during[0]?.inProgress) {
    throw new Error("The open week should be the only quiz while that week is in progress.");
  }
  if (buildQuizzes([sampleQuizStory({ slug: "too-early", date: "2026-09-29" })], "2026-10-20").length) {
    throw new Error("A week before launch should not get a quiz.");
  }
  if (buildQuizzes([sampleQuizStory({ slug: "too-late", date: "2026-10-26" })], "2026-10-20").length) {
    throw new Error("A week that has not started should not get a quiz.");
  }
  const thin = buildQuizzes(
    [
      sampleQuizStory({ slug: "thin-one", date: "2026-10-06", city: "Denver", state: "CO" }),
      sampleQuizStory({ slug: "thin-two", date: "2026-10-07", city: "Denver", state: "CO" }),
    ],
    "2026-10-20",
  );
  if (thin.length) throw new Error("Two stories that share a place cannot fill four choices.");
  if (
    buildQuizzes(
      [sampleQuizStory({ slug: "draft-only", date: "2026-10-06", draft: true, city: "Boise", state: "ID" })],
      "2026-10-20",
    ).length
  ) {
    throw new Error("Draft stories should stay out of the quiz.");
  }

  const published = getPublishedStories();
  const bySlug = new Map<string, QuizSource>(published.map((story) => [story.slug, story]));
  const real = buildQuizzes(published);
  if (JSON.stringify(real) !== JSON.stringify(buildQuizzes(published))) {
    throw new Error("Quiz generation should be deterministic.");
  }
  const today = weekStart(mountainDay());
  const launch = launchWeekStart();
  const counts = new Map<string, number>();
  for (const story of published) {
    const start = weekStart(story.date);
    if (start < launch || start > today) continue;
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  const got = new Set(real.map((quiz) => quiz.start));
  for (const [start, count] of counts) {
    if (count >= 10 && !got.has(start)) {
      throw new Error(`Week ${start} has ${count} stories and should have a quiz.`);
    }
  }
  for (const start of got) {
    if (!counts.has(start)) throw new Error(`Quiz ${start} does not match a published week.`);
  }
  for (const quiz of real) {
    if (quiz.path !== `/quiz/${quiz.start}` || weekStart(quiz.start) !== quiz.start) {
      throw new Error(`Quiz path should be the Monday date. Got ${quiz.path}.`);
    }
    if (quiz.inProgress !== (quiz.start === today)) throw new Error("The open week flag should follow Mountain Time.");
    assertQuizShape(quiz.questions, bySlug, false);
    if (quiz.kidStoryCount >= 8 && quiz.kidQuestions.length < MIN_QUIZ_QUESTIONS) {
      throw new Error(`${quiz.start} has classroom stories but no kid-mode quiz.`);
    }
    if (quiz.kidQuestions.length) assertQuizShape(quiz.kidQuestions, bySlug, true);
    const data = quizJsonLd(quiz);
    const node = data["@graph"].find((item) => {
      const kind = item["@type"];
      return Array.isArray(kind) && kind.includes("Quiz") && kind.includes("LearningResource");
    });
    if (!node || !("author" in node)) throw new Error("Quiz structured data should be a Quiz and a LearningResource.");
    const author = node.author as { "@type"?: string; name?: string };
    if (author["@type"] !== "Organization" || author.name !== siteConfig.editor.name) {
      throw new Error("The quiz byline should be the editorial organization, not a person.");
    }
    const parts = node.hasPart as { acceptedAnswer?: { text?: string }; suggestedAnswer?: { text?: string }[] }[];
    if (parts.length !== quiz.questions.length) throw new Error("Structured data should list every question.");
    parts.forEach((part, index) => {
      const answer = quiz.questions[index]?.choices.find((choice) => choice.id === quiz.questions[index]?.answerId);
      if (part.acceptedAnswer?.text !== answer?.label) throw new Error("Structured data should name the accepted answer.");
      if (part.suggestedAnswer?.some((choice) => choice.text === answer?.label)) {
        throw new Error("Structured data should not list the right answer twice.");
      }
    });
  }
}

function assertOnThisDay() {
  const rejected = onThisDayFileSchema.safeParse({
    updated: "2026-10-25",
    days: [
      {
        month: 10,
        day: 25,
        prompts: ["What is one kind thing to try?", "What would your class headline be?"],
        entries: [
          {
            year: 1903,
            text: "One sentence is not enough when the schema also requires a second milestone.",
            kidLine: "A read-aloud line still needs a second milestone on the day.",
            sources: [{ name: "Example", url: "https://www.nasa.gov/history/" }],
          },
        ],
      },
    ],
  });
  if (rejected.success) throw new Error("A day with one milestone should fail.");
  if (parseMonthDaySlug("february-30")) throw new Error("February 30 should not be a page.");
  if (!parseMonthDaySlug("february-29")) throw new Error("February 29 should be a page.");
  if (onThisDayPath(10, 25) !== "/on-this-day/october-25") throw new Error("October 25 path changed.");
  const october = monthDayFromIso("2026-10-25");
  if (!october || october.month !== 10 || october.day !== 25) throw new Error("Archive dates should match month and day.");
  const file = loadOnThisDay();
  if (file.days.length < 68) throw new Error("October 25 through December 31 should each have milestones.");
  const matched = storiesForMonthDay(10, 25);
  if (matched.some((story) => !story.date.endsWith("-10-25"))) {
    throw new Error("October 25 archive list included another date.");
  }
  console.log(`On this day: ${file.days.length} seeded days, ${file.days.reduce((sum, day) => sum + day.entries.length, 0)} milestones.`);
}

function givingFixture(partial: {
  slug: string;
  state: string;
  label: string;
  url: string;
  kind?: GivingStory["howToHelp"][number]["kind"];
  tags?: string[];
  date?: string;
  city?: string;
}): GivingStory {
  return {
    slug: partial.slug,
    title: "A headline that is long enough",
    dek: "A researched summary that is long enough to stand in for the story.",
    date: partial.date ?? "2026-10-01",
    city: partial.city ?? "Hometown",
    country: "US",
    state: partial.state,
    category: "community",
    tags: partial.tags ?? ["neighbors"],
    sourceName: "Local Paper",
    sourceUrl: "https://example.com/source",
    image: "/images/stories/example.webp",
    imageAlt: "An example photo",
    howToHelp: [{ label: partial.label, url: partial.url, kind: partial.kind ?? "donate" }],
  };
}

function assertGivingTuesday(stories: Story[]) {
  if (isGivingTuesdaySeason("2026-10-26") || isGivingTuesdaySeason("2026-11-23")) {
    throw new Error("The Giving Tuesday banner should stay down before November 24, 2026.");
  }
  if (!isGivingTuesdaySeason("2026-11-24") || !isGivingTuesdaySeason("2026-12-01") || !isGivingTuesdaySeason("2026-12-02")) {
    throw new Error("The Giving Tuesday banner should run from November 24 through December 2, 2026.");
  }
  if (isGivingTuesdaySeason("2026-12-03") || isGivingTuesdaySeason("2027-11-24") || isGivingTuesdaySeason("2025-12-01")) {
    throw new Error("The Giving Tuesday banner window is only November 24 through December 2, 2026.");
  }
  if (organizationName("Denver Zoo") !== "Denver Zoo") throw new Error("A bare organization label should stay whole.");
  if (organizationName("Support the Denver Zoo") !== "Denver Zoo") {
    throw new Error("A support label should keep the organization named in that label.");
  }
  if (organizationName("Donate food to Community Harvest Food Bank") !== "Community Harvest Food Bank") {
    throw new Error("A donate-goods label should keep the organization named in that label.");
  }
  if (organizationName("Help Shoes That Fit provide new shoes") !== "Help Shoes That Fit provide new shoes") {
    throw new Error("A label with a leftover verb should stay whole.");
  }
  if (organizationName("Learn first aid with the American Red Cross") !== "Learn first aid with the American Red Cross") {
    throw new Error("A learn-more sentence should stay whole when it does not name an organization up front.");
  }
  if (freeActionOf({ kind: "volunteer", label: "Metro United Way" }) !== "volunteer") {
    throw new Error("A volunteer link should be marked as costing nothing.");
  }
  if (freeActionOf({ kind: "donate", label: "Donate food to Community Harvest Food Bank" }) !== "goods") {
    throw new Error("Donating food should be marked as goods.");
  }
  if (freeActionOf({ kind: "donate", label: "Give to the Lowcountry Food Bank" }) !== null) {
    throw new Error("A money gift should not be marked as donated goods.");
  }
  if (freeActionOf({ kind: "thank", label: "Florence Fire/EMS" }) !== "thanks") {
    throw new Error("A thank-you link should be marked as costing nothing.");
  }
  if (freeActionOf({ kind: "learn", label: "Denver Zoo" }) !== null) {
    throw new Error("A learn-more link should not be marked as costing nothing.");
  }
  if (freeActionOf({ kind: "learn", label: "See how to help next year's Book Share" }) !== null) {
    throw new Error("Book Share is a name in the label, not a share action.");
  }

  const animalStates = ["AL", "AK", "AZ", "AR", "CA", "CT"].map((state) =>
    givingFixture({
      slug: `animal-${state.toLowerCase()}`,
      state,
      label: `${state} Animal Shelter`,
      url: `https://example.org/${state.toLowerCase()}-shelter`,
      tags: ["dogs"],
    }),
  );
  const mixed = buildGivingGuide(
    [
      ...animalStates,
      givingFixture({
        slug: "nm-animals",
        state: "NM",
        label: "New Mexico Animal Shelter",
        url: "https://example.org/nm-animals",
        tags: ["dogs"],
        city: "Santa Fe",
      }),
      givingFixture({
        slug: "nm-veterans",
        state: "NM",
        label: "New Mexico Veterans House",
        url: "https://example.org/nm-veterans",
        tags: ["veterans"],
        city: "Santa Fe",
      }),
    ],
    [],
  );
  const nm = mixed.picks.find((pick) => pick.stateCode === "NM");
  if (nm?.slug !== "nm-veterans") {
    throw new Error(`A state with two equal links should prefer the less-used cause. Got ${nm?.slug ?? "nothing"}.`);
  }

  const shared = "https://www.redcross.org/cpr";
  const national = buildGivingGuide(
    [
      givingFixture({ slug: "al-rc", state: "AL", label: "American Red Cross", url: shared, kind: "learn", tags: ["first-responders"] }),
      givingFixture({ slug: "ak-rc", state: "AK", label: "American Red Cross", url: shared, kind: "learn", tags: ["first-responders"] }),
      givingFixture({ slug: "az-rc", state: "AZ", label: "American Red Cross", url: shared, kind: "learn", tags: ["first-responders"] }),
      givingFixture({ slug: "co-rc", state: "CO", label: "American Red Cross", url: shared, kind: "learn", tags: ["first-responders"] }),
      givingFixture({
        slug: "co-local",
        state: "CO",
        label: "Hometown Pantry",
        url: "https://hometownpantry.example/help",
        tags: ["food-banks"],
        city: "Denver",
      }),
    ],
    [],
  );
  const co = national.picks.find((pick) => pick.stateCode === "CO");
  if (co?.slug !== "co-local") {
    throw new Error(`A local donate link should beat a repeated national learn link. Got ${co?.slug ?? "nothing"}.`);
  }

  const pinned = buildGivingGuide(
    [
      givingFixture({ slug: "auto-pick", state: "WY", label: "Local Shelter", url: "https://example.org/auto", tags: ["dogs"], date: "2026-10-02" }),
      givingFixture({
        slug: "editor-pick",
        state: "WY",
        label: "Pinned Pantry",
        url: "https://example.org/pin",
        tags: ["food-banks"],
        date: "2026-01-01",
      }),
    ],
    [{ state: "WY", slug: "editor-pick" }],
  );
  const wy = pinned.picks.find((pick) => pick.stateCode === "WY");
  if (!wy || wy.slug !== "editor-pick" || !wy.pinned || wy.organization !== "Pinned Pantry") {
    throw new Error("An editor pin should replace the automatic pick.");
  }
  if (pinned.gaps.length !== STATES.length - 1) throw new Error("States without a story should be gap cards.");

  let missingPin = false;
  try {
    buildGivingGuide([givingFixture({ slug: "only-wy", state: "WY", label: "Wyoming Shelter", url: "https://example.org/wy" })], [
      { state: "WY", slug: "missing-story" },
    ]);
  } catch {
    missingPin = true;
  }
  if (!missingPin) throw new Error("A pin for a missing story should fail.");

  let badUrl = false;
  try {
    buildGivingGuide([givingFixture({ slug: "only-wy", state: "WY", label: "Wyoming Shelter", url: "https://example.org/wy" })], [
      { state: "WY", slug: "only-wy", url: "https://example.org/not-on-the-story" },
    ]);
  } catch {
    badUrl = true;
  }
  if (!badUrl) throw new Error("A pin URL that is not on the story should fail.");

  const guide = buildGivingGuide(stories, GIVING_TUESDAY_PINS);
  if (guide.picks.length + guide.gaps.length !== STATES.length) {
    throw new Error("Giving Tuesday should account for every state and Washington, D.C.");
  }
  const seen = new Set<string>();
  for (const pick of [...guide.picks, ...guide.alternates]) {
    if (seen.has(pick.stateCode) && guide.picks.includes(pick)) {
      throw new Error(`Two featured picks for ${pick.stateCode}.`);
    }
    const story = stories.find((item) => item.slug === pick.slug);
    if (!story || story.draft || story.country !== "US" || story.state !== pick.stateCode) {
      throw new Error(`${pick.stateCode} features ${pick.slug}, which is not a published story in that state.`);
    }
    const help = story.howToHelp.find((item) => item.url === pick.helpUrl && item.label === pick.helpLabel && item.kind === pick.helpKind);
    if (!help) throw new Error(`${pick.stateCode} features a how-to-help link that is not on ${pick.slug}.`);
    if (!pick.helpLabel.includes(pick.organization) || !pick.organization) {
      throw new Error(`${pick.stateCode} organization “${pick.organization}” is not taken from the help label.`);
    }
    if (pick.dek !== story.dek || pick.sourceName !== story.sourceName || pick.sourceUrl !== story.sourceUrl || pick.image !== story.image) {
      throw new Error(`${pick.stateCode} changed the story's summary, source, or photo.`);
    }
    if (pick.freeAction !== freeActionOf(help)) throw new Error(`${pick.stateCode} free-action label does not match the link.`);
    if (!pick.helpUrl.startsWith("https://")) throw new Error(`${pick.stateCode} help link is not https.`);
  }
  for (const pick of guide.picks) {
    if (seen.has(pick.stateCode)) throw new Error(`Two featured picks for ${pick.stateCode}.`);
    seen.add(pick.stateCode);
  }
  for (const gap of guide.gaps) {
    const available = stories.some((story) => !story.draft && story.country === "US" && story.state === gap.code && story.howToHelp.length > 0);
    if (available) throw new Error(`${gap.name} has a how-to-help link and should not be a gap.`);
  }
  const missing = guide.gaps.map((state) => state.code).join(", ");
  console.log(`Giving Tuesday: ${guide.picks.length} of ${STATES.length}. Missing: ${missing || "none"}.`);
}

const stories = loadAllStories();
assertImageVariants();
assertListenText();
assertVeteransDayHub();
assertSchemaRejectsGarbage();
assertCountryRules();
assertWorldSpotlight();
assertHubs();
assertKidClassrooms();
assertWeeks();
assertGoodNewsIndex();
assertClassroomPacks();
assertQuizzes();
assertOnThisDay();
assertPrerenderCoversArchive(stories.filter((story) => !story.draft).length);
assertEnrichmentMerge();
assertLoadedCountries(stories);
assertSeedSources(stories);
assertTipMail();
assertOnlyMailbox();
assertBrandLivesInOneFile();
assertOutlets();
assertFeeds();
assertPartnerKit();
assertThanksBoard();
assertExplainers();
assertGivingTuesday(stories);
const published = stories.filter((story) => !story.draft);
const images = feedImageReport(published.map((story) => story.image));
console.log(`Validated ${stories.length} stories. Feed images: ${images.large} large JPEGs, ${images.fallback} WebP fallbacks.`);
