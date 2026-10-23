import { slugify } from "./hubs";
import { getCountry } from "./countries";
import { absoluteUrl } from "./seo";
import { getPublishedStories, type Story } from "./stories";
import { getStateByCode } from "./states";

/**
 * A newsroom page needs enough credited stories to be worth its own URL.
 * One-story credits stay on /sources and do not get a thin page.
 */
export const MIN_OUTLET_STORIES = 2;

export type OutletCredit = {
  slug: string;
  title: string;
  date: string;
  sourceName: string;
  sourceUrl: string;
  country: string;
  state?: string;
  alsoStates?: string[];
  help?: { label: string; url: string }[];
};

export type OutletStoryRef = {
  slug: string;
  title: string;
  date: string;
};

export type OutletPlace = {
  code: string;
  name: string;
  slug: string;
};

export type Outlet = {
  slug: string;
  /** Spelling used most often. Ties go to the newest story, then A–Z. */
  name: string;
  /** Lowercase name with a trailing "News" removed. Same domain + this key = one outlet. */
  nameKey: string;
  aliases: string[];
  /** Hostname without a leading www. */
  domain: string;
  /** Origin of the source URL, so the homepage is the outlet's site. */
  homepage: string;
  count: number;
  latest: string;
  states: OutletPlace[];
  countries: OutletPlace[];
  hasPage: boolean;
  /** Present when hasPage is true. */
  pagePath?: string;
  stories: OutletStoryRef[];
  help: { label: string; url: string }[];
};

type NameForm = { name: string; count: number; latest: string };
type OriginForm = { homepage: string; count: number; latest: string };

type Group = {
  domain: string;
  nameKey: string;
  forms: Map<string, NameForm>;
  origins: Map<string, OriginForm>;
  stories: OutletStoryRef[];
  states: Set<string>;
  countries: Set<string>;
  help: Map<string, { label: string; url: string }>;
};

export function collapseName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Case and whitespace fold together.
 * A trailing "News" (with a space or hyphen) folds too, and only stories on
 * the same domain share a group, so "Herald" and "Herald News" at two papers stay apart.
 * Stripping stops if it would erase the whole name ("News" stays "news").
 */
export function outletNameKey(name: string): string {
  const collapsed = collapseName(name).toLowerCase();
  let key = collapsed;
  let previous = "";
  while (key !== previous) {
    previous = key;
    key = key.replace(/(?:[\s\-–—|:]+news)+$/i, "").trim();
  }
  return key || collapsed;
}

export function outletDomain(sourceUrl: string): { domain: string; homepage: string } {
  const url = new URL(sourceUrl);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const domain = host.startsWith("www.") ? host.slice(4) : host;
  if (!domain) throw new Error(`Source URL has no domain: ${sourceUrl}`);
  return { domain, homepage: url.origin };
}

export function outletCreditKey(sourceName: string, sourceUrl: string): string {
  const { domain } = outletDomain(sourceUrl);
  return `${domain}\n${outletNameKey(sourceName)}`;
}

function preferForm<T extends { count: number; latest: string }>(forms: T[], label: (form: T) => string): T {
  return forms.slice().sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.latest !== b.latest) return a.latest < b.latest ? 1 : -1;
    return label(a).localeCompare(label(b), "en");
  })[0];
}

function compareOutlets(a: Pick<Outlet, "count" | "name" | "domain">, b: Pick<Outlet, "count" | "name" | "domain">): number {
  if (a.count !== b.count) return b.count - a.count;
  const byName = a.name.localeCompare(b.name, "en");
  if (byName !== 0) return byName;
  return a.domain.localeCompare(b.domain);
}

function assignSlugs(outlets: Outlet[]): Outlet[] {
  const used = new Set<string>();
  const ordered = outlets.slice().sort(compareOutlets);
  for (const outlet of ordered) {
    const base = slugify(outlet.nameKey) || slugify(outlet.domain) || "newsroom";
    let slug = base;
    if (used.has(slug)) {
      const domainSlug = slugify(outlet.domain) || "site";
      slug = `${base}-${domainSlug}`;
      let n = 2;
      while (used.has(slug)) {
        slug = `${base}-${domainSlug}-${n}`;
        n += 1;
      }
    }
    used.add(slug);
    outlet.slug = slug;
    outlet.hasPage = outlet.count >= MIN_OUTLET_STORIES;
    outlet.pagePath = outlet.hasPage ? `/sources/${slug}` : undefined;
  }
  return ordered;
}

export function buildOutlets(credits: OutletCredit[]): Outlet[] {
  const groups = new Map<string, Group>();

  for (const credit of credits) {
    const { domain, homepage } = outletDomain(credit.sourceUrl);
    const nameKey = outletNameKey(credit.sourceName);
    const key = `${domain}\n${nameKey}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        domain,
        nameKey,
        forms: new Map(),
        origins: new Map(),
        stories: [],
        states: new Set(),
        countries: new Set(),
        help: new Map(),
      };
      groups.set(key, group);
    }

    const surface = collapseName(credit.sourceName);
    const form = group.forms.get(surface);
    if (!form) group.forms.set(surface, { name: surface, count: 1, latest: credit.date });
    else {
      form.count += 1;
      if (credit.date > form.latest) form.latest = credit.date;
    }

    const origin = group.origins.get(homepage);
    if (!origin) group.origins.set(homepage, { homepage, count: 1, latest: credit.date });
    else {
      origin.count += 1;
      if (credit.date > origin.latest) origin.latest = credit.date;
    }

    group.stories.push({ slug: credit.slug, title: credit.title, date: credit.date });

    if (credit.country === "US") {
      if (credit.state) group.states.add(credit.state);
      for (const extra of credit.alsoStates ?? []) group.states.add(extra);
    } else if (credit.country) {
      group.countries.add(credit.country);
    }

    for (const item of credit.help ?? []) {
      const label = collapseName(item.label);
      if (!label || !item.url) continue;
      const helpKey = `${label.toLowerCase()}\n${item.url}`;
      if (!group.help.has(helpKey)) group.help.set(helpKey, { label, url: item.url });
    }
  }

  const built: Outlet[] = [];
  for (const group of groups.values()) {
    const forms = [...group.forms.values()];
    const winner = preferForm(forms, (form) => form.name);
    const origin = preferForm([...group.origins.values()], (form) => form.homepage);
    const stories = group.stories.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const byTitle = a.title.localeCompare(b.title, "en");
      if (byTitle !== 0) return byTitle;
      return a.slug.localeCompare(b.slug);
    });
    const states = [...group.states]
      .flatMap((code) => {
        const state = getStateByCode(code);
        return state ? [{ code: state.code, name: state.name, slug: state.slug }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
    const countries = [...group.countries]
      .flatMap((code) => {
        const country = getCountry(code);
        return country ? [{ code: country.code, name: country.name, slug: country.slug }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
    const help = [...group.help.values()].sort((a, b) => a.label.localeCompare(b.label, "en") || a.url.localeCompare(b.url));
    const latest = stories[0]?.date ?? "";
    built.push({
      slug: "",
      name: winner.name,
      nameKey: group.nameKey,
      aliases: forms
        .map((form) => form.name)
        .filter((name) => name !== winner.name)
        .sort((a, b) => a.localeCompare(b, "en")),
      domain: group.domain,
      homepage: origin.homepage,
      count: stories.length,
      latest,
      states,
      countries,
      hasPage: false,
      stories,
      help,
    });
  }

  return assignSlugs(built);
}

function creditFromStory(story: Story): OutletCredit {
  return {
    slug: story.slug,
    title: story.title,
    date: story.date,
    sourceName: story.sourceName,
    sourceUrl: story.sourceUrl,
    country: story.country,
    state: story.state,
    alsoStates: story.alsoStates,
    help: story.howToHelp.map((item) => ({ label: item.label, url: item.url })),
  };
}

let cache: Outlet[] | null = null;
let byCredit = new Map<string, Outlet>();

function loadOutlets(): Outlet[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const outlets = buildOutlets(getPublishedStories().map(creditFromStory));
  byCredit = new Map(outlets.map((outlet) => [`${outlet.domain}\n${outlet.nameKey}`, outlet]));
  if (process.env.NODE_ENV === "production") cache = outlets;
  return outlets;
}

export function getOutlets(): Outlet[] {
  return loadOutlets();
}

export function getOutlet(slug: string): Outlet | undefined {
  return getOutlets().find((outlet) => outlet.slug === slug && outlet.hasPage);
}

export function getOutletForStory(story: Pick<Story, "sourceName" | "sourceUrl">): Outlet | undefined {
  loadOutlets();
  return byCredit.get(outletCreditKey(story.sourceName, story.sourceUrl));
}

export function joinNames(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export type OutletReportRow = {
  outlet: string;
  domain: string;
  homepage: string;
  states: string;
  storyCount: number;
  latestDate: string;
  storyUrls: string;
  nonprofits: string;
};

export function outletPlaces(outlet: Pick<Outlet, "states" | "countries">): string {
  return [...outlet.states.map((state) => state.name), ...outlet.countries.map((country) => country.name)].join("; ");
}

export function outletReportRows(outlets = getOutlets()): OutletReportRow[] {
  return outlets.map((outlet) => ({
    outlet: outlet.name,
    domain: outlet.domain,
    homepage: outlet.homepage,
    states: outletPlaces(outlet),
    storyCount: outlet.count,
    latestDate: outlet.latest,
    storyUrls: outlet.stories.map((story) => absoluteUrl(`/story/${story.slug}`)).join(" | "),
    nonprofits: outlet.help.map((item) => `${item.label} (${item.url})`).join(" | "),
  }));
}

function csvField(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const CSV_HEADER = ["outlet", "domain", "homepage", "states", "story_count", "latest_date", "story_urls", "nonprofits"] as const;

export function formatOutletCsv(rows: OutletReportRow[]): string {
  const lines = [
    CSV_HEADER.join(","),
    ...rows.map((row) =>
      [
        csvField(row.outlet),
        csvField(row.domain),
        csvField(row.homepage),
        csvField(row.states),
        csvField(row.storyCount),
        csvField(row.latestDate),
        csvField(row.storyUrls),
        csvField(row.nonprofits),
      ].join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}
