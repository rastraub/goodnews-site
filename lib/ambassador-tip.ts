/**
 * Kindness Ambassadors notes ride the existing story-tip email.
 * This file stays free of the filesystem so the submit form can import it.
 */
import { STATES, getStateByCode } from "@/lib/states";
import {
  AMBASSADOR_NOTE_LABEL,
  AMBASSADOR_SIGNUP_LABEL,
  TIP_LIMITS,
  isSafeMailbox,
  singleLine,
} from "@/lib/tip-mail";

export const AMBASSADORS_PATH = "/kindness-ambassadors";
export const AMBASSADOR_CERTIFICATE_PATH = "/kindness-ambassadors/certificate";

export const AMBASSADOR_SIGNUP_TYPE = "kindness-ambassadors";
export const AMBASSADOR_REPORT_TYPE = "kindness-ambassadors-report";

export const AMBASSADOR_TITLE = "Kindness Ambassadors";

export const AMBASSADOR_DESCRIPTION =
  "A free program for K-12 classrooms, libraries, scouts, youth groups, and homeschool groups. One small act of kindness a week, a kid-friendly story to read aloud, and no student names or photos of children.";

export const AMBASSADOR_SHARE =
  "Kindness Ambassadors: one small, free act of kindness a week for a class or student group.";

export type AmbassadorFormMode = "story" | "ambassador-signup" | "ambassador-report";

export type AmbassadorTipFields = {
  name: string;
  email: string;
  city: string;
  state: string;
  region: string;
  summary: string;
};

const BLOCKED_KEYS = ["students", "student", "studentNames", "studentName", "photos", "photo", "image", "images", "picture", "pictures"] as const;

const MAILBOX_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export function ambassadorSignupHref(): string {
  return `/submit?type=${AMBASSADOR_SIGNUP_TYPE}`;
}

export function ambassadorReportHref(): string {
  return `/submit?type=${AMBASSADOR_REPORT_TYPE}`;
}

export function shoutoutsPath(month: string): string {
  return `${AMBASSADORS_PATH}/shoutouts/${month}`;
}

export function ambassadorFormMode(type: string | string[] | undefined): AmbassadorFormMode {
  const value = (Array.isArray(type) ? type[0] : type)?.trim() ?? "";
  if (value === AMBASSADOR_SIGNUP_TYPE || value === AMBASSADOR_SIGNUP_LABEL) return "ambassador-signup";
  if (value === AMBASSADOR_REPORT_TYPE) return "ambassador-report";
  return "story";
}

export function isAmbassadorType(type: string): boolean {
  return type === AMBASSADOR_SIGNUP_TYPE || type === AMBASSADOR_SIGNUP_LABEL || type === AMBASSADOR_REPORT_TYPE;
}

/** Map a state or country line onto a USPS code when it clearly names a state. */
export function stateCodeFromRegion(region: string): string | undefined {
  const trimmed = region.trim().replace(/\./g, "");
  if (!trimmed) return undefined;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return getStateByCode(trimmed)?.code;
  const byName = (value: string) => STATES.find((state) => state.name.toLowerCase() === value.toLowerCase())?.code;
  const full = byName(trimmed);
  if (full) return full;
  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return undefined;
  const last = parts[parts.length - 1];
  if (/^[A-Za-z]{2}$/.test(last)) return getStateByCode(last)?.code;
  return byName(last);
}

function blockedExtra(data: Record<string, unknown>): string | undefined {
  for (const key of BLOCKED_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return "Leave out student names and photos of children.";
    if (value != null && typeof value !== "string") return "Leave out student names and photos of children.";
  }
  return undefined;
}

function looksLikeRoster(value: string): boolean {
  return value.split(",").length > 3;
}

function hasMailbox(value: string): boolean {
  return MAILBOX_IN_TEXT.test(value);
}

function readLine(data: Record<string, unknown>, key: string, max: number): { value: string; tooLong: boolean } {
  return singleLine(data[key], max);
}

export function parseAmbassadorSignup(data: Record<string, unknown>): { error: string } | AmbassadorTipFields {
  const blocked = blockedExtra(data);
  if (blocked) return { error: blocked };

  const name = readLine(data, "name", TIP_LIMITS.name);
  const email = readLine(data, "email", TIP_LIMITS.email);
  const city = readLine(data, "city", TIP_LIMITS.city);
  const region = readLine(data, "region", 80);
  const group = readLine(data, "group", 120);
  const grades = readLine(data, "grades", 40);

  if (name.tooLong || group.tooLong || city.tooLong || region.tooLong || grades.tooLong) {
    return { error: "That note is too long to send." };
  }
  if (name.value.length < 2) {
    return { error: "Add the first name of the teacher or leader, or the group name." };
  }
  if (email.tooLong || !isSafeMailbox(email.value)) {
    return { error: "Enter a valid email address." };
  }
  if (group.value.length < 2) return { error: "Add the school or group name." };
  if (city.value.length < 2) return { error: "Add a city." };
  if (region.value.length < 2) return { error: "Add a state or country." };
  if (grades.value.length < 1) return { error: "Add a grade range, such as K-2 or grades 6-8." };
  if ([name.value, group.value, grades.value].some(looksLikeRoster)) {
    return { error: "Send one group, not a list of students." };
  }
  if ([name.value, group.value, city.value, region.value, grades.value].some(hasMailbox)) {
    return { error: "Put the email in the email field only. Leave out student names and photos of children." };
  }

  const summary = [
    `${AMBASSADOR_SIGNUP_LABEL}.`,
    `School or group: ${group.value}.`,
    `City: ${city.value}.`,
    `State or country: ${region.value}.`,
    `Grade range: ${grades.value}.`,
    "No student names or photos of children.",
  ].join(" ");

  return {
    name: name.value,
    email: email.value,
    city: city.value,
    state: stateCodeFromRegion(region.value) ?? "",
    region: region.value,
    summary,
  };
}

export function parseAmbassadorReport(data: Record<string, unknown>): { error: string } | AmbassadorTipFields {
  const blocked = blockedExtra(data);
  if (blocked) return { error: blocked };

  const name = readLine(data, "name", TIP_LIMITS.name);
  const email = readLine(data, "email", TIP_LIMITS.email);
  const city = readLine(data, "city", TIP_LIMITS.city);
  const region = readLine(data, "region", 80);
  const group = readLine(data, "group", 120);
  const act = readLine(data, "act", 500);

  if (name.tooLong || group.tooLong || city.tooLong || region.tooLong || act.tooLong) {
    return { error: "That note is too long to send." };
  }
  if (name.value.length < 2) {
    return { error: "Add the first name of the teacher or leader, or the group name." };
  }
  if (email.tooLong || !isSafeMailbox(email.value)) {
    return { error: "Enter a valid email address." };
  }
  if (group.value.length < 2) return { error: "Add the school or group name." };
  if (city.value.length < 2) return { error: "Add a city." };
  if (region.value.length < 2) return { error: "Add a state or country." };
  if (act.value.length < 20) {
    return { error: "Tell us a little more about what the class did. Leave out student names and photos of children." };
  }
  if ([name.value, group.value].some(looksLikeRoster)) {
    return { error: "Send one group, not a list of students." };
  }
  if ([name.value, group.value, city.value, region.value, act.value].some(hasMailbox)) {
    return { error: "Put the email in the email field only. Leave out student names and photos of children." };
  }

  const summary = [
    `${AMBASSADOR_NOTE_LABEL}.`,
    `School or group: ${group.value}.`,
    `City: ${city.value}.`,
    `State or country: ${region.value}.`,
    `What the class did: ${act.value}`,
  ].join(" ");

  return {
    name: name.value,
    email: email.value,
    city: city.value,
    state: stateCodeFromRegion(region.value) ?? "",
    region: region.value,
    summary,
  };
}
