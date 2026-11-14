"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STREAK_EVENT, STREAK_KEY, type StreakRecord } from "@/lib/habit";

function readStreak(): StreakRecord | undefined {
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<StreakRecord>;
    if (!parsed || typeof parsed.count !== "number" || parsed.count < 1) return undefined;
    return { last: parsed.last ?? "", count: parsed.count, reported: parsed.reported ?? 0 };
  } catch {
    return undefined;
  }
}

export function StreakBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setCount(readStreak()?.count ?? null);
    sync();
    window.addEventListener(STREAK_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STREAK_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!count) return null;
  const label = count === 1 ? "1 day" : `${count} days`;

  return (
    <p className="streak-badge no-print">
      <span>
        {label} of good news on this device.
      </span>{" "}
      <Link href="/subscribe">Get the daily email</Link>
    </p>
  );
}
