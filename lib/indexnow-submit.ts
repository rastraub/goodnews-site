import fs from "fs";
import path from "path";
import { indexNowKey, indexNowKeyLocation } from "./indexnow";
import { getHubIndex } from "./hubs";
import { absoluteUrl, isWithinHours } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode } from "./states";
import { weekStart, weeksToPrerender } from "./weeks";
import { siteConfig } from "@/site.config";

/** One IndexNow request. https://www.indexnow.org/documentation */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Edition `date` is stamped at 09:00 UTC, and it is not the commit time.
 * On recent morning runs the median new file was already about 27 hours
 * old, and about 90% were under four days. A 26-hour window would skip
 * most pages that had just deployed. 96 hours still misses a story filed
 * more than four days before its file lands; the backfill script covers
 * those. The daily cron therefore sends each URL a few times, not on every deploy.
 */
export const INDEXNOW_LOOKBACK_HOURS = 96;

/** IndexNow rejects a single request above this. Longer lists are split. */
export const INDEXNOW_MAX_URLS = 10_000;

export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

export type IndexNowSubmitResult = {
  ok: boolean;
  dryRun: boolean;
  skipped: boolean;
  count: number;
  status?: number;
  payloads: IndexNowPayload[];
  error?: string;
};

export function indexNowHost(): string {
  return new URL(siteConfig.url).host;
}

/**
 * Canonical URL on the production host, or undefined when IndexNow would
 * reject the row (wrong host, or not https).
 */
export function siteUrlForIndexNow(input: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return undefined;
  }
  const production = new URL(siteConfig.url);
  if (parsed.protocol !== "https:" || parsed.hostname !== production.hostname || parsed.port) return undefined;
  if (parsed.pathname === "/") return siteConfig.url;
  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${siteConfig.url}${pathname}`;
}

/** True when the public key file is present and exactly the key. Null when this runtime has no public directory. */
export function indexNowKeyFileMatches(): boolean | null {
  const filePath = path.join(process.cwd(), "public", `${indexNowKey}.txt`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8") === indexNowKey;
}

export function storyIsInIndexNowWindow(story: Pick<Story, "date" | "updates">, now = Date.now()): boolean {
  if (isWithinHours(story.date, INDEXNOW_LOOKBACK_HOURS, now)) return true;
  return story.updates.some((update) => isWithinHours(update.date, INDEXNOW_LOOKBACK_HOURS, now));
}

/**
 * Story URLs from the lookback window, plus the homepage and the state,
 * country, topic, and week pages those stories change.
 */
export function recentIndexNowUrls(now = Date.now()): { stories: { slug: string; date: string }[]; urls: string[] } {
  const recent = getPublishedStories().filter((story) => storyIsInIndexNowWindow(story, now));
  recent.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
  if (!recent.length) return { stories: [], urls: [] };

  const hubs = getHubIndex();
  const weekByStart = new Map(weeksToPrerender().map((week) => [week.start, week.path]));
  const urls = new Set<string>();
  urls.add(absoluteUrl("/"));

  for (const story of recent) {
    urls.add(absoluteUrl(`/story/${story.slug}`));
    const seenStates = new Set<string>();
    for (const code of [story.state, ...story.alsoStates]) {
      if (!code || seenStates.has(code)) continue;
      seenStates.add(code);
      const state = getStateByCode(code);
      if (state) urls.add(absoluteUrl(`/state/${state.slug}`));
    }
    if (story.country !== "US") {
      const country = hubs.countryByCode.get(story.country);
      if (country?.indexable) urls.add(absoluteUrl(`/country/${country.slug}`));
    }
    for (const tag of story.tags) {
      const topic = hubs.byPath.get(`/topic/${tag}`);
      if (topic?.indexable) urls.add(absoluteUrl(topic.path));
    }
    // A later follow-up does not rewrite the old week roundup.
    if (isWithinHours(story.date, INDEXNOW_LOOKBACK_HOURS, now)) {
      const week = weekByStart.get(weekStart(story.date));
      if (week) urls.add(absoluteUrl(week));
    }
  }

  return {
    stories: recent.map((story) => ({ slug: story.slug, date: story.date })),
    urls: [...urls].sort(),
  };
}

export function indexNowPayloads(urlList: string[]): IndexNowPayload[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const url of urlList) {
    if (seen.has(url)) continue;
    seen.add(url);
    unique.push(url);
  }
  const payloads: IndexNowPayload[] = [];
  for (let index = 0; index < unique.length; index += INDEXNOW_MAX_URLS) {
    payloads.push({
      host: indexNowHost(),
      key: indexNowKey,
      keyLocation: indexNowKeyLocation(),
      urlList: unique.slice(index, index + INDEXNOW_MAX_URLS),
    });
  }
  return payloads;
}

/**
 * POST the URL list to IndexNow. Dry-run returns the JSON and does not call
 * the network. A network or HTTP error is logged and returned; it does not throw.
 */
export async function submitIndexNow(urlList: string[], options?: { dryRun?: boolean }): Promise<IndexNowSubmitResult> {
  const dryRun = options?.dryRun === true;
  const payloads = indexNowPayloads(urlList);
  const count = payloads.reduce((total, payload) => total + payload.urlList.length, 0);
  if (!count) {
    return { ok: true, dryRun, skipped: true, count: 0, payloads };
  }
  if (dryRun) {
    return { ok: true, dryRun: true, skipped: false, count, payloads };
  }

  const keyFile = indexNowKeyFileMatches();
  if (keyFile === false) {
    console.warn("IndexNow ping skipped: public/<key>.txt does not match the key constant.");
    return { ok: false, dryRun: false, skipped: true, count, payloads, error: "key-file-mismatch" };
  }

  let status: number | undefined;
  try {
    for (const payload of payloads) {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });
      status = response.status;
      const body = await response.text();
      console.log(`IndexNow ${response.status} for ${payload.urlList.length} URLs`);
      if (!response.ok) console.warn(body.slice(0, 500));
      if (response.status !== 200 && response.status !== 202) {
        return { ok: false, dryRun: false, skipped: false, count, status, payloads, error: `HTTP ${response.status}` };
      }
    }
    return { ok: true, dryRun: false, skipped: false, count, status, payloads };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("IndexNow ping failed.");
    console.warn(message);
    return { ok: false, dryRun: false, skipped: false, count, status, payloads, error: message };
  }
}
