"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  INSTALL_PROMPT_KEY,
  STREAK_EVENT,
  STREAK_KEY,
  denverDay,
  habitSurface,
  installPromptDue,
  markMilestone,
  nextStreak,
  type StreakRecord,
} from "@/lib/habit";
import { siteConfig } from "@/site.config";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function track(name: string, params?: Record<string, string | number>) {
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params);
}

function readStamp(): number | undefined {
  try {
    const raw = window.localStorage.getItem(INSTALL_PROMPT_KEY);
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function writeStamp(now: number) {
  try {
    window.localStorage.setItem(INSTALL_PROMPT_KEY, String(now));
  } catch {
    /* Private mode can block storage. The prompt still works this once. */
  }
}

function readStreak(): StreakRecord | undefined {
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<StreakRecord>;
    if (!parsed || typeof parsed.last !== "string" || typeof parsed.count !== "number") return undefined;
    return { last: parsed.last, count: parsed.count, reported: typeof parsed.reported === "number" ? parsed.reported : 0 };
  } catch {
    return undefined;
  }
}

function writeStreak(record: StreakRecord) {
  window.localStorage.setItem(STREAK_KEY, JSON.stringify(record));
  window.dispatchEvent(new Event(STREAK_EVENT));
}

function recordVisit() {
  try {
    const today = denverDay();
    const previous = readStreak();
    const next = nextStreak(previous, today);
    let record = next.record;
    if (next.milestone && typeof window.gtag === "function") {
      window.gtag("event", "streak_milestone", { streak_days: next.milestone });
      record = markMilestone(record, next.milestone);
    }
    const changed =
      !previous || previous.last !== record.last || previous.count !== record.count || previous.reported !== record.reported;
    if (changed) writeStreak(record);
  } catch {
    /* Storage is optional. The page still reads. */
  }
}

function alreadyInstalled(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function ReadingHabit() {
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<"native" | "ios" | null>(null);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const surface = habitSurface(pathname);

  useEffect(() => {
    if (!surface) return;
    recordVisit();
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, [surface, pathname]);

  useEffect(() => {
    if (!surface || alreadyInstalled()) return;
    let cancelled = false;
    let opened = false;
    let waited = false;
    const show = (next: "native" | "ios") => {
      if (cancelled || opened) return;
      if (!installPromptDue(readStamp(), Date.now())) return;
      opened = true;
      writeStamp(Date.now());
      track("install_prompt_shown");
      setMode(next);
    };
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      if (waited) show("native");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const timer = window.setTimeout(() => {
      waited = true;
      if (deferred.current) {
        show("native");
        return;
      }
      if (isIos() && !alreadyInstalled()) show("ios");
    }, 4000);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(timer);
    };
  }, [surface, pathname]);

  if (!surface || !mode) return null;

  async function accept() {
    const event = deferred.current;
    setMode(null);
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") track("install_prompt_accepted");
    deferred.current = null;
  }

  return (
    <div className="install-prompt no-print" role="dialog" aria-label={`Add ${siteConfig.name} to your home screen`}>
      <p className="install-title">Add {siteConfig.name} to your home screen</p>
      {mode === "ios" ? (
        <p>On iPhone or iPad, tap Share, then Add to Home Screen. The latest homepage stays readable offline.</p>
      ) : (
        <p>It opens like an app, and the latest homepage stays on this device for offline reading.</p>
      )}
      <div className="install-actions">
        {mode === "native" ? (
          <button type="button" className="btn btn-ink" onClick={() => void accept()}>
            Add
          </button>
        ) : null}
        <button type="button" className="btn btn-outline" onClick={() => setMode(null)}>
          Not now
        </button>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
