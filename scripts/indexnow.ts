import { getCategory } from "../lib/categories";
import { goodNeighborPath } from "../lib/good-neighbor";
import { ballotMonths } from "../lib/good-neighbor-data";
import { getCountry } from "../lib/countries";
import { countryIsIndexable, hubPathsForStory } from "../lib/hubs";
import { kidPlaceForStory } from "../lib/kids";
import { explainerPaths } from "../lib/explainers";
import { loadAnnouncementDays, MORNING_ANNOUNCEMENTS_PATH } from "../lib/morning-announcements";
import { indexNowKey, indexNowKeyLocation } from "../lib/indexnow";
import { getOutletForStory } from "../lib/outlets";
import { isWithinHours } from "../lib/seo";
import { getPublishedStories } from "../lib/stories";
import { getStateByCode } from "../lib/states";
import { CLASSROOM_INDEX_PATH, packsToPrerender } from "../lib/classroom-pack";
import { indexesToPrerender } from "../lib/good-news-index";
import { allOnThisDayPaths, ON_THIS_DAY_INDEX_PATH } from "../lib/on-this-day";
import { quizzesToPrerender } from "../lib/quiz";
import { THANKS_PATH } from "../lib/thanks";
import { FIRST_RESPONDERS_DAY_PATH } from "../lib/first-responders-day";
import { getKindnessChallenges } from "../lib/kindness";
import { loadSpanishEditions } from "../lib/spanish-editions";
import { VETERANS_DAY_PATH } from "../lib/veterans-day";
import { weeksToPrerender } from "../lib/weeks";
import { listWebStories } from "../lib/web-stories";
import { newsBreakBanner, siteConfig } from "../site.config";

const STATIC_PATHS = ["/", newsBreakBanner.path, "/sitemap.xml", "/news-sitemap.xml", "/rss.xml", "/smartnews.xml", "/atom.xml", "/feeds", "/about", "/editorial-standards", "/corrections", "/contact", "/local", "/world", "/world/rss.xml", "/week", "/week/rss.xml", "/quiz", "/kids", "/kids/rss.xml", "/kids/print", CLASSROOM_INDEX_PATH, "/kindness-challenge", MORNING_ANNOUNCEMENTS_PATH, "/topics", "/featured", "/widgets", "/good-news-index", THANKS_PATH, "/sources", "/web-stories", ON_THIS_DAY_INDEX_PATH, "/giving-tuesday", VETERANS_DAY_PATH, FIRST_RESPONDERS_DAY_PATH, "/good-neighbor", "/good-neighbor/winners", "/heroes", "/es", "/es/buenas-noticias", "/es/rss.xml"];

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("IndexNow skipped outside a production deploy.");
    return;
  }

  const urls = new Set(STATIC_PATHS.map((path) => (path === "/" ? siteConfig.url : `${siteConfig.url}${path}`)));
  for (const path of explainerPaths()) urls.add(`${siteConfig.url}${path}`);
  for (const week of weeksToPrerender()) urls.add(`${siteConfig.url}${week.path}`);
  for (const edition of indexesToPrerender()) urls.add(`${siteConfig.url}${edition.path}`);
  for (const pack of packsToPrerender()) urls.add(`${siteConfig.url}${pack.path}`);
  for (const quiz of quizzesToPrerender()) urls.add(`${siteConfig.url}${quiz.path}`);
  for (const path of allOnThisDayPaths()) urls.add(`${siteConfig.url}${path}`);
  for (const month of ballotMonths()) urls.add(`${siteConfig.url}${goodNeighborPath(month)}`);
  for (const challenge of getKindnessChallenges()) urls.add(`${siteConfig.url}${challenge.path}`);
  for (const edition of loadSpanishEditions()) urls.add(`${siteConfig.url}${edition.path}`);
  const recent = getPublishedStories().filter((story) => isWithinHours(story.date, 48));
  for (const edition of listWebStories()) {
    if (isWithinHours(edition.date, 48)) urls.add(`${siteConfig.url}${edition.path}`);
  }
  for (const story of recent) {
    urls.add(`${siteConfig.url}/story/${story.slug}`);
    const outlet = getOutletForStory(story);
    if (outlet?.hasPage && outlet.pagePath) urls.add(`${siteConfig.url}${outlet.pagePath}`);
    const state = getStateByCode(story.state);
    if (state) urls.add(`${siteConfig.url}/state/${state.slug}`);
    const country = getCountry(story.country);
    if (country && countryIsIndexable(country.code)) urls.add(`${siteConfig.url}/country/${country.slug}`);
    for (const path of hubPathsForStory(story, { indexableOnly: true })) urls.add(`${siteConfig.url}${path}`);
    if (story.country !== "US") urls.add(`${siteConfig.url}/world`);
    if (getCategory(story.category)) urls.add(`${siteConfig.url}/category/${story.category}`);
    if (story.kidFriendly) {
      urls.add(`${siteConfig.url}/kids`);
      urls.add(`${siteConfig.url}/kids/print`);
      urls.add(`${siteConfig.url}${MORNING_ANNOUNCEMENTS_PATH}`);
      const announcement = loadAnnouncementDays().find((day) => day.date === story.date);
      if (announcement?.kind === "script" && announcement.script.indexable) {
        urls.add(`${siteConfig.url}${announcement.path}`);
      }
      const classroom = kidPlaceForStory(story);
      if (classroom) urls.add(`${siteConfig.url}${classroom}`);
      if (story.country === "US") {
        for (const extra of story.alsoStates) {
          const extraState = getStateByCode(extra);
          if (extraState) urls.add(`${siteConfig.url}/kids/state/${extraState.slug}`);
        }
      }
    }
  }

  const urlList = [...urls];
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(siteConfig.url).host,
      key: indexNowKey,
      keyLocation: indexNowKeyLocation(),
      urlList,
    }),
  });
  const body = await response.text();
  console.log(`IndexNow ${response.status} for ${urlList.length} URLs`);
  if (!response.ok) console.warn(body.slice(0, 500));
}

main().catch((error: unknown) => {
  console.warn("IndexNow ping failed.");
  console.warn(error instanceof Error ? error.message : error);
});
