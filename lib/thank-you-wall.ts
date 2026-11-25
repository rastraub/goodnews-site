/**
 * Thanksgiving thank-you notes ride the existing story-tip email.
 * An editor hand-picks some for the newsletter. Nothing here publishes them.
 * This file stays free of the filesystem so the submit form can import it.
 */
import { getStateByCode } from "@/lib/states";
import {
  TIP_LIMITS,
  cleanHttpUrl,
  isSafeMailbox,
  multiLine,
  sanitizeHeader,
  singleLine,
  type StoryTip,
} from "@/lib/tip-mail";

export const THANK_YOU_KIND = "thanks";
export const THANK_YOU_PATH = `/submit?kind=${THANK_YOU_KIND}`;
export const THANK_YOU_SHORT_PATH = "/thanks";
export const THANK_YOU_SUBJECT_PREFIX = "[Thank-You Wall]";

export const THANK_YOU_TITLE = "Thank someone this Thanksgiving";
export const THANK_YOU_INTRO =
  "Tell us who you're grateful for in one or two sentences. We'll share some of them on Thanksgiving Day.";
export const THANK_YOU_SUMMARY_LABEL = "Who do you want to thank, and why?";
export const THANK_YOU_PLACEHOLDER =
  "Ms. Ortiz, our school bus driver in Tucson, who waits for every kid to get inside before she pulls away.";
export const THANK_YOU_GUARD =
  "Kind words only. No politics, no complaints, no last names of private people.";
export const THANK_YOU_CONSENT =
  "OK to publish my thank-you with my first name and city (never my email).";
export const THANK_YOU_ANONYMOUS = "Please keep me anonymous";

export type ThankYouFormMode = "thanks" | "story";

export type ThankYouTip = {
  kind: "thanks";
  name: string;
  email: string;
  city: string;
  state: string;
  summary: string;
  sourceUrl?: string;
  consent: true;
  anonymous: boolean;
};

export function thankYouFormMode(kind: string | string[] | undefined): ThankYouFormMode {
  const value = (Array.isArray(kind) ? kind[0] : kind)?.trim() ?? "";
  return value === THANK_YOU_KIND ? "thanks" : "story";
}

/** Subject an editor can filter on. The story-tip prefix stays on ordinary tips. */
export function thankYouSubject(summary: string): string {
  const prefix = `${THANK_YOU_SUBJECT_PREFIX} `;
  const flat = sanitizeHeader(summary, 500);
  if (!flat) return `${prefix}New thank-you`;
  const snippetMax = 72;
  if (flat.length <= snippetMax) return `${prefix}${flat}`;
  const cut = flat.slice(0, snippetMax);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
  return `${prefix}${base}...`;
}

export function parseThankYou(data: Record<string, unknown>): { error: string } | ThankYouTip {
  const name = singleLine(data.name, TIP_LIMITS.name);
  const email = singleLine(data.email, TIP_LIMITS.email);
  const city = singleLine(data.city, TIP_LIMITS.city);
  const state = singleLine(data.state, 8);
  const summary = multiLine(data.summary, TIP_LIMITS.summary);
  const source = singleLine(data.sourceUrl, TIP_LIMITS.sourceUrl);

  if (name.tooLong) return { error: "That name is too long." };
  if (name.value.length < 2) return { error: "Add your name." };
  if (email.tooLong || !isSafeMailbox(email.value)) return { error: "Enter a valid email address." };
  if (city.tooLong) return { error: "That city name is too long." };
  const stateCode = state.value.toUpperCase();
  if (!city.value || state.tooLong || !getStateByCode(stateCode)) {
    return { error: "Add a city and a state." };
  }
  if (summary.tooLong) return { error: "That thank-you is too long to send." };
  if (summary.value.length < TIP_LIMITS.summaryMin) {
    return { error: "Tell us a little more about who you want to thank (at least a sentence)." };
  }
  if (source.tooLong) return { error: "That source link is too long." };
  const sourceUrl = source.value ? cleanHttpUrl(source.value, TIP_LIMITS.sourceUrl) : "";
  if (source.value && !sourceUrl.startsWith("https://")) {
    return { error: "Source links need to start with https://." };
  }
  if (data.consent !== true) {
    return { error: "Check the box to say it's OK to publish your thank-you with your first name and city." };
  }

  const tip: ThankYouTip = {
    kind: "thanks",
    name: name.value,
    email: email.value,
    city: city.value,
    state: stateCode,
    summary: summary.value,
    consent: true,
    anonymous: data.anonymous === true,
  };
  if (sourceUrl) tip.sourceUrl = sourceUrl;
  return tip;
}

export function asStoryTip(tip: ThankYouTip, extra: Pick<StoryTip, "receivedAt" | "pageUrl">): StoryTip {
  return {
    name: tip.name,
    email: tip.email,
    city: tip.city,
    state: tip.state,
    summary: tip.summary,
    sourceUrl: tip.sourceUrl,
    pageUrl: extra.pageUrl,
    receivedAt: extra.receivedAt,
    kind: tip.kind,
    consent: tip.consent,
    anonymous: tip.anonymous,
  };
}
