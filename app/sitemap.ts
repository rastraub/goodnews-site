import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { ballotMonths, getBallot } from "@/lib/good-neighbor-data";
import { editionMonth } from "@/lib/good-neighbor";
import { kidPlaces } from "@/lib/kids";
import { GIVING_TUESDAY_PATH, getGivingGuide } from "@/lib/giving-tuesday";
import { getHubIndex, indexableHubs } from "@/lib/hubs";
import { indexableAnnouncementDays, loadAnnouncementDays, MORNING_ANNOUNCEMENTS_PATH } from "@/lib/morning-announcements";
import { absoluteUrl } from "@/lib/seo";
import { explainerModifiedDate, explainerPath, EXPLAINER_INDEX_PATH, getPublishedExplainers } from "@/lib/explainers";
import { FIRST_RESPONDERS_DAY_PATH, getFirstRespondersDayHub } from "@/lib/first-responders-day";
import { getOutlets } from "@/lib/outlets";
import { getPublishedStories } from "@/lib/stories";
import { STATES } from "@/lib/states";
import { parseMonthDaySlug } from "@/lib/calendar-day";
import { CLASSROOM_INDEX_PATH, packsToPrerender } from "@/lib/classroom-pack";
import { indexesToPrerender } from "@/lib/good-news-index";
import { allOnThisDayPaths, getOnThisDay, onThisDayLastModified, ON_THIS_DAY_INDEX_PATH, onThisDayUpdated } from "@/lib/on-this-day";
import { quizzesToPrerender } from "@/lib/quiz";
import { getKindnessChallenges } from "@/lib/kindness";
import { THANKS_PATH, thanksBoard } from "@/lib/thanks";
import { getVeteransDayHub, VETERANS_DAY_PATH } from "@/lib/veterans-day";
import { loadSpanishEditions } from "@/lib/spanish-editions";
import { mountainDay, weeksToPrerender } from "@/lib/weeks";
import { listWebStories } from "@/lib/web-stories";
import { newsBreakBanner } from "@/site.config";

const STATIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: newsBreakBanner.path, changeFrequency: "daily", priority: 0.8 },
  { path: "/local", changeFrequency: "daily", priority: 0.8 },
  { path: "/heroes", changeFrequency: "daily", priority: 0.7 },
  { path: "/kids", changeFrequency: "daily", priority: 0.6 },
  { path: "/kindness-challenge", changeFrequency: "weekly", priority: 0.7 },
  { path: "/kids/print", changeFrequency: "daily", priority: 0.5 },
  { path: MORNING_ANNOUNCEMENTS_PATH, changeFrequency: "daily", priority: 0.6 },
  { path: "/topics", changeFrequency: "daily", priority: 0.6 },
  { path: "/sources", changeFrequency: "daily", priority: 0.6 },
  { path: "/stories", changeFrequency: "daily", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/editorial-standards", changeFrequency: "monthly", priority: 0.6 },
  { path: "/corrections", changeFrequency: "weekly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/submit", changeFrequency: "yearly", priority: 0.4 },
  { path: "/subscribe", changeFrequency: "yearly", priority: 0.4 },
  { path: "/help", changeFrequency: "weekly", priority: 0.4 },
  { path: "/feeds", changeFrequency: "monthly", priority: 0.4 },
  { path: "/featured", changeFrequency: "daily", priority: 0.5 },
  { path: "/widgets", changeFrequency: "daily", priority: 0.4 },
  { path: "/membership", changeFrequency: "yearly", priority: 0.3 },
  { path: "/partner", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

function bump(map: Map<string, string>, key: string | undefined, date: string) {
  if (!key) return;
  const current = map.get(key);
  if (!current || date > current) map.set(key, date);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const stories = getPublishedStories();
  const hubs = getHubIndex();
  const latestState = new Map<string, string>();
  const latestCategory = new Map<string, string>();
  let siteLatest: string | undefined;
  let worldLatest: string | undefined;

  for (const story of stories) {
    if (!siteLatest || story.date > siteLatest) siteLatest = story.date;
    bump(latestCategory, story.category, story.date);
    if (story.country !== "US") {
      if (!worldLatest || story.date > worldLatest) worldLatest = story.date;
    }
    if (story.country === "US" && story.state) {
      bump(latestState, story.state, story.date);
      for (const extra of story.alsoStates) bump(latestState, extra, story.date);
    }
  }

  const weeks = weeksToPrerender();
  const newestWeek = weeks[weeks.length - 1];
  const indexes = indexesToPrerender();
  const newestIndex = indexes[indexes.length - 1];
  const packs = packsToPrerender();
  const newestPack = packs[packs.length - 1];
  const thanks = thanksBoard(stories);
  const thanksLatest = thanks.slots.reduce<string | undefined>((latest, slot) => {
    const date = slot.story?.date;
    if (!date) return latest;
    return !latest || date > latest ? date : latest;
  }, undefined);
  const quizzes = quizzesToPrerender();
  const newestQuiz = quizzes[quizzes.length - 1];
  const giving = getGivingGuide();
  const givingLatest = giving.picks.reduce<string | undefined>((latest, pick) => {
    if (!latest || pick.date > latest) return pick.date;
    return latest;
  }, undefined);
  const veterans = getVeteransDayHub();
  const responders = getFirstRespondersDayHub();
  const neighborMonths = ballotMonths();
  const neighborCurrent = editionMonth();
  const neighborLatest = getBallot(neighborCurrent)?.nominees[0]?.date ?? siteLatest;
  const spanishEditions = loadSpanishEditions();
  const newestSpanish = spanishEditions[spanishEditions.length - 1];

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: siteLatest,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    {
      url: absoluteUrl(GIVING_TUESDAY_PATH),
      lastModified: givingLatest ?? siteLatest,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: absoluteUrl(VETERANS_DAY_PATH),
      lastModified: veterans.latest ?? siteLatest,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: absoluteUrl(FIRST_RESPONDERS_DAY_PATH),
      lastModified: responders.latest ?? siteLatest,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: absoluteUrl("/world"),
      ...(worldLatest ? { lastModified: worldLatest } : {}),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: absoluteUrl("/good-neighbor"),
      lastModified: neighborLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    {
      url: absoluteUrl("/good-neighbor/winners"),
      lastModified: neighborLatest,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    ...neighborMonths
      .filter((month) => month !== neighborCurrent)
      .map((month) => ({
        url: absoluteUrl(`/good-neighbor/${month}`),
        lastModified: getBallot(month)?.nominees[0]?.date ?? neighborLatest,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    {
      url: absoluteUrl("/week"),
      lastModified: newestWeek?.latest ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    {
      url: absoluteUrl(THANKS_PATH),
      lastModified: thanksLatest ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...weeks
      .slice()
      .reverse()
      .map((week) => ({
        url: absoluteUrl(week.path),
        lastModified: week.latest,
        changeFrequency: (week.inProgress ? "daily" : "weekly") as "daily" | "weekly",
        priority: week.inProgress ? 0.7 : 0.6,
      })),
    {
      url: absoluteUrl("/good-news-index"),
      lastModified: newestIndex?.latest ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...indexes
      .slice()
      .reverse()
      .map((edition) => ({
        url: absoluteUrl(edition.path),
        lastModified: edition.latest,
        changeFrequency: (edition.inProgress ? "daily" : "monthly") as "daily" | "monthly",
        priority: edition.inProgress ? 0.7 : 0.6,
      })),
    {
      url: absoluteUrl("/es"),
      lastModified: newestSpanish?.latest ?? siteLatest,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: absoluteUrl("/es/buenas-noticias"),
      lastModified: newestSpanish?.latest ?? siteLatest,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...spanishEditions
      .slice()
      .reverse()
      .map((edition) => ({
        url: absoluteUrl(edition.path),
        lastModified: edition.latest,
        changeFrequency: (edition.inProgress ? "daily" : "weekly") as "daily" | "weekly",
        priority: edition.inProgress ? 0.7 : 0.6,
      })),
    {
      url: absoluteUrl(CLASSROOM_INDEX_PATH),
      lastModified: newestPack?.latest ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.6,
    },
    ...packs
      .slice()
      .reverse()
      .map((pack) => ({
        url: absoluteUrl(pack.path),
        lastModified: pack.latest,
        changeFrequency: (pack.inProgress ? "daily" : "weekly") as "daily" | "weekly",
        priority: pack.inProgress ? 0.6 : 0.5,
      })),
    {
      url: absoluteUrl("/quiz"),
      lastModified: newestQuiz?.latest ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...quizzes
      .slice()
      .reverse()
      .map((quiz) => ({
        url: absoluteUrl(quiz.path),
        lastModified: quiz.latest,
        changeFrequency: (quiz.inProgress ? "daily" : "weekly") as "daily" | "weekly",
        priority: quiz.inProgress ? 0.7 : 0.6,
      })),
    ...getKindnessChallenges()
      .slice()
      .reverse()
      .map((challenge) => ({
        url: absoluteUrl(challenge.path),
        lastModified: challenge.story.date > challenge.week ? challenge.story.date : challenge.week,
        changeFrequency: "weekly" as const,
        priority: challenge.status === "this-week" ? 0.7 : 0.6,
      })),
    ...CATEGORIES.map((category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: latestCategory.get(category.slug) ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...STATES.map((state) => ({
      url: absoluteUrl(`/state/${state.slug}`),
      lastModified: latestState.get(state.code) ?? siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...hubs.countries.filter((country) => country.indexable).map((country) => ({
      url: absoluteUrl(`/country/${country.slug}`),
      lastModified: country.latest,
      changeFrequency: "daily" as const,
      priority: country.code === "US" ? 0.7 : 0.6,
    })),
    ...kidPlaces().map((place) => ({
      url: absoluteUrl(place.path),
      lastModified: place.latest,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...indexableAnnouncementDays(loadAnnouncementDays()).map((day) => ({
      url: absoluteUrl(day.path),
      lastModified: day.date,
      changeFrequency: (day.date === mountainDay() ? "daily" : "weekly") as "daily" | "weekly",
      priority: day.date === mountainDay() ? 0.6 : 0.5,
    })),
    ...indexableHubs(hubs).map((hub) => ({
      url: absoluteUrl(hub.path),
      lastModified: hub.latest,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...getOutlets().flatMap((outlet) => {
      if (!outlet.pagePath) return [];
      return [
        {
          url: absoluteUrl(outlet.pagePath),
          lastModified: outlet.latest,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        },
      ];
    }),
    ...stories.map((story) => ({
      url: absoluteUrl(`/story/${story.slug}`),
      lastModified: story.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [absoluteUrl(story.image)],
    })),
    {
      url: absoluteUrl("/web-stories"),
      lastModified: siteLatest,
      changeFrequency: "daily" as const,
      priority: 0.6,
    },
    ...listWebStories(stories).map((edition, index) => ({
      url: absoluteUrl(edition.path),
      lastModified: edition.modified,
      changeFrequency: (index === 0 ? "daily" : "weekly") as "daily" | "weekly",
      priority: index === 0 ? 0.6 : 0.5,
      images: [absoluteUrl(edition.posterPath)],
    })),
    ...explainerSitemapEntries(),
    {
      url: absoluteUrl(ON_THIS_DAY_INDEX_PATH),
      lastModified: siteLatest && siteLatest > onThisDayUpdated() ? siteLatest : onThisDayUpdated(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...allOnThisDayPaths().map((path) => {
      const day = parseMonthDaySlug(path.slice("/on-this-day/".length));
      const seeded = day ? Boolean(getOnThisDay(day.month, day.day)) : false;
      return {
        url: absoluteUrl(path),
        lastModified: day ? onThisDayLastModified(day.month, day.day) : onThisDayUpdated(),
        changeFrequency: "weekly" as const,
        priority: seeded ? 0.6 : 0.4,
      };
    }),
  ];
}

function explainerSitemapEntries(): MetadataRoute.Sitemap {
  const explainers = getPublishedExplainers();
  const latest = explainers.reduce<string | undefined>((newest, explainer) => {
    const modified = explainerModifiedDate(explainer);
    return !newest || modified > newest ? modified : newest;
  }, undefined);
  return [
    {
      url: absoluteUrl(EXPLAINER_INDEX_PATH),
      ...(latest ? { lastModified: latest } : {}),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...explainers.map((explainer) => ({
      url: absoluteUrl(explainerPath(explainer.slug)),
      lastModified: explainerModifiedDate(explainer),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
