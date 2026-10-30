import { US_MAP_SVG } from "../components/us-map-svg";
import { canonicalCityName, cityKey, citySlug } from "./cities";
import { getCategory } from "./categories";
import { geocodeUsPlace, type PlacePrecision } from "./geocode";
import { formatStoryDate } from "./format";
import { cityHubForStory, getHubIndex } from "./hubs";
import { bandFor } from "./map-bands";
import { GOOD_NEWS_MAP_PATH, MAP_WINDOW_DAYS } from "./map-path";
import { moveInsideState, projectToState } from "./us-map-geometry";
import { getStateByCode, STATES } from "./states";
import { compareStories, getPublishedStories, type Story } from "./stories";
import { addDays, mountainDay } from "./weeks";

export { GOOD_NEWS_MAP_PATH, MAP_WINDOW_DAYS };

export type NewsMapStory = {
  slug: string;
  title: string;
  dateLabel: string;
  category: string;
  categoryLabel: string;
  kidFriendly: boolean;
};

export type NewsMapPlace = {
  id: string;
  city: string;
  href?: string;
  precision: PlacePrecision;
  stories: NewsMapStory[];
};

export type NewsMapState = {
  code: string;
  name: string;
  slug: string;
  href: string;
  count: number;
  places: NewsMapPlace[];
};

export type NewsMapPin = {
  stateCode: string;
  x: number;
  y: number;
  label: string;
  count: number;
  href: string;
  placeIds: string[];
};

export type NewsMap = {
  today: string;
  start: string;
  storyCount: number;
  stateCount: number;
  states: NewsMapState[];
  pins: NewsMapPin[];
  svg: string;
};

type DraftPlace = NewsMapPlace & {
  stateCode: string;
  stateSlug: string;
  x: number;
  y: number;
};

export function inMapWindow(date: string, today: string): boolean {
  return date <= today && date >= addDays(today, -(MAP_WINDOW_DAYS - 1));
}

export function newsMapDescription(board: NewsMap): string {
  if (!board.storyCount) {
    return "A map of recent good news in the United States. No story was published in the last 30 days. Every state still links to its page.";
  }
  const stories = board.storyCount === 1 ? "story" : "stories";
  const where = board.stateCount === 1 ? "1 state" : `${board.stateCount} states`;
  return `${board.storyCount} verified ${stories} from the last 30 days, placed by city across ${where}. Open any story, or the city and state pages. A text list follows the map.`;
}

let cached: { signature: string; board: NewsMap } | null = null;

function signature(stories: Story[], today: string): string {
  let hash = stories.length;
  for (const story of stories) hash = (hash * 33 + story.date.charCodeAt(8) + story.slug.length) >>> 0;
  return `${today}:${stories.length}:${stories[0]?.slug ?? ""}:${stories.at(-1)?.slug ?? ""}:${hash}`;
}

export function goodNewsMap(stories = getPublishedStories(), today = mountainDay()): NewsMap {
  const key = signature(stories, today);
  if (cached?.signature === key) return cached.board;
  const board = buildNewsMap(stories, today);
  cached = { signature: key, board };
  return board;
}

function buildNewsMap(stories: Story[], today: string): NewsMap {
  const start = addDays(today, -(MAP_WINDOW_DAYS - 1));
  const recent = stories.filter((story) => story.country === "US" && story.state && inMapWindow(story.date, today));
  const hubs = getHubIndex();
  const grouped = new Map<string, Story[]>();
  for (const story of recent) {
    const key = `${story.state}|${cityKey(story.city)}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(story);
    grouped.set(key, bucket);
  }

  const drafts: DraftPlace[] = [];
  const fallbacks = new Map<string, number>();
  for (const bucket of grouped.values()) {
    const ordered = [...bucket].sort(compareStories);
    const sample = ordered[0];
    const code = sample.state ?? "";
    const state = getStateByCode(code);
    if (!state) continue;
    const names = new Map<string, number>();
    for (const story of ordered) names.set(story.city, (names.get(story.city) ?? 0) + 1);
    const city = canonicalCityName(names) || sample.city;
    const given = ordered.find((story) => story.latitude !== undefined && story.longitude !== undefined);
    const hit = geocodeUsPlace(code, city, given ? { latitude: given.latitude, longitude: given.longitude } : undefined);
    const projected = projectToState(code, hit.lat, hit.lng);
    let x = projected.x;
    let y = projected.y;
    if (hit.precision === "state") {
      const index = fallbacks.get(code) ?? 0;
      fallbacks.set(code, index + 1);
      if (index > 0) {
        const angle = index * 2.399963229728653;
        const radius = 9 + index * 3.5;
        const moved = moveInsideState(code, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        x = moved.x;
        y = moved.y;
      }
    }
    const hub = cityHubForStory({ city, country: "US", state: code }, hubs);
    drafts.push({
      id: `newsmap-${state.slug}-${citySlug(city)}`,
      city,
      href: hub?.path,
      precision: hit.precision,
      stateCode: code,
      stateSlug: state.slug,
      x,
      y,
      stories: ordered.map((story) => {
        const category = getCategory(story.category);
        return {
          slug: story.slug,
          title: story.title,
          dateLabel: formatStoryDate(story.date),
          category: story.category,
          categoryLabel: category?.label ?? story.category,
          kidFriendly: story.kidFriendly,
        };
      }),
    });
  }

  separatePlaces(drafts);
  const pins = clusterPins(drafts);
  const byState = new Map<string, DraftPlace[]>();
  for (const place of drafts) {
    const bucket = byState.get(place.stateCode) ?? [];
    bucket.push(place);
    byState.set(place.stateCode, bucket);
  }

  const states: NewsMapState[] = STATES.map((state) => {
    const places = (byState.get(state.code) ?? []).sort((a, b) => a.city.localeCompare(b.city));
    const count = places.reduce((sum, place) => sum + place.stories.length, 0);
    return {
      code: state.code,
      name: state.name,
      slug: state.slug,
      href: `/state/${state.slug}`,
      count,
      places: places.map((place) => ({
        id: place.id,
        city: place.city,
        href: place.href,
        precision: place.precision,
        stories: place.stories,
      })),
    };
  });
  const counts = new Map(states.map((state) => [state.code, state.count]));
  const storyCount = states.reduce((sum, state) => sum + state.count, 0);
  const stateCount = states.filter((state) => state.count > 0).length;

  return {
    today,
    start,
    storyCount,
    stateCount,
    states,
    pins,
    svg: renderNewsMap(pins, counts),
  };
}

function separatePlaces(places: DraftPlace[]) {
  const min = 11;
  for (let pass = 0; pass < 5; pass += 1) {
    for (let i = 0; i < places.length; i += 1) {
      for (let j = i + 1; j < places.length; j += 1) {
        if (places[i].stateCode !== places[j].stateCode) continue;
        const dx = places[j].x - places[i].x;
        const dy = places[j].y - places[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= min) continue;
        const push = (min - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        places[i].x -= ux * push;
        places[i].y -= uy * push;
        places[j].x += ux * push;
        places[j].y += uy * push;
      }
    }
  }
  for (const place of places) {
    const moved = moveInsideState(place.stateCode, place.x, place.y);
    place.x = moved.x;
    place.y = moved.y;
  }
}

function clusterPins(places: DraftPlace[]): NewsMapPin[] {
  const drafts: {
    stateCode: string;
    stateSlug: string;
    x: number;
    y: number;
    cities: string[];
    placeIds: string[];
    count: number;
  }[] = [];
  for (const place of places) {
    const hit = drafts.find((pin) => pin.stateCode === place.stateCode && Math.hypot(pin.x - place.x, pin.y - place.y) < 8);
    if (!hit) {
      drafts.push({
        stateCode: place.stateCode,
        stateSlug: place.stateSlug,
        x: place.x,
        y: place.y,
        cities: [place.city],
        placeIds: [place.id],
        count: place.stories.length,
      });
      continue;
    }
    hit.cities.push(place.city);
    hit.placeIds.push(place.id);
    hit.count += place.stories.length;
  }
  return drafts.map((pin) => {
    const state = getStateByCode(pin.stateCode);
    return {
      stateCode: pin.stateCode,
      x: pin.x,
      y: pin.y,
      label: pinLabel(pin.cities, state?.name ?? pin.stateCode),
      count: pin.count,
      href: pin.placeIds.length === 1 ? `#${pin.placeIds[0]}` : `#newsmap-state-${pin.stateSlug}`,
      placeIds: pin.placeIds,
    };
  });
}

function pinLabel(cities: string[], stateName: string): string {
  const unique = [...new Set(cities)];
  const shown = unique.length > 3 ? [...unique.slice(0, 2), `${unique.length - 2} more places`] : unique;
  const list =
    shown.length <= 1
      ? (shown[0] ?? stateName)
      : shown.length === 2
        ? `${shown[0]} and ${shown[1]}`
        : `${shown.slice(0, -1).join(", ")}, and ${shown[shown.length - 1]}`;
  return `${list}, ${stateName}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderNewsMap(pins: NewsMapPin[], counts: Map<string, number>): string {
  const max = [...counts.values()].reduce((peak, count) => Math.max(peak, count), 0);
  let svg = US_MAP_SVG;
  svg = svg.replace(
    '<svg id="usmap"',
    '<svg id="newsmap" aria-labelledby="newsmap-title"',
  );
  svg = svg.replace(
    '<g class="state">',
    '<title id="newsmap-title">United States. States link to state pages. Dots link to the stories for that place.</title><g class="state">',
  );
  for (const state of STATES) {
    const code = state.code.toLowerCase();
    const count = counts.get(state.code) ?? 0;
    const band = bandFor(count, max);
    const noun = count === 1 ? "1 story" : `${count} stories`;
    const label = escapeXml(count ? `${state.name}, ${noun} in the last 30 days` : `${state.name}, no story in the last 30 days`);
    svg = svg.replaceAll(`aria-label="${state.name}"`, `aria-label="${label}"`);
    svg = svg.replaceAll(`<title>${state.name}</title>`, `<title>${label}</title>`);
    svg = svg.replaceAll(`class="${code}" data-code="${code}"`, `class="${code} band-${band}" data-code="${code}"`);
    if (code === "dc") {
      svg = svg.replaceAll(
        `class="state borders dccircle dc" data-code="dc"`,
        `class="state borders dccircle dc band-${band}" data-code="dc"`,
      );
    }
  }
  const dots = pins
    .map((pin) => {
      const label = escapeXml(pin.label);
      const noun = pin.count === 1 ? "story" : "stories";
      const places = pin.placeIds.map(escapeXml).join(" ");
      const number = pin.count > 1 ? `<text class="pin-count" x="${pin.x}" y="${pin.y - 11}" text-anchor="middle">${pin.count}</text>` : "";
      return `<a class="map-pin" data-pin="${places}" data-state="${pin.stateCode}" data-label="${label}" href="${escapeXml(pin.href)}" aria-label="${label}, ${pin.count} ${noun}"><title>${label}, ${pin.count} ${noun}</title><circle class="pin-hit" cx="${pin.x}" cy="${pin.y}" r="16" /><circle class="pin-halo" cx="${pin.x}" cy="${pin.y}" r="6.5" /><circle class="pin-core" cx="${pin.x}" cy="${pin.y}" r="3.6" />${number}</a>`;
    })
    .join("");
  return svg.replace('<g id="pins"></g>', `<g id="pins">${dots}</g>`);
}
