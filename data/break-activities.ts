/**
 * Family activities on a break pack. One array, so a later route is a new row.
 *
 * href is an existing site path, or "latest-quiz" for the newest /quiz week.
 * editions limits a row to those slugs. Omit it to show the row on every pack.
 *
 * These routes are not on main, so they are not linked:
 * /word-search, /starters, /advent, /homeschool.
 * Add a row only after that page exists.
 */
import { CLASSROOM_INDEX_PATH } from "@/lib/classroom-pack";
import { EXPLAINER_INDEX_PATH } from "@/lib/explainers";
import { KINDNESS_INDEX_PATH } from "@/lib/kindness";
import { GOOD_NEWS_MAP_PATH } from "@/lib/map-path";
import { ON_THIS_DAY_INDEX_PATH } from "@/lib/on-this-day";
import { TABLE_TALK_PATH } from "@/lib/table-talk";
import { THANKS_PATH } from "@/lib/thanks";

export type BreakActivityConfig = {
  id: string;
  href: string;
  label: string;
  detail: string;
  editions?: readonly string[];
};

export const BREAK_ACTIVITIES: readonly BreakActivityConfig[] = [
  {
    id: "quiz",
    href: "latest-quiz",
    label: "This week's Good News Quiz",
    detail: "A short quiz built from real stories. Open kid mode when the week has one.",
  },
  {
    id: "table-talk",
    href: TABLE_TALK_PATH,
    label: "Good News Table Talk",
    detail: "Printable conversation cards for a Thanksgiving table.",
    editions: ["thanksgiving-2026"],
  },
  {
    id: "thanks",
    href: THANKS_PATH,
    label: "50 States of Thanks",
    detail: "One gratitude story from every state.",
    editions: ["thanksgiving-2026"],
  },
  {
    id: "kindness-challenge",
    href: KINDNESS_INDEX_PATH,
    label: "Kindness Challenge",
    detail: "One small, free act for this week.",
  },
  {
    id: "kids",
    href: "/kids",
    label: "Good news for kids",
    detail: "Classroom stories with a read-aloud summary and discussion questions.",
  },
  {
    id: "kids-print",
    href: "/kids/print",
    label: "Story of the day",
    detail: "One printable story to read aloud together.",
  },
  {
    id: "classroom",
    href: CLASSROOM_INDEX_PATH,
    label: "Good News Friday",
    detail: "The weekly printable pack for classrooms.",
  },
  {
    id: "map",
    href: GOOD_NEWS_MAP_PATH,
    label: "Good News Map",
    detail: "See where recent good news happened.",
  },
  {
    id: "explainers",
    href: EXPLAINER_INDEX_PATH,
    label: "Good News Explainers",
    detail: "Plain-language explainers a family can read together.",
  },
  {
    id: "on-this-day",
    href: ON_THIS_DAY_INDEX_PATH,
    label: "Good news on this day",
    detail: "Good things tied to today's date.",
  },
];
