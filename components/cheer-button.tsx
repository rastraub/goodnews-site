"use client";

import { useSyncExternalStore } from "react";
import { formatCount } from "@/lib/format";

function storageKey(slug: string) {
  return `cheer:${slug}`;
}

const listeners = new Set<() => void>();

function emitCheers() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function CheerButton({
  slug,
  count,
  variant = "mini",
}: {
  slug: string;
  count: number;
  variant?: "hero" | "mini";
}) {
  const cheered = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(storageKey(slug)) === "1",
    () => false,
  );
  const total = count + (cheered ? 1 : 0);

  function onCheer(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (cheered) return;
    window.localStorage.setItem(storageKey(slug), "1");
    emitCheers();
    fetch("/api/cheer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }

  const label = formatCount(total);

  if (variant === "hero") {
    return (
      <button type="button" className="cheer" aria-pressed={cheered} onClick={onCheer}>
        <svg aria-hidden="true">
          <use href="#i-sun" />
        </svg>
        {cheered ? "Cheered" : "Cheer"} · {label}
      </button>
    );
  }

  return (
    <button type="button" className="mini-cheer" aria-pressed={cheered} onClick={onCheer} aria-label={`${label} cheers`}>
      <svg aria-hidden="true">
        <use href="#i-sun" />
      </svg>
      {label}
    </button>
  );
}
