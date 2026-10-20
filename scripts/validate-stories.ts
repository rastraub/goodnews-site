import fs from "fs";
import path from "path";
import { parseEmailInterest } from "../lib/email";
import { SMARTNEWS_DESCRIPTION, renderRss, renderSmartNews, storyHtml } from "../lib/feed";
import { feedImageReport } from "../lib/feed-image";
import { buildHubs, getHubIndex, MAX_PRERENDERED_HUBS, MIN_HUB_STORIES, type HubStory } from "../lib/hubs";
import { getKidStories, kidPlaces, storyOfTheDay } from "../lib/kids";
import { MAX_PRERENDERED_PAGES, pageCount, STATIC_STORY_CAP } from "../lib/paging";
import { storySchema } from "../lib/story-schema";
import { getPublishedStories, loadAllStories } from "../lib/stories";
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
  const duplicate = storySchema.safeParse(minimalStory({ state: "OH", tags: ["dogs", "dogs"] }));
  if (duplicate.success) throw new Error("Duplicate tags should fail.");
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
  console.log(`Prerender: ${storyCount} stories, ${pages} archive pages, ${hubCount} hubs. Caps ${STATIC_STORY_CAP} / ${MAX_PRERENDERED_PAGES} / ${MAX_PRERENDERED_HUBS}.`);
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

const stories = loadAllStories();
assertSchemaRejectsGarbage();
assertCountryRules();
assertWorldSpotlight();
assertHubs();
assertKidClassrooms();
assertPrerenderCoversArchive(stories.filter((story) => !story.draft).length);
assertLoadedCountries(stories);
assertSeedSources(stories);
assertTipMail();
assertOnlyMailbox();
assertBrandLivesInOneFile();
assertFeeds();
const published = stories.filter((story) => !story.draft);
const images = feedImageReport(published.map((story) => story.image));
console.log(`Validated ${stories.length} stories. Feed images: ${images.large} large JPEGs, ${images.fallback} WebP fallbacks.`);
