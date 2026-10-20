/**
 * Classroom stories. The printable story of the day rotates by calendar date,
 * in the same zone as the edition line. The morning job sets kidFriendly.
 */
import { getCountry } from "./countries";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode } from "./states";
import { editionDay } from "./world-pick";

export type KidCandidate = {
  slug: string;
  date: string;
  draft?: boolean;
  kidFriendly?: boolean;
};

export type KidPlace = {
  kind: "state" | "country";
  code: string;
  slug: string;
  name: string;
  path: string;
  count: number;
  latest: string;
};

function dayNumber(day: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return 0;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000);
}

function bySlug<T extends KidCandidate>(a: T, b: T): number {
  return a.slug.localeCompare(b.slug);
}

export function storyOfTheDay<T extends KidCandidate>(stories: T[], day = editionDay()): T | undefined {
  const kids = stories.filter((story) => story.kidFriendly && !story.draft);
  if (!kids.length) return undefined;
  const dated = kids.filter((story) => story.date === day).sort(bySlug);
  if (dated.length === 1) return dated[0];
  const end = dayNumber(day);
  const start = end - 21;
  const recent = kids.filter((story) => {
    const published = dayNumber(story.date);
    return published >= start && published <= end;
  });
  const source = dated.length
    ? dated
    : recent.length
      ? recent
      : kids
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : bySlug(a, b)))
          .slice(0, 8);
  const pool = source.slice().sort(bySlug);
  if (!pool.length) return undefined;
  return pool[dayNumber(day) % pool.length];
}

export function getKidStories(stories = getPublishedStories()): Story[] {
  return stories.filter((story) => story.kidFriendly && story.kidSummary && story.kidQuestions && story.kidQuestions.length >= 2);
}

export function kidStoriesInState(code: string, stories = getKidStories()): Story[] {
  return stories.filter((story) => story.country === "US" && (story.state === code || story.alsoStates.includes(code)));
}

export function kidStoriesInCountry(code: string, stories = getKidStories()): Story[] {
  if (code === "US") return [];
  return stories.filter((story) => story.country === code);
}

export function kidPlaces(stories = getKidStories()): KidPlace[] {
  const states = new Map<string, { count: number; latest: string }>();
  const countries = new Map<string, { count: number; latest: string }>();

  function bump(map: Map<string, { count: number; latest: string }>, key: string, date: string) {
    const current = map.get(key);
    if (!current) {
      map.set(key, { count: 1, latest: date });
      return;
    }
    current.count += 1;
    if (date > current.latest) current.latest = date;
  }

  for (const story of stories) {
    if (story.country === "US") {
      if (story.state) bump(states, story.state, story.date);
      for (const extra of story.alsoStates) {
        if (extra !== story.state) bump(states, extra, story.date);
      }
    } else {
      bump(countries, story.country, story.date);
    }
  }

  const places: KidPlace[] = [];
  for (const [code, bucket] of states) {
    const state = getStateByCode(code);
    if (!state || bucket.count < 1) continue;
    places.push({
      kind: "state",
      code,
      slug: state.slug,
      name: state.name,
      path: `/kids/state/${state.slug}`,
      count: bucket.count,
      latest: bucket.latest,
    });
  }
  for (const [code, bucket] of countries) {
    const country = getCountry(code);
    if (!country || bucket.count < 1) continue;
    places.push({
      kind: "country",
      code,
      slug: country.slug,
      name: country.name,
      path: `/kids/country/${country.slug}`,
      count: bucket.count,
      latest: bucket.latest,
    });
  }
  return places.sort((a, b) => a.name.localeCompare(b.name));
}

export function kidPlaceForStory(story: Pick<Story, "country" | "state">): string | undefined {
  if (story.country === "US") {
    const state = getStateByCode(story.state);
    return state ? `/kids/state/${state.slug}` : undefined;
  }
  const country = getCountry(story.country);
  return country ? `/kids/country/${country.slug}` : undefined;
}
