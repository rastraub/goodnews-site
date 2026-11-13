"use client";

import { useSyncExternalStore } from "react";
import { buildBingoCard, parseCardSeed, type BingoAct } from "@/lib/bingo-card";

const LETTERS = ["B", "I", "N", "G", "O"] as const;
const listeners = new Set<() => void>();

function storageKey(seed: number): string {
  return `tazzora-kindness-bingo:${seed}`;
}

function readDone(seed: number): string[] {
  try {
    const raw = localStorage.getItem(storageKey(seed));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

function writeDone(seed: number, ids: string[]) {
  localStorage.setItem(storageKey(seed), JSON.stringify(ids));
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("popstate", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("popstate", callback);
  };
}

function randomSeed(current: number): number {
  let next = current;
  while (next === current) next = Math.floor(Math.random() * 999_999) + 1;
  return next;
}

/**
 * A 5 by 5 card. The server render uses `defaultSeed`. A ?card= value in the
 * URL selects the same card on this browser, and New card writes a new seed
 * into the link. Checked squares stay in localStorage only.
 */
export function KindnessBingo({ acts, defaultSeed }: { acts: BingoAct[]; defaultSeed: number }) {
  const seed = useSyncExternalStore(
    subscribe,
    () => parseCardSeed(new URLSearchParams(window.location.search).get("card")) ?? defaultSeed,
    () => defaultSeed,
  );
  const doneKey = useSyncExternalStore(
    subscribe,
    () => readDone(seed).join("\n"),
    () => "",
  );
  const done = doneKey ? doneKey.split("\n") : [];
  const cells = buildBingoCard(acts, seed);
  const rows = [0, 1, 2, 3, 4].map((row) => cells.slice(row * 5, row * 5 + 5));

  function showSeed(next: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("card", String(next));
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    emit();
  }

  function toggle(id: string) {
    const current = readDone(seed);
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    writeDone(seed, next);
    emit();
  }

  return (
    <div className="bingo-board">
      <div className="bingo-tools no-print">
        <button type="button" className="btn btn-ink" onClick={() => showSeed(randomSeed(seed))}>
          New card
        </button>
        <p>Card {seed}. Share this page link to send the same card. Checked squares stay on this device only.</p>
      </div>
      <div className="bingo-scroll">
        <table className="bingo-grid">
          <caption className="sr">
            Kindness bingo, five by five. The center square is free. Mark a square when your family does that act.
          </caption>
          <thead>
            <tr>
              {LETTERS.map((letter) => (
                <th key={letter} scope="col">
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={LETTERS[rowIndex]}>
                {row.map((cell) => {
                  if (cell.kind === "free") {
                    return (
                      <td key="free" className="bingo-free">
                        <p>
                          Free <span className="sr">center square</span>
                        </p>
                      </td>
                    );
                  }
                  const pressed = done.includes(cell.act.id);
                  return (
                    <td key={cell.act.id} className={pressed ? "is-done" : undefined}>
                      <button type="button" aria-pressed={pressed} onClick={() => toggle(cell.act.id)}>
                        <span className="bingo-check" aria-hidden="true">
                          {pressed ? "✓" : ""}
                        </span>
                        {cell.act.text}
                      </button>
                      {cell.act.storyPath ? (
                        <a className="bingo-inspired" href={cell.act.storyPath}>
                          Inspired by<span className="sr">: {cell.act.storyTitle}</span>
                        </a>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
