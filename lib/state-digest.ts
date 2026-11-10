/**
 * Weekly "Good news from {State}" drafts.
 * Builds markdown and HTML in memory. The script writes the files.
 * Nothing here sends mail or calls an email vendor.
 */
import { absoluteUrl } from "./seo";
import { getStateByCode, stateName, STATES, type StateInfo } from "./states";
import { addDays, formatWeekRange, weekStart } from "./weeks";
import { siteConfig } from "@/site.config";

/** A state digest is worth sending once a week has at least this many stories. */
export const DIGEST_MIN_STORIES = 3;

export type DigestStory = {
  slug: string;
  title: string;
  dek: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  alsoStates?: readonly string[];
  sourceName: string;
  sourceUrl: string;
  draft?: boolean;
};

export type CoverageRow = {
  code: string;
  name: string;
  count: number;
  enough: boolean;
};

export type StateDigest = {
  code: string;
  name: string;
  start: string;
  end: string;
  rangeLabel: string;
  fileSlug: string;
  stories: DigestStory[];
  markdown: string;
  html: string;
  coverage: CoverageRow[];
  coverageMarkdown: string;
  coverageHtml: string;
};

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function parseDigestArgs(argv: string[]): { ok: true; state: string; week: string } | { ok: false; error: string } {
  const known = new Set(["--state", "--week"]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    if (!known.has(arg)) {
      return { ok: false, error: `Unknown option ${arg}. This script only writes local draft files.` };
    }
    index += 1;
  }

  function value(flag: string): string | undefined {
    const index = argv.indexOf(flag);
    if (index < 0) return undefined;
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) return undefined;
    return next;
  }

  const stateRaw = value("--state");
  const weekRaw = value("--week");
  if (!stateRaw || !weekRaw) {
    return { ok: false, error: "Usage: npm run newsletter:state-digest -- --state CO --week YYYY-MM-DD" };
  }
  const state = stateRaw.trim().toUpperCase();
  if (!getStateByCode(state)) {
    return { ok: false, error: `Unknown state "${stateRaw}". Use a USPS code, including DC.` };
  }
  if (!isIsoDate(weekRaw)) {
    return { ok: false, error: "Week must be a real calendar date in YYYY-MM-DD." };
  }
  return { ok: true, state, week: weekRaw };
}

function touches(story: DigestStory, code: string): boolean {
  if (story.draft || story.country !== "US") return false;
  if (story.state === code) return true;
  return (story.alsoStates ?? []).includes(code);
}

function inWeek(story: DigestStory, start: string, end: string): boolean {
  return story.date >= start && story.date <= end;
}

export function storiesForStateWeek(stories: readonly DigestStory[], code: string, week: string): DigestStory[] {
  const start = weekStart(week);
  const end = addDays(start, 6);
  return stories
    .filter((story) => touches(story, code) && inWeek(story, start, end))
    .slice()
    .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? 1 : -1));
}

export function coverageForWeek(stories: readonly DigestStory[], week: string, states: readonly StateInfo[] = STATES): CoverageRow[] {
  return states.map((state) => {
    const count = storiesForStateWeek(stories, state.code, week).length;
    return { code: state.code, name: state.name, count, enough: count >= DIGEST_MIN_STORIES };
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function place(story: DigestStory): string {
  const home = stateName(story.state);
  if (story.city && home) return `${story.city}, ${home}`;
  return story.city || home || "United States";
}

function storyMarkdown(story: DigestStory): string {
  const url = absoluteUrl(`/story/${story.slug}`);
  return [
    `## ${story.title}`,
    "",
    story.dek,
    "",
    `- Place: ${place(story)}`,
    `- Date: ${story.date}`,
    `- Source: ${story.sourceName} (${story.sourceUrl})`,
    `- Story: ${url}`,
    "",
  ].join("\n");
}

function storyHtml(story: DigestStory): string {
  const url = absoluteUrl(`/story/${story.slug}`);
  return [
    "<article>",
    `<h2>${escapeHtml(story.title)}</h2>`,
    `<p>${escapeHtml(story.dek)}</p>`,
    "<ul>",
    `<li>Place: ${escapeHtml(place(story))}</li>`,
    `<li>Date: ${escapeHtml(story.date)}</li>`,
    `<li>Source: <a href="${escapeHtml(story.sourceUrl)}">${escapeHtml(story.sourceName)}</a></li>`,
    `<li>Story: <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`,
    "</ul>",
    "</article>",
  ].join("\n");
}

function coverageMarkdown(rows: CoverageRow[], rangeLabel: string): string {
  const lines = [
    `# State coverage for ${rangeLabel}`,
    "",
    `A state has enough stories for a weekly digest when it has ${DIGEST_MIN_STORIES} or more published stories that week. A story filed in another state counts when this state is listed on it as well.`,
    "",
    "This report was written on this computer for a person to review. It was not sent.",
    "",
    "| State | Code | Stories | Enough |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(`| ${row.name} | ${row.code} | ${row.count} | ${row.enough ? "yes" : "no"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function coverageHtml(rows: CoverageRow[], rangeLabel: string): string {
  const body = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.code)}</td><td>${row.count}</td><td>${row.enough ? "yes" : "no"}</td></tr>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>State coverage for ${escapeHtml(rangeLabel)}</title>
</head>
<body>
<h1>State coverage for ${escapeHtml(rangeLabel)}</h1>
<p>A state has enough stories for a weekly digest when it has ${DIGEST_MIN_STORIES} or more published stories that week. This file was written locally. It was not sent.</p>
<table>
<thead><tr><th>State</th><th>Code</th><th>Stories</th><th>Enough</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</body>
</html>
`;
}

export function buildStateDigest(stories: readonly DigestStory[], code: string, week: string): StateDigest {
  const state = getStateByCode(code);
  if (!state) throw new Error(`Unknown state ${code}.`);
  if (!isIsoDate(week)) throw new Error(`Week must be YYYY-MM-DD, got ${week}.`);
  const start = weekStart(week);
  const end = addDays(start, 6);
  const rangeLabel = formatWeekRange(start, end);
  const picked = storiesForStateWeek(stories, state.code, week);
  const coverage = coverageForWeek(stories, week);
  const byline = `${siteConfig.editor.name} · ${siteConfig.owner.name}`;
  const intro = picked.length
    ? `${picked.length} published ${picked.length === 1 ? "story" : "stories"} from ${state.name} in this week.`
    : `No published stories from ${state.name} fell in this week.`;
  const markdown = [
    `# Good news from ${state.name}`,
    "",
    `Week of ${rangeLabel}.`,
    "",
    intro,
    "",
    "Draft for a person to review. This file was written on this computer. It was not sent.",
    "",
    byline,
    "",
    picked.map(storyMarkdown).join("\n"),
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Good news from ${escapeHtml(state.name)}</title>
</head>
<body>
<h1>Good news from ${escapeHtml(state.name)}</h1>
<p>Week of ${escapeHtml(rangeLabel)}.</p>
<p>${escapeHtml(intro)}</p>
<p>Draft for a person to review. This file was written on this computer. It was not sent.</p>
<p>${escapeHtml(byline)}</p>
${picked.map(storyHtml).join("\n")}
</body>
</html>
`;
  return {
    code: state.code,
    name: state.name,
    start,
    end,
    rangeLabel,
    fileSlug: state.code.toLowerCase(),
    stories: picked,
    markdown,
    html,
    coverage,
    coverageMarkdown: coverageMarkdown(coverage, rangeLabel),
    coverageHtml: coverageHtml(coverage, rangeLabel),
  };
}
