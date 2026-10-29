import type { Metadata } from "next";
import { TodayJump } from "@/components/today-jump";
import { monthDayFromIso, mountainIsoDay, onThisDayPath } from "@/lib/calendar-day";
import { ON_THIS_DAY_INDEX_PATH } from "@/lib/on-this-day";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Good news on this day",
  description: "Opens the good-news page for today's date in Mountain Time (America/Denver).",
  robots: { index: false, follow: true },
  alternates: { canonical: ON_THIS_DAY_INDEX_PATH },
};

export default function OnThisDayTodayPage() {
  const parts = monthDayFromIso(mountainIsoDay());
  const fallbackPath = parts ? onThisDayPath(parts.month, parts.day) : ON_THIS_DAY_INDEX_PATH;
  return <TodayJump fallbackPath={fallbackPath} />;
}
