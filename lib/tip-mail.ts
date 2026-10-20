import { getStateByCode } from "@/lib/states";
import { siteConfig } from "@/site.config";

export type StoryTip = {
  name: string;
  email: string;
  city: string;
  state: string;
  summary: string;
  sourceUrl?: string;
  pageUrl?: string;
  receivedAt: string;
};

export const TIP_LIMITS = {
  name: 120,
  email: 200,
  city: 100,
  summaryMin: 40,
  summary: 5000,
  sourceUrl: 2000,
  pageUrl: 2000,
} as const;

const MAILBOX_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const STRIP = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g;

export function isSafeMailbox(value: string): boolean {
  return value.length <= TIP_LIMITS.email && MAILBOX_RE.test(value);
}

/** Drop control characters and bidirectional overrides. */
export function stripUnsafe(value: string): string {
  return value.replace(STRIP, "");
}

export function singleLine(value: unknown, max: number): { value: string; tooLong: boolean } {
  if (typeof value !== "string") return { value: "", tooLong: false };
  const clean = stripUnsafe(value).replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return { value: clean.slice(0, max), tooLong: clean.length > max };
}

export function multiLine(value: unknown, max: number): { value: string; tooLong: boolean } {
  if (typeof value !== "string") return { value: "", tooLong: false };
  const clean = stripUnsafe(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return { value: clean.slice(0, max), tooLong: clean.length > max };
}

export function sanitizeHeader(value: string, max: number): string {
  return singleLine(value, max).value;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Keep http(s) URLs only. Credentials in the URL are rejected. */
export function cleanHttpUrl(value: string, max = TIP_LIMITS.pageUrl): string {
  const flat = sanitizeHeader(value, max + 1);
  if (!flat || flat.length > max) return "";
  let url: URL;
  try {
    url = new URL(flat);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  if (url.username || url.password) return "";
  const serialized = url.toString();
  if (serialized.length > max) return "";
  return serialized;
}

export function prepareStoryTip(tip: StoryTip): StoryTip {
  const sourceUrl = cleanHttpUrl(tip.sourceUrl ?? "", TIP_LIMITS.sourceUrl);
  const pageUrl = cleanHttpUrl(tip.pageUrl ?? "", TIP_LIMITS.pageUrl);
  return {
    name: sanitizeHeader(tip.name, TIP_LIMITS.name),
    email: sanitizeHeader(tip.email, TIP_LIMITS.email),
    city: sanitizeHeader(tip.city, TIP_LIMITS.city),
    state: sanitizeHeader(tip.state, 8).toUpperCase(),
    summary: multiLine(tip.summary, TIP_LIMITS.summary).value,
    sourceUrl: sourceUrl.startsWith("https://") ? sourceUrl : undefined,
    pageUrl: pageUrl || undefined,
    receivedAt: sanitizeHeader(tip.receivedAt, 40),
  };
}

export function storyTipSubject(summary: string): string {
  const prefix = `[${siteConfig.name} story tip] `;
  const flat = sanitizeHeader(summary, 500);
  if (!flat) return `${prefix}New tip`;
  const snippetMax = 72;
  if (flat.length <= snippetMax) return `${prefix}${flat}`;
  const cut = flat.slice(0, snippetMax);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
  return `${prefix}${base}...`;
}

function shown(value: string | undefined): string {
  const clean = value?.trim() ?? "";
  return clean || "(not provided)";
}

export function storyTipBodies(tip: StoryTip): { text: string; html: string } {
  const clean = prepareStoryTip(tip);
  const stateName = getStateByCode(clean.state)?.name;
  const stateLine = stateName ? `${stateName} (${clean.state})` : shown(clean.state);
  const rows: [string, string][] = [
    ["Name", shown(clean.name)],
    ["Email", shown(clean.email)],
    ["City", shown(clean.city)],
    ["State", stateLine],
    ["Source", shown(clean.sourceUrl)],
    ["Page", shown(clean.pageUrl)],
    ["Received", shown(clean.receivedAt)],
  ];
  const text = [
    `Story tip for ${siteConfig.name}`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "What happened:",
    clean.summary,
    "",
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = [
    "<!DOCTYPE html>",
    "<html><body>",
    `<p>Story tip for ${escapeHtml(siteConfig.name)}</p>`,
    `<table>${htmlRows}</table>`,
    "<h2>What happened?</h2>",
    `<pre style="white-space:pre-wrap">${escapeHtml(clean.summary)}</pre>`,
    "</body></html>",
  ].join("");
  return { text, html };
}
