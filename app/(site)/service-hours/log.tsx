"use client";

import { useState, useSyncExternalStore } from "react";
import { siteConfig } from "@/site.config";

export type ServiceWeekOption = {
  start: string;
  label: string;
  stories: { slug: string; title: string }[];
};

type Entry = {
  date: string;
  activity: string;
  organization: string;
  hours: string;
  did: string;
  learned: string;
  storyChoice: string;
  storyText: string;
};

const EMPTY: Entry = {
  date: "",
  activity: "",
  organization: "",
  hours: "",
  did: "",
  learned: "",
  storyChoice: "",
  storyText: "",
};

const STORAGE_KEY = "service-hours-log-v1";

const listeners = new Set<() => void>();

function emitLog() {
  listeners.forEach((listener) => listener());
}

function subscribeLog(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cachedRaw: string | null | undefined;
let cachedEntry: Entry = EMPTY;

function readSaved(): Entry {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedEntry;
  cachedRaw = raw;
  cachedEntry = readEntry(raw) ?? EMPTY;
  return cachedEntry;
}

function writeSaved(entry: Entry) {
  const raw = JSON.stringify(entry);
  cachedRaw = raw;
  cachedEntry = entry;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    /* Private browsing can reject storage. The log still prints this visit. */
  }
  emitLog();
}

function clearSaved() {
  cachedRaw = null;
  cachedEntry = EMPTY;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Already gone, or storage is blocked. */
  }
  emitLog();
}

function weekInQuery(weeks: ServiceWeekOption[]): string {
  if (typeof window === "undefined") return weeks[0]?.start ?? "";
  const requested = new URLSearchParams(window.location.search).get("week");
  if (requested && weeks.some((item) => item.start === requested)) return requested;
  return weeks[0]?.start ?? "";
}

function readEntry(raw: string | null): Entry | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<Entry>;
    if (!parsed || typeof parsed !== "object") return undefined;
    return {
      date: typeof parsed.date === "string" ? parsed.date : "",
      activity: typeof parsed.activity === "string" ? parsed.activity : "",
      organization: typeof parsed.organization === "string" ? parsed.organization : "",
      hours: typeof parsed.hours === "string" ? parsed.hours : "",
      did: typeof parsed.did === "string" ? parsed.did : "",
      learned: typeof parsed.learned === "string" ? parsed.learned : "",
      storyChoice: typeof parsed.storyChoice === "string" ? parsed.storyChoice : "",
      storyText: typeof parsed.storyText === "string" ? parsed.storyText : "",
    };
  } catch {
    return undefined;
  }
}

export function ServiceHoursLog({ weeks }: { weeks: ServiceWeekOption[] }) {
  const entry = useSyncExternalStore(subscribeLog, readSaved, () => EMPTY);
  const weekFromUrl = useSyncExternalStore(
    subscribeLog,
    () => weekInQuery(weeks),
    () => weeks[0]?.start ?? "",
  );
  const [weekOverride, setWeekOverride] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const week = weekOverride ?? weekFromUrl;
  const selected = weeks.find((item) => item.start === week) ?? weeks[0];
  const storyTitle =
    entry.storyChoice && entry.storyChoice !== "other"
      ? (selected?.stories.find((story) => story.slug === entry.storyChoice)?.title ?? entry.storyText)
      : entry.storyText;

  function update(partial: Partial<Entry>) {
    setCleared(false);
    writeSaved({ ...entry, ...partial });
  }

  function clearData() {
    clearSaved();
    setCleared(true);
  }

  function printBlank() {
    document.body.classList.add("hours-print-blank");
    const cleanup = () => {
      document.body.classList.remove("hours-print-blank");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <div className="wrap hours-wrap">
      <form
        className="hours-screen no-print"
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="teacher-note">
          This stays in this browser. Nothing is sent to {siteConfig.name}. Print it before you clear it. Clearing deletes the copy stored here.
        </p>
        {weeks.length ? (
          <label className="field" htmlFor="hours-week">
            Week of stories
            <select id="hours-week" value={selected?.start ?? ""} onChange={(event) => setWeekOverride(event.target.value)}>
              {weeks.map((item) => (
                <option key={item.start} value={item.start}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="hours-grid">
          <label className="field" htmlFor="hours-date">
            Date
            <input id="hours-date" type="date" value={entry.date} onChange={(event) => update({ date: event.target.value })} />
          </label>
          <label className="field" htmlFor="hours-hours">
            Hours
            <input
              id="hours-hours"
              inputMode="decimal"
              value={entry.hours}
              onChange={(event) => update({ hours: event.target.value })}
              placeholder="1.5"
            />
          </label>
        </div>
        <label className="field" htmlFor="hours-activity">
          Activity
          <input id="hours-activity" value={entry.activity} onChange={(event) => update({ activity: event.target.value })} />
        </label>
        <label className="field" htmlFor="hours-org">
          Organization
          <input id="hours-org" value={entry.organization} onChange={(event) => update({ organization: event.target.value })} />
        </label>
        <label className="field" htmlFor="hours-did">
          What I did
          <textarea id="hours-did" value={entry.did} onChange={(event) => update({ did: event.target.value })} rows={4} />
        </label>
        <label className="field" htmlFor="hours-learned">
          What I learned
          <textarea id="hours-learned" value={entry.learned} onChange={(event) => update({ learned: event.target.value })} rows={4} />
        </label>
        <label className="field" htmlFor="hours-story">
          Which story inspired this
          <select id="hours-story" value={entry.storyChoice} onChange={(event) => update({ storyChoice: event.target.value })}>
            <option value="">Choose a story from this week</option>
            {(selected?.stories ?? []).map((story) => (
              <option key={story.slug} value={story.slug}>
                {story.title}
              </option>
            ))}
            <option value="other">I&apos;ll type the story</option>
          </select>
        </label>
        <label className="field" htmlFor="hours-story-text">
          Or name the story in your own words
          <input id="hours-story-text" value={entry.storyText} onChange={(event) => update({ storyText: event.target.value })} />
        </label>
        <div className="cite-actions">
          <button type="button" className="btn btn-ink" onClick={() => window.print()}>
            Print this log
          </button>
          <button type="button" className="btn btn-outline" onClick={printBlank}>
            Print a blank copy
          </button>
          <button type="button" className="btn btn-outline" onClick={clearData}>
            Clear my data
          </button>
        </div>
        {cleared ? (
          <p className="teacher-note" role="status">
            Cleared. The saved copy in this browser is gone.
          </p>
        ) : null}
      </form>

      <article className="hours-print hours-sheet" aria-label="Printable service hours log">
        <p className="kicker">Service hours reflection</p>
        <h1>Service hours log</h1>
        <p className="hours-name">Name (write it in for your adviser)</p>
        <dl className="hours-dl">
          <div>
            <dt>Date</dt>
            <dd>{entry.date || " "}</dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>{entry.hours || " "}</dd>
          </div>
          <div>
            <dt>Activity</dt>
            <dd>{entry.activity || " "}</dd>
          </div>
          <div>
            <dt>Organization</dt>
            <dd>{entry.organization || " "}</dd>
          </div>
        </dl>
        <h2>What I did</h2>
        <p>{entry.did || " "}</p>
        <h2>What I learned</h2>
        <p>{entry.learned || " "}</p>
        <h2>Story that inspired this</h2>
        <p>{storyTitle || " "}</p>
        <p className="hours-note">
          For advisers: this note was filled in by the student in their own browser. {siteConfig.name} did not receive it and does not certify hours. The school or organization decides what counts.
        </p>
        <p className="hours-note">
          {siteConfig.editor.name} · {siteConfig.owner.name}
        </p>
      </article>

      <section className="hours-blank hours-sheet" aria-labelledby="blank-log">
        <p className="kicker">Blank copy</p>
        <h2 id="blank-log">Service hours log</h2>
        <p className="hours-name">Name</p>
        <dl className="hours-dl">
          <div>
            <dt>Date</dt>
            <dd> </dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd> </dd>
          </div>
          <div>
            <dt>Activity</dt>
            <dd> </dd>
          </div>
          <div>
            <dt>Organization</dt>
            <dd> </dd>
          </div>
        </dl>
        <h2>What I did</h2>
        <p className="hours-lines"> </p>
        <h2>What I learned</h2>
        <p className="hours-lines"> </p>
        <h2>Story that inspired this</h2>
        <p className="hours-lines"> </p>
        <p className="hours-note">
          For advisers: the student&apos;s school or organization decides what counts as service hours. {siteConfig.name} does not certify hours and does not collect this form.
        </p>
      </section>
    </div>
  );
}
