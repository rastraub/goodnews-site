/**
 * Seeded Kindness Bingo cards. Same helper shape as the quiz shuffle, kept
 * here so a browser component does not import the story loader.
 * A seed from 1 to 999999 reproduces one card. Nothing is stored on the server.
 */

export type BingoAct = {
  id: string;
  text: string;
  storyPath?: string;
  storyTitle?: string;
};

export type BingoCell = { kind: "free" } | { kind: "act"; act: BingoAct };

export const BINGO_SEED_MAX = 999_999;

const FREE_INDEX = 12;

function mix(seed: number): number {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x | 0;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const copy = items.slice();
  let state = seed || 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = mix(state);
    const swap = (state >>> 0) % (index + 1);
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

/** Stable default card for an edition slug or the standalone bingo page. */
export function cardSeed(key: string): number {
  return (hashString(key) % BINGO_SEED_MAX) + 1;
}

export function parseCardSeed(value: string | null | undefined): number | undefined {
  if (!value || !/^[1-9]\d{0,5}$/.test(value)) return undefined;
  const seed = Number(value);
  if (!Number.isInteger(seed) || seed < 1 || seed > BINGO_SEED_MAX) return undefined;
  return seed;
}

/** 5 by 5. The center cell is Free. Needs at least 24 acts. */
export function buildBingoCard(acts: readonly BingoAct[], seed: number): BingoCell[] {
  if (acts.length < 24) throw new Error("Kindness Bingo needs at least 24 acts.");
  const picked = shuffle(acts, seed).slice(0, 24);
  const cells: BingoCell[] = [];
  for (let index = 0; index < 25; index += 1) {
    if (index === FREE_INDEX) {
      cells.push({ kind: "free" });
      continue;
    }
    const act = picked[index < FREE_INDEX ? index : index - 1];
    cells.push({ kind: "act", act });
  }
  return cells;
}
