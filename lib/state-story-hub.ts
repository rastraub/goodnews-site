/**
 * One story per state for a seasonal hub.
 * A hub passes its own qualify rule, quality tie-break, and editor pin map.
 * Veterans Day is the first caller. First Responders Day uses it too.
 * A later hub should use this instead of copying it.
 */
import { getStateByCode, STATES, type StateInfo } from "./states";

export type StateHubStory = {
  slug: string;
  date: string;
  title: string;
  dek: string;
  country: string;
  state?: string;
  alsoStates: string[];
  tags: string[];
  featured?: boolean;
  top5?: number;
  draft?: boolean;
};

export type StateHubSlot<T> = {
  state: StateInfo;
  story?: T;
  pinned: boolean;
};

export type StateHubPick<T> = {
  slots: StateHubSlot<T>[];
  pinErrors: string[];
};

/**
 * Home state first, then newest date, then featured, then a better Top 5 rank,
 * then the hub's quality score, then slug so the order stays stable.
 */
export function compareStateStories<T extends StateHubStory>(
  code: string,
  quality: (story: T) => number,
  a: T,
  b: T,
): number {
  const home = Number(b.state === code) - Number(a.state === code);
  if (home) return home;
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featured) return featured;
  const top = (a.top5 ?? 99) - (b.top5 ?? 99);
  if (top) return top;
  const score = quality(b) - quality(a);
  if (score) return score;
  return a.slug.localeCompare(b.slug);
}

function covers(story: Pick<StateHubStory, "state" | "alsoStates">, code: string): boolean {
  return story.state === code || story.alsoStates.includes(code);
}

export function pickStateStories<T extends StateHubStory>(options: {
  stories: T[];
  pins?: Record<string, string>;
  qualifies: (story: T) => boolean;
  quality?: (story: T) => number;
  /**
   * Defaults to home state, then newest date, then featured, then Top 5, then quality.
   * A hub that should prefer the strongest story over the newest one can pass its own compare.
   */
  compare?: (code: string, a: T, b: T) => number;
  states?: StateInfo[];
}): StateHubPick<T> {
  const states = options.states ?? STATES;
  const pins = options.pins ?? {};
  const quality = options.quality ?? (() => 0);
  const compare = options.compare ?? ((code: string, a: T, b: T) => compareStateStories(code, quality, a, b));
  const known = new Set(states.map((state) => state.code));
  const bySlug = new Map(options.stories.map((story) => [story.slug, story]));
  const pinErrors: string[] = [];
  const chosen = new Map<string, { story: T; pinned: boolean }>();

  for (const [code, slug] of Object.entries(pins)) {
    if (!known.has(code) || !getStateByCode(code)) {
      pinErrors.push(`${code}: unknown state code.`);
      continue;
    }
    const story = bySlug.get(slug);
    if (!story || story.draft) {
      pinErrors.push(`${code}: pinned slug ${slug} is not a published story.`);
      continue;
    }
    if (!options.qualifies(story)) {
      pinErrors.push(`${code}: pinned slug ${slug} does not qualify for this hub.`);
      continue;
    }
    if (!covers(story, code)) {
      pinErrors.push(`${code}: pinned slug ${slug} is not filed in that state.`);
      continue;
    }
    chosen.set(code, { story, pinned: true });
  }

  const eligible = options.stories.filter((story) => {
    if (story.draft || !options.qualifies(story)) return false;
    return Boolean(getStateByCode(story.state));
  });
  const used = new Set([...chosen.values()].map((pick) => pick.story.slug));
  const open = states.filter((state) => !chosen.has(state.code));

  const homeRows = open
    .map((state) => ({
      state,
      candidates: eligible
        .filter((story) => story.state === state.code && !used.has(story.slug))
        .sort((a, b) => compare(state.code, a, b)),
    }))
    .filter((row) => row.candidates.length > 0)
    .sort((a, b) => a.candidates.length - b.candidates.length || a.state.name.localeCompare(b.state.name));

  for (const row of homeRows) {
    const next = row.candidates.find((candidate) => !used.has(candidate.slug));
    if (!next) continue;
    chosen.set(row.state.code, { story: next, pinned: false });
    used.add(next.slug);
  }

  for (const state of states) {
    if (chosen.has(state.code)) continue;
    const candidates = eligible
      .filter((story) => covers(story, state.code))
      .sort((a, b) => compare(state.code, a, b));
    const next = candidates.find((candidate) => !used.has(candidate.slug)) ?? candidates[0];
    if (!next) continue;
    chosen.set(state.code, { story: next, pinned: false });
    used.add(next.slug);
  }

  return {
    pinErrors,
    slots: states.map((state) => {
      const pick = chosen.get(state.code);
      return { state, story: pick?.story, pinned: Boolean(pick?.pinned) };
    }),
  };
}
