import { getCategory } from "./categories";
import { getCountry } from "./countries";
import { MAX_PRERENDERED_PAGES, pageCount } from "./paging";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode, type StateInfo } from "./states";
import { getTag } from "./tags";

/** A hub is published only when it has enough stories to be a real page. */
export const MIN_HUB_STORIES = 3;

/**
 * Every qualifying hub is prebuilt through this cap.
 * Past it, validate-stories fails the build instead of rendering the rest
 * on request. A 10k archive of real places stays well under this.
 */
export const MAX_PRERENDERED_HUBS = 8_000;

export type HubKind = "state-category" | "city" | "topic";

export type HubStory = {
  slug: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  alsoStates: string[];
  category: string;
  tags: string[];
};

export type HubCrumb = { name: string; path: string };

export type Hub = {
  kind: HubKind;
  path: string;
  params: Record<string, string>;
  title: string;
  heading: string;
  description: string;
  kicker: string;
  linkLabel: string;
  count: number;
  latest: string;
  storySlugs: string[];
  crumbs: HubCrumb[];
  stateSlug?: string;
  countrySlug?: string;
  categorySlug?: string;
};

export type CountryStat = {
  code: string;
  slug: string;
  count: number;
  latest?: string;
  indexable: boolean;
};

export type HubIndex = {
  stateCategories: Hub[];
  cities: Hub[];
  topics: Hub[];
  countries: CountryStat[];
  byPath: Map<string, Hub>;
  byStateSlug: Map<string, { categories: Hub[]; cities: Hub[] }>;
  byCountrySlug: Map<string, Hub[]>;
  countryByCode: Map<string, CountryStat>;
};

type Bucket = {
  kind: HubKind;
  path: string;
  params: Record<string, string>;
  latest: string;
  slugs: Set<string>;
  cities: string[];
  stateSlug?: string;
  countrySlug?: string;
  categorySlug?: string;
  stateName?: string;
  countryName?: string;
  cityName?: string;
  categoryLabel?: string;
  categoryDescription?: string;
  topicSlug?: string;
};

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function topicLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function storyWord(count: number): string {
  return count === 1 ? "story" : "stories";
}

function rememberCity(bucket: Bucket, city: string) {
  if (bucket.cities.length >= 3 || bucket.cities.includes(city)) return;
  bucket.cities.push(city);
}

function touch(bucket: Bucket, story: HubStory) {
  bucket.slugs.add(story.slug);
  if (story.date > bucket.latest) bucket.latest = story.date;
  rememberCity(bucket, story.city);
}

function stateCategoryBucket(state: StateInfo, categorySlug: string): Bucket | undefined {
  const category = getCategory(categorySlug);
  if (!category) return undefined;
  return {
    kind: "state-category",
    path: `/state/${state.slug}/${category.slug}`,
    params: { slug: state.slug, category: category.slug },
    latest: "",
    slugs: new Set(),
    cities: [],
    stateSlug: state.slug,
    categorySlug: category.slug,
    stateName: state.name,
    categoryLabel: category.label,
    categoryDescription: category.description,
  };
}

function cityBucket(options: {
  path: string;
  params: Record<string, string>;
  cityName: string;
  stateSlug?: string;
  countrySlug?: string;
  stateName?: string;
  countryName?: string;
}): Bucket {
  return {
    kind: "city",
    path: options.path,
    params: options.params,
    latest: "",
    slugs: new Set(),
    cities: [],
    stateSlug: options.stateSlug,
    countrySlug: options.countrySlug,
    cityName: options.cityName,
    stateName: options.stateName,
    countryName: options.countryName,
  };
}

function finish(bucket: Bucket): Hub | undefined {
  const count = bucket.slugs.size;
  if (count < MIN_HUB_STORIES || !bucket.latest) return undefined;
  const places = listPhrase(bucket.cities);
  if (bucket.kind === "state-category" && bucket.stateName && bucket.categoryLabel && bucket.categoryDescription) {
    const where = places ? `, including ${places}` : "";
    return {
      kind: bucket.kind,
      path: bucket.path,
      params: bucket.params,
      title: `${bucket.categoryLabel} good news in ${bucket.stateName}`,
      heading: `${bucket.categoryLabel} good news in ${bucket.stateName}.`,
      description: `${bucket.categoryDescription} ${count} verified ${storyWord(count)} from ${bucket.stateName}${where}. Each one is checked and linked to the original report.`,
      kicker: bucket.categoryLabel,
      linkLabel: `${bucket.categoryLabel} in ${bucket.stateName}`,
      count,
      latest: bucket.latest,
      storySlugs: [...bucket.slugs],
      crumbs: [
        { name: "Today", path: "/" },
        { name: "Local", path: "/local" },
        { name: bucket.stateName, path: `/state/${bucket.stateSlug}` },
        { name: bucket.categoryLabel, path: bucket.path },
      ],
      stateSlug: bucket.stateSlug,
      categorySlug: bucket.categorySlug,
    };
  }
  if (bucket.kind === "city" && bucket.cityName) {
    const region = bucket.stateName ?? bucket.countryName ?? "";
    const place = region ? `${bucket.cityName}, ${region}` : bucket.cityName;
    const parent = bucket.stateSlug
      ? { name: bucket.stateName ?? "Local", path: `/state/${bucket.stateSlug}` }
      : { name: bucket.countryName ?? "World", path: bucket.countrySlug ? `/country/${bucket.countrySlug}` : "/world" };
    const root = bucket.stateSlug
      ? { name: "Local", path: "/local" }
      : { name: "World", path: "/world" };
    return {
      kind: bucket.kind,
      path: bucket.path,
      params: bucket.params,
      title: `Good news ${place}`,
      heading: `Good news from ${place}.`,
      description: `Good news from ${place}: ${count} verified ${storyWord(count)}, each one checked and linked to the original report.`,
      kicker: region || "City",
      linkLabel: place,
      count,
      latest: bucket.latest,
      storySlugs: [...bucket.slugs],
      crumbs: [
        { name: "Today", path: "/" },
        root,
        parent,
        { name: bucket.cityName, path: bucket.path },
      ],
      stateSlug: bucket.stateSlug,
      countrySlug: bucket.countrySlug,
    };
  }
  if (bucket.kind === "topic" && bucket.topicSlug) {
    const tag = getTag(bucket.topicSlug);
    const label = tag?.label ?? topicLabel(bucket.topicSlug);
    const title = tag?.title ?? `Good news about ${label.toLowerCase()}`;
    const intro = tag?.intro ?? `Verified stories about ${label.toLowerCase()}.`;
    const where = places ? ` Stories come from ${places}.` : "";
    return {
      kind: bucket.kind,
      path: bucket.path,
      params: bucket.params,
      title,
      heading: `${title}.`,
      description: `${intro} ${count} verified ${storyWord(count)}.${where} Each one is checked and linked to the original report.`,
      kicker: "Topic",
      linkLabel: label,
      count,
      latest: bucket.latest,
      storySlugs: [...bucket.slugs],
      crumbs: [
        { name: "Today", path: "/" },
        { name: "Topics", path: "/topics" },
        { name: label, path: bucket.path },
      ],
    };
  }
  return undefined;
}

export function buildHubs(stories: HubStory[]): HubIndex {
  const stateCategories = new Map<string, Bucket>();
  const cities = new Map<string, Bucket>();
  const topics = new Map<string, Bucket>();
  const countryCounts = new Map<string, { count: number; latest: string }>();

  for (const story of stories) {
    const countryStat = countryCounts.get(story.country);
    if (!countryStat) countryCounts.set(story.country, { count: 1, latest: story.date });
    else {
      countryStat.count += 1;
      if (story.date > countryStat.latest) countryStat.latest = story.date;
    }

    const country = getCountry(story.country);
    if (story.country === "US") {
      const states = [story.state, ...story.alsoStates].filter((code): code is string => Boolean(code));
      const seen = new Set<string>();
      for (const code of states) {
        if (seen.has(code)) continue;
        seen.add(code);
        const state = getStateByCode(code);
        if (!state) continue;
        const key = `${state.code}:${story.category}`;
        let bucket = stateCategories.get(key);
        if (!bucket) {
          const created = stateCategoryBucket(state, story.category);
          if (!created) continue;
          bucket = created;
          stateCategories.set(key, bucket);
        }
        touch(bucket, story);
      }
      const state = getStateByCode(story.state);
      const citySlug = slugify(story.city);
      if (state && citySlug) {
        const key = `${state.code}:${citySlug}`;
        let bucket = cities.get(key);
        if (!bucket) {
          bucket = cityBucket({
            path: `/state/${state.slug}/city/${citySlug}`,
            params: { slug: state.slug, city: citySlug },
            cityName: story.city,
            stateSlug: state.slug,
            stateName: state.name,
          });
          cities.set(key, bucket);
        }
        touch(bucket, story);
      }
    } else if (country) {
      const citySlug = slugify(story.city);
      if (citySlug) {
        const key = `${country.code}:${citySlug}`;
        let bucket = cities.get(key);
        if (!bucket) {
          bucket = cityBucket({
            path: `/country/${country.slug}/city/${citySlug}`,
            params: { slug: country.slug, city: citySlug },
            cityName: story.city,
            countrySlug: country.slug,
            countryName: country.name,
          });
          cities.set(key, bucket);
        }
        touch(bucket, story);
      }
    }

    for (const tag of story.tags) {
      let bucket = topics.get(tag);
      if (!bucket) {
        bucket = {
          kind: "topic",
          path: `/topic/${tag}`,
          params: { slug: tag },
          latest: "",
          slugs: new Set(),
          cities: [],
          topicSlug: tag,
        };
        topics.set(tag, bucket);
      }
      touch(bucket, story);
    }
  }

  const stateCategoryHubs = [...stateCategories.values()].map(finish).filter((hub): hub is Hub => Boolean(hub));
  const cityHubs = [...cities.values()].map(finish).filter((hub): hub is Hub => Boolean(hub));
  const topicHubs = [...topics.values()].map(finish).filter((hub): hub is Hub => Boolean(hub));
  const hubs = [...stateCategoryHubs, ...cityHubs, ...topicHubs];
  const byPath = new Map(hubs.map((hub) => [hub.path, hub]));
  const byStateSlug = new Map<string, { categories: Hub[]; cities: Hub[] }>();
  const byCountrySlug = new Map<string, Hub[]>();

  for (const hub of stateCategoryHubs) {
    if (!hub.stateSlug) continue;
    const group = byStateSlug.get(hub.stateSlug) ?? { categories: [], cities: [] };
    group.categories.push(hub);
    byStateSlug.set(hub.stateSlug, group);
  }
  for (const hub of cityHubs) {
    if (hub.stateSlug) {
      const group = byStateSlug.get(hub.stateSlug) ?? { categories: [], cities: [] };
      group.cities.push(hub);
      byStateSlug.set(hub.stateSlug, group);
    }
    if (hub.countrySlug) {
      const list = byCountrySlug.get(hub.countrySlug) ?? [];
      list.push(hub);
      byCountrySlug.set(hub.countrySlug, list);
    }
  }

  const countries: CountryStat[] = [...countryCounts.entries()].flatMap(([code, stat]) => {
    const country = getCountry(code);
    if (!country) return [];
    return [{
      code,
      slug: country.slug,
      count: stat.count,
      latest: stat.latest,
      indexable: stat.count >= MIN_HUB_STORIES,
    }];
  });

  return {
    stateCategories: stateCategoryHubs,
    cities: cityHubs,
    topics: topicHubs,
    countries,
    byPath,
    byStateSlug,
    byCountrySlug,
    countryByCode: new Map(countries.map((country) => [country.code, country])),
  };
}

let cache: HubIndex | null = null;

export function getHubIndex(): HubIndex {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const index = buildHubs(getPublishedStories());
  cache = index;
  return index;
}

export function getHubByPath(path: string): Hub | undefined {
  return getHubIndex().byPath.get(path);
}

export function hubsToPrerender(hubs: Hub[]): Hub[] {
  if (hubs.length <= MAX_PRERENDERED_HUBS) return hubs;
  return hubs
    .slice()
    .sort((a, b) => (a.latest < b.latest ? 1 : a.latest > b.latest ? -1 : a.path.localeCompare(b.path)))
    .slice(0, MAX_PRERENDERED_HUBS);
}

/** Page 2 and later for each prerendered hub. Page 1 is the hub path itself. */
export function hubPageParams(hubs: Hub[]): { hub: Hub; page: string }[] {
  const params: { hub: Hub; page: string }[] = [];
  for (const hub of hubsToPrerender(hubs)) {
    const last = Math.min(MAX_PRERENDERED_PAGES, pageCount(hub.count));
    for (let page = 2; page <= last; page += 1) {
      params.push({ hub, page: String(page) });
    }
  }
  return params;
}

export function storiesForHub(hub: Hub, stories: Story[] = getPublishedStories()): Story[] {
  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  return hub.storySlugs.flatMap((slug) => {
    const story = bySlug.get(slug);
    return story ? [story] : [];
  });
}

export function hubPathsForStory(story: Pick<Story, "slug" | "city" | "country" | "state" | "alsoStates" | "category" | "tags">): string[] {
  const index = getHubIndex();
  const paths: string[] = [];
  if (story.country === "US") {
    const codes = [story.state, ...story.alsoStates].filter((code): code is string => Boolean(code));
    const seen = new Set<string>();
    for (const code of codes) {
      if (seen.has(code)) continue;
      seen.add(code);
      const state = getStateByCode(code);
      if (!state) continue;
      const category = index.byPath.get(`/state/${state.slug}/${story.category}`);
      if (category) paths.push(category.path);
    }
    const state = getStateByCode(story.state);
    const citySlug = slugify(story.city);
    if (state && citySlug) {
      const city = index.byPath.get(`/state/${state.slug}/city/${citySlug}`);
      if (city) paths.push(city.path);
    }
  } else {
    const country = getCountry(story.country);
    const citySlug = slugify(story.city);
    if (country && citySlug) {
      const city = index.byPath.get(`/country/${country.slug}/city/${citySlug}`);
      if (city) paths.push(city.path);
    }
  }
  for (const tag of story.tags) {
    const topic = index.byPath.get(`/topic/${tag}`);
    if (topic) paths.push(topic.path);
  }
  return paths;
}

export function countryIsIndexable(code: string): boolean {
  return getHubIndex().countryByCode.get(code)?.indexable ?? false;
}
