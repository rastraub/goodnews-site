"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { monthDayFromIso, mountainIsoDay, onThisDayPath } from "@/lib/calendar-day";

function mountainPath(fallbackPath: string): string {
  const parts = monthDayFromIso(mountainIsoDay());
  return parts ? onThisDayPath(parts.month, parts.day) : fallbackPath;
}

export function TodayJump({ fallbackPath }: { fallbackPath: string }) {
  const router = useRouter();
  const path = useSyncExternalStore(
    () => () => {},
    () => mountainPath(fallbackPath),
    () => fallbackPath,
  );

  useEffect(() => {
    if (window.location.pathname !== path) router.replace(path);
  }, [path, router]);

  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">On this day</p>
        <h1>Opening today&apos;s good news.</h1>
        <p className="lede">This page follows the calendar date in Mountain Time, America/Denver.</p>
        <p className="link-pills">
          <Link href={path}>Continue to today&apos;s page</Link>
          <Link href="/on-this-day">All days</Link>
        </p>
      </div>
    </div>
  );
}
