/**
 * Printable word searches for classrooms and homeschool.
 * One static page per Monday-start week, the same week key as /week.
 *
 * Words come only from that week's published kid-friendly stories:
 * kidWord, a one-word or hyphenated city or state name, and a clean
 * category label. The page does not invent a word to fill a short list.
 */
import { getCategory } from "./categories";
import { isUnsuitableText } from "./morning-announcements";
import { isHeavyNews } from "./news-break";
import { getPublishedStories, type Story } from "./stories";
import { stateName } from "./states";
import {
  MAX_PRERENDERED_WEEKS,
  addDays,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";

export const WORD_SEARCH_INDEX_PATH = "/word-search";
export const WORD_SEARCH_INDEX_TITLE = "Weekly Word Search";
export const WORD_SEARCH_INDEX_DESCRIPTION =
  "Free printable word searches made from this week's kid-friendly good news. Words are vocabulary, places, and sections already on the stories. For classrooms and homeschool.";

export const WORD_SEARCH_WORD_CAP = 12;
export const WORD_SEARCH_MIN_WORDS = 6;
const MIN_LETTERS = 4;
const MAX_LETTERS = 14;
const VOCAB_RESERVED = 4;

const KIND_BONUS = { vocab: 5, place: 2, category: 0 } as const;

const STOP_WORDS = new Set([
  "ABOUT",
  "AFTER",
  "ALSO",
  "BECAUSE",
  "BEEN",
  "COULD",
  "FROM",
  "HAVE",
  "INTO",
  "OVER",
  "SHOULD",
  "THAN",
  "THAT",
  "THEIR",
  "THEM",
  "THEN",
  "THERE",
  "THESE",
  "THEY",
  "THIS",
  "THOSE",
  "WHAT",
  "WHEN",
  "WHERE",
  "WHICH",
  "WHILE",
  "WITH",
  "WOULD",
  "YOUR",
]);

/**
 * Whole tokens that do not belong in a children's puzzle.
 * Morning-announcement and news-break filters cover most violence and politics.
 * This list adds exact tokens those patterns miss, including slurs.
 */
const EXTRA_BLOCK =
  /^(?:kill|kills|killer|killers|dead|death|die|dies|dying|gun|guns|gunman|bomb|bombs|bombing|war|wars|hate|hated|nazi|nazis|rape|raped|rapes|suicide|suicides|assault|assaulted|stab|stabbed|stabbing|shoot|shooting|shot|shots|blood|bloody|weapon|weapons|politics|political|politician|politicians|election|elections|ballot|ballots|congress|senate|senator|senators|violence|violent|crime|crimes|criminal|criminals|abuse|abused|abusive|hell|damn|damned|coon|coons|dyke|dykes|kike|kikes|spic|spics|chink|chinks|gook|gooks|paki|pakis|slut|sluts|whore|whores|retard|retards|retarded|nigger|niggers|nigga|niggas|faggot|faggots|tranny|trannies)$/i;

const DIRS = [
  { dr: 0, dc: 1, name: "across" },
  { dr: 1, dc: 0, name: "down" },
  { dr: 1, dc: 1, name: "diagonal down" },
  { dr: -1, dc: 1, name: "diagonal up" },
] as const;

type Dir = (typeof DIRS)[number];

export type PuzzleKind = "vocab" | "place" | "category";

export type PuzzleWord = {
  letters: string;
  label: string;
  kind: PuzzleKind;
};

export type WordPlacement = {
  letters: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
  direction: Dir["name"];
};

export type PuzzleSource = {
  slug: string;
  title: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  category: string;
  kidFriendly?: boolean;
  kidWord?: string;
  draft?: boolean;
  image: string;
  imageAlt: string;
};

export type WordSearchPuzzle<T extends PuzzleSource = PuzzleSource> = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  short: boolean;
  words: PuzzleWord[];
  grid: string[][];
  placements: WordPlacement[];
  stories: { slug: string; title: string }[];
  image: string;
  imageAlt: string;
  latest: string;
  sourceStories: T[];
};

type ScoredWord = PuzzleWord & { score: number };

export function wordSearchPath(start: string): string {
  return `/word-search/${start}`;
}

export function isBlockedPuzzleWord(letters: string): boolean {
  if (EXTRA_BLOCK.test(letters)) return true;
  if (isUnsuitableText(letters)) return true;
  return isHeavyNews({ slug: "puzzle-word", title: letters, dek: letters });
}

/** A single token, or a hyphenated token, long enough for the grid. */
export function puzzleLetters(raw: string): { letters: string; label: string } | undefined {
  const trimmed = raw.trim();
  if (!/^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(trimmed)) return undefined;
  const letters = trimmed.replace(/[-']/g, "").toUpperCase();
  if (letters.length < MIN_LETTERS || letters.length > MAX_LETTERS) return undefined;
  if (STOP_WORDS.has(letters) || isBlockedPuzzleWord(letters)) return undefined;
  const label = trimmed
    .split("-")
    .map((part) => {
      const [first, ...rest] = part.split("'");
      const head = (first ?? "").toLowerCase();
      const titled = head ? head.charAt(0).toUpperCase() + head.slice(1) : "";
      const tail = rest.map((piece) => piece.toLowerCase());
      return [titled, ...tail].filter(Boolean).join("'");
    })
    .join("-");
  return { letters, label };
}

function scored(raw: string, kind: PuzzleKind): ScoredWord | undefined {
  const parsed = puzzleLetters(raw);
  if (!parsed) return undefined;
  return { ...parsed, kind, score: parsed.letters.length + KIND_BONUS[kind] };
}

/** Tokens already written on one story. Multi-word vocabulary is split. Places stay whole. */
export function puzzleCandidatesFromStory(story: PuzzleSource): ScoredWord[] {
  if (story.draft || !story.kidFriendly) return [];
  const found: ScoredWord[] = [];
  const add = (raw: string | undefined, kind: PuzzleKind, split: boolean) => {
    if (!raw?.trim()) return;
    const parts = split ? raw.trim().split(/\s+/) : [raw.trim()];
    for (const part of parts) {
      const word = scored(part, kind);
      if (word) found.push(word);
    }
  };
  add(story.kidWord, "vocab", true);
  add(story.city, "place", false);
  if (story.country === "US") add(stateName(story.state), "place", false);
  add(getCategory(story.category)?.label, "category", false);
  return found;
}

function byInterest(a: ScoredWord, b: ScoredWord): number {
  return b.score - a.score || b.letters.length - a.letters.length || a.letters.localeCompare(b.letters);
}

/** Longer and vocabulary words win. A few vocabulary words are kept before the grid fills with place names. */
export function selectPuzzleWords(words: readonly ScoredWord[]): PuzzleWord[] {
  const best = new Map<string, ScoredWord>();
  for (const word of words) {
    const existing = best.get(word.letters);
    if (!existing || word.score > existing.score || (word.score === existing.score && word.kind === "vocab" && existing.kind !== "vocab")) {
      best.set(word.letters, word);
    }
  }
  const ranked = [...best.values()].sort(byInterest);
  const chosen = new Map<string, ScoredWord>();
  for (const word of ranked.filter((item) => item.kind === "vocab").slice(0, VOCAB_RESERVED)) chosen.set(word.letters, word);
  for (const word of ranked) {
    if (chosen.size >= WORD_SEARCH_WORD_CAP) break;
    chosen.set(word.letters, word);
  }
  return [...chosen.values()].sort(byInterest).map(({ letters, label, kind }) => ({ letters, label, kind }));
}

export function collectPuzzleWords(stories: readonly PuzzleSource[]): PuzzleWord[] {
  return selectPuzzleWords(stories.flatMap((story) => puzzleCandidatesFromStory(story)));
}

export function shortPuzzleNote(count: number): string {
  if (count === 0) {
    return "This week does not have puzzle words from its kid-friendly stories yet. A word is used only when a story already has a vocabulary word, a one-word place name, or a clean section label. Nothing is filled in.";
  }
  const word = count === 1 ? "word" : "words";
  return `This week has ${count} ${word} from its kid-friendly stories, which is fewer than six. The puzzle uses only those words. Nothing is filled in.`;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function emptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

function rowRange(length: number, rows: number, dr: number): { min: number; max: number } | undefined {
  if (dr === 0) return rows > 0 ? { min: 0, max: rows - 1 } : undefined;
  if (dr > 0) {
    const max = rows - length;
    return max >= 0 ? { min: 0, max } : undefined;
  }
  const min = length - 1;
  return min <= rows - 1 ? { min, max: rows - 1 } : undefined;
}

function canPlace(grid: string[][], letters: string, row: number, col: number, dir: Dir): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let index = 0; index < letters.length; index += 1) {
    const r = row + dir.dr * index;
    const c = col + dir.dc * index;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    const existing = grid[r]?.[c];
    if (existing && existing !== letters[index]) return false;
  }
  return true;
}

function stamp(grid: string[][], letters: string, row: number, col: number, dir: Dir) {
  for (let index = 0; index < letters.length; index += 1) {
    const r = row + dir.dr * index;
    const c = col + dir.dc * index;
    const line = grid[r];
    if (line) line[c] = letters[index] ?? "";
  }
}

function colRange(length: number, cols: number, dc: number): { min: number; max: number } | undefined {
  if (dc === 0) return cols > 0 ? { min: 0, max: cols - 1 } : undefined;
  const max = cols - length;
  return max >= 0 ? { min: 0, max } : undefined;
}

function sampleSlot(letters: string, rows: number, cols: number, dir: Dir, rng: () => number): { row: number; col: number } | undefined {
  const rowsSpan = rowRange(letters.length, rows, dir.dr);
  const colsSpan = colRange(letters.length, cols, dir.dc);
  if (!rowsSpan || !colsSpan) return undefined;
  return {
    row: rowsSpan.min + Math.floor(rng() * (rowsSpan.max - rowsSpan.min + 1)),
    col: colsSpan.min + Math.floor(rng() * (colsSpan.max - colsSpan.min + 1)),
  };
}

function placeOnce(words: string[], rows: number, cols: number, rng: () => number): WordPlacement[] | undefined {
  const grid = emptyGrid(rows, cols);
  const placements: WordPlacement[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const letters = words[index];
    if (!letters) return undefined;
    const preferred = DIRS[index % DIRS.length] ?? DIRS[0];
    let placed = false;
    for (let attempt = 0; attempt < 180 && !placed; attempt += 1) {
      const dir = attempt < 100 ? preferred : (DIRS[Math.floor(rng() * DIRS.length)] ?? preferred);
      const slot = sampleSlot(letters, rows, cols, dir, rng);
      if (!slot || !canPlace(grid, letters, slot.row, slot.col, dir)) continue;
      stamp(grid, letters, slot.row, slot.col, dir);
      placements.push({ letters, row: slot.row, col: slot.col, dr: dir.dr, dc: dir.dc, direction: dir.name });
      placed = true;
    }
    if (!placed) return undefined;
  }
  return placements;
}

function fillEmpty(grid: string[][], rng: () => number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const row of grid) {
    for (let col = 0; col < row.length; col += 1) {
      if (!row[col]) row[col] = alphabet[Math.floor(rng() * alphabet.length)] ?? "A";
    }
  }
}

function lineGrid(words: string[], rng: () => number): { grid: string[][]; placements: WordPlacement[] } {
  const cols = Math.max(...words.map((word) => word.length), 1);
  const grid = emptyGrid(Math.max(words.length, 1), cols);
  const across = DIRS[0];
  const placements = words.map((letters, row) => {
    stamp(grid, letters, row, 0, across);
    return { letters, row, col: 0, dr: across.dr, dc: across.dc, direction: across.name };
  });
  fillEmpty(grid, rng);
  return { grid, placements };
}

/** Build a rectangular grid. The same words and week always produce the same grid. */
export function generateWordGrid(letters: readonly string[], seed: string): { grid: string[][]; placements: WordPlacement[] } {
  const ordered = [...new Set(letters.map((word) => word.toUpperCase()))]
    .filter((word) => /^[A-Z]+$/.test(word) && word.length >= MIN_LETTERS && word.length <= MAX_LETTERS)
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
  if (!ordered.length) return { grid: [], placements: [] };
  const rng = mulberry32(hashSeed(`${seed}|${ordered.join(",")}`));
  const longest = ordered[0]?.length ?? MIN_LETTERS;
  for (let grow = 0; grow <= 6; grow += 1) {
    const rows = Math.max(longest + 2, 12) + grow;
    const cols = Math.max(longest + 4, 15) + grow;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const placements = placeOnce(ordered, rows, cols, rng);
      if (!placements) continue;
      const directions = new Set(placements.map((placement) => placement.direction));
      if (ordered.length >= 6 && directions.size < 2) continue;
      const grid = emptyGrid(rows, cols);
      for (const placement of placements) {
        const dir = DIRS.find((item) => item.name === placement.direction && item.dr === placement.dr && item.dc === placement.dc) ?? DIRS[0];
        stamp(grid, placement.letters, placement.row, placement.col, dir);
      }
      fillEmpty(grid, rng);
      return { grid, placements };
    }
  }
  return lineGrid(ordered, rng);
}

export function placementMatches(grid: readonly (readonly string[])[], placement: WordPlacement): boolean {
  for (let index = 0; index < placement.letters.length; index += 1) {
    const letter = grid[placement.row + placement.dr * index]?.[placement.col + placement.dc * index];
    if (letter !== placement.letters[index]) return false;
  }
  return true;
}

export function answerCells(placements: readonly WordPlacement[]): Set<string> {
  const cells = new Set<string>();
  for (const placement of placements) {
    for (let index = 0; index < placement.letters.length; index += 1) {
      cells.add(`${placement.row + placement.dr * index},${placement.col + placement.dc * index}`);
    }
  }
  return cells;
}

function byNewest<T extends PuzzleSource>(a: T, b: T): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

function storiesForWords<T extends PuzzleSource>(stories: readonly T[], words: readonly PuzzleWord[]): T[] {
  const wanted = new Set(words.map((word) => word.letters));
  const picked: T[] = [];
  const seen = new Set<string>();
  for (const story of stories) {
    if (seen.has(story.slug)) continue;
    const hit = puzzleCandidatesFromStory(story).some((word) => wanted.has(word.letters));
    if (!hit) continue;
    seen.add(story.slug);
    picked.push(story);
  }
  return picked;
}

function finishPuzzle<T extends PuzzleSource>(start: string, stories: T[], today: string): WordSearchPuzzle<T> | undefined {
  if (!stories.length) return undefined;
  const words = collectPuzzleWords(stories);
  const end = addDays(start, 6);
  const inProgress = start === weekStart(today);
  const rangeLabel = formatWeekRange(start, end);
  const grid = generateWordGrid(
    words.map((word) => word.letters),
    start,
  );
  const photo = stories.slice().sort(byNewest)[0];
  if (!photo) return undefined;
  const latest = stories.reduce((max, story) => (story.date > max ? story.date : max), photo.date);
  const short = words.length < WORD_SEARCH_MIN_WORDS;
  const countLabel = words.length === 1 ? "1 word" : `${words.length} words`;
  const linked = storiesForWords(stories, words);
  const shown = (linked.length ? linked : stories).slice(0, 12);
  return {
    start,
    end,
    path: wordSearchPath(start),
    inProgress,
    rangeLabel,
    title: inProgress ? `Word Search, So Far: ${rangeLabel}` : `Word Search: ${rangeLabel}`,
    heading: inProgress ? "This week's word search, so far." : "This week's word search.",
    description: short
      ? `A printable word search for ${rangeLabel}. ${shortPuzzleNote(words.length)}`
      : `A printable word search for ${rangeLabel} with ${countLabel} from that week's kid-friendly stories. For classrooms and homeschool.`,
    intro: short
      ? shortPuzzleNote(words.length)
      : `${countLabel} from this week's kid-friendly stories. Words run across, down, or on a diagonal that moves to the right.`,
    short,
    words,
    grid: grid.grid,
    placements: grid.placements,
    stories: shown.map((story) => ({ slug: story.slug, title: story.title })),
    image: photo.image,
    imageAlt: photo.imageAlt,
    latest,
    sourceStories: stories,
  };
}

/** Puzzles since launch week, oldest first. A week with no kid-friendly story is not a page. */
export function buildWordSearches<T extends PuzzleSource>(stories: readonly T[], today = mountainDay()): WordSearchPuzzle<T>[] {
  const launch = launchWeekStart();
  const current = weekStart(today);
  const buckets = new Map<string, T[]>();
  for (const story of stories) {
    if (story.draft || !story.kidFriendly || !parseIsoDate(story.date)) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    const list = buckets.get(start);
    if (list) list.push(story);
    else buckets.set(start, [story]);
  }
  const puzzles: WordSearchPuzzle<T>[] = [];
  for (const [start, weekStories] of buckets) {
    const puzzle = finishPuzzle(start, weekStories, today);
    if (puzzle) puzzles.push(puzzle);
  }
  puzzles.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return puzzles;
}

let cache: WordSearchPuzzle<Story>[] | null = null;

export function getWordSearches(): WordSearchPuzzle<Story>[] {
  if (cache && process.env.NODE_ENV !== "development") return cache;
  const puzzles = buildWordSearches(getPublishedStories());
  if (process.env.NODE_ENV !== "development") cache = puzzles;
  return puzzles;
}

export function wordSearchesToPrerender(puzzles = getWordSearches()): WordSearchPuzzle<Story>[] {
  if (puzzles.length <= MAX_PRERENDERED_WEEKS) return puzzles;
  return puzzles
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}

export function wordSearchByStart(start: string, puzzles = getWordSearches()): WordSearchPuzzle<Story> | undefined {
  return puzzles.find((puzzle) => puzzle.start === start);
}

function sampleSource(partial: Partial<PuzzleSource> & Pick<PuzzleSource, "slug">): PuzzleSource {
  return {
    title: `Story ${partial.slug}`,
    date: "2026-10-07",
    city: "Denver",
    country: "US",
    state: "CO",
    category: "animals",
    kidFriendly: true,
    image: `/images/stories/${partial.slug}.webp`,
    imageAlt: "A photo from the word search week",
    ...partial,
  };
}

/** Fixture checks for the helper. validate-stories calls this. */
export function assertWordSearches() {
  if (WORD_SEARCH_INDEX_PATH !== "/word-search") throw new Error("The word search index should live at /word-search.");
  if (puzzleLetters("cat") || puzzleLetters("New York") || puzzleLetters("Health & Tech")) {
    throw new Error("Short words, two-word places, and messy labels should stay out of the puzzle.");
  }
  const hyphen = puzzleLetters("Winston-Salem");
  if (!hyphen || hyphen.letters !== "WINSTONSALEM") throw new Error("A hyphenated place should keep its letters and drop the hyphen in the grid.");
  if (puzzleLetters("guns") || puzzleLetters("violence") || puzzleLetters("congress") || puzzleLetters("murder")) {
    throw new Error("Violence and politics tokens should stay out of the puzzle.");
  }
  if (puzzleLetters("from")) throw new Error("A function word should not become a puzzle word.");
  const calf = puzzleLetters("calf");
  if (!calf || calf.letters !== "CALF") throw new Error("A four-letter vocabulary word should stay.");

  const collected = collectPuzzleWords([
    sampleSource({ slug: "ny", kidWord: "fellowship", city: "New York", state: "NY", category: "animals" }),
    sampleSource({ slug: "denver", kidWord: "guns", city: "Denver", state: "CO", category: "health-tech" }),
    sampleSource({ slug: "room", kidWord: "waiting room", city: "Winston-Salem", state: "NC", category: "heroes" }),
    sampleSource({ slug: "drafty", kidWord: "canopy", draft: true, city: "Boulder" }),
    sampleSource({ slug: "plain", kidFriendly: false, kidWord: "marshmallow", city: "Lyon", country: "FR", state: undefined }),
  ]);
  const letters = new Set(collected.map((word) => word.letters));
  for (const word of ["FELLOWSHIP", "DENVER", "COLORADO", "WAITING", "ROOM", "WINSTONSALEM", "HEROES", "ANIMALS"]) {
    if (!letters.has(word)) throw new Error(`${word} should be available for the puzzle.`);
  }
  for (const word of ["GUN", "NEW", "YORK", "HEALTH", "CANOPY", "MARSHMALLOW", "NORTH", "CAROLINA"]) {
    if (letters.has(word)) throw new Error(`${word} should not be invented or pulled from a blocked field.`);
  }
  const again = collectPuzzleWords([
    sampleSource({ slug: "denver-2", kidWord: "Denver", city: "Denver", state: "CO", category: "animals" }),
  ]);
  if (again.filter((word) => word.letters === "DENVER").length !== 1) throw new Error("Puzzle words should be case-insensitive and unique.");

  const many = Array.from({ length: 16 }, (_, index) => {
    const extra = "abcde".slice(0, index % 5);
    return scored(`word${String.fromCharCode(97 + index)}${extra}`, "vocab");
  }).filter((word): word is ScoredWord => Boolean(word));
  const capped = selectPuzzleWords(many);
  if (capped.length !== WORD_SEARCH_WORD_CAP) throw new Error("A long word list should stop at the cap.");
  const kept = Math.min(...capped.map((word) => word.letters.length));
  const dropped = many
    .map((word) => word.letters)
    .filter((word) => !capped.some((item) => item.letters === word));
  const droppedMax = Math.max(...dropped.map((word) => word.length));
  if (kept < droppedMax) throw new Error("Shorter words should be the ones left out when the list is over the cap.");

  const sampleWords = ["FELLOWSHIP", "COLORADO", "ANIMALS", "DENVER", "HEROES", "SCIENCE", "MARSHMALLOW", "CANOPY"];
  const first = generateWordGrid(sampleWords, "2026-10-05");
  const second = generateWordGrid(sampleWords, "2026-10-05");
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("A word search should stay the same for the same week and words.");
  if (first.grid.length < 2 || first.grid[0]!.length <= first.grid.length) {
    throw new Error("The grid should be a rectangle, wider than it is tall when the words fit.");
  }
  const directions = new Set(first.placements.map((placement) => placement.direction));
  if (!directions.has("across") || !directions.has("down") || (!directions.has("diagonal down") && !directions.has("diagonal up"))) {
    throw new Error(`Words should run across, down, and on a diagonal. Got ${[...directions].join(", ") || "none"}.`);
  }
  for (const placement of first.placements) {
    if (placement.dc < 0 || (placement.dc === 0 && placement.dr <= 0)) throw new Error("Words should read forward only.");
    if (!placementMatches(first.grid, placement)) throw new Error(`${placement.letters} is missing from its placement.`);
  }
  for (const row of first.grid) {
    for (const cell of row) {
      if (!/^[A-Z]$/.test(cell)) throw new Error("Every grid cell should be a letter.");
    }
  }
  if (generateWordGrid([], "2026-10-05").grid.length) throw new Error("No words should mean no grid.");

  const early = buildWordSearches([sampleSource({ slug: "early", date: "2026-09-30", kidWord: "canopy" })], "2026-10-20");
  if (early.length) throw new Error("A week before launch should not be a word search.");
  const future = buildWordSearches([sampleSource({ slug: "future", date: "2026-10-26", kidWord: "canopy" })], "2026-10-20");
  if (future.length) throw new Error("A week that has not started should not be a word search.");
  const thin = buildWordSearches(
    [sampleSource({ slug: "thin", date: "2026-10-07", kidWord: "calf", city: "A", category: "health-tech", state: "NY" })],
    "2026-10-20",
  );
  if (thin.length !== 1 || thin[0]?.path !== "/word-search/2026-10-05" || !thin[0].short) {
    throw new Error("A week with fewer than six words should still be a page, with a short-list note.");
  }
  if (thin[0].words.some((word) => !["CALF"].includes(word.letters))) {
    throw new Error("A thin week should not invent words to reach six.");
  }

  const today = mountainDay();
  const current = weekStart(today);
  const launch = launchWeekStart();
  const puzzles = getWordSearches();
  const published = getPublishedStories();
  const readyWeeks = new Set<string>();
  for (const story of published) {
    if (!story.kidFriendly) continue;
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    readyWeeks.add(start);
  }
  const built = new Set(puzzles.map((puzzle) => puzzle.start));
  for (const start of readyWeeks) {
    if (!built.has(start)) throw new Error(`${start} has a kid-friendly story and should have a word search.`);
  }
  for (const puzzle of puzzles) {
    if (!readyWeeks.has(puzzle.start)) throw new Error(`${puzzle.path} has no kid-friendly story.`);
    if (puzzle.start !== weekStart(puzzle.start) || puzzle.path !== wordSearchPath(puzzle.start)) {
      throw new Error(`${puzzle.path} should be keyed to Monday.`);
    }
    if (puzzle.words.length > WORD_SEARCH_WORD_CAP) throw new Error(`${puzzle.path} is over the word cap.`);
    if (puzzle.short !== puzzle.words.length < WORD_SEARCH_MIN_WORDS) throw new Error(`${puzzle.path} has the wrong short-list flag.`);
    const allowed = new Set(puzzle.sourceStories.flatMap((story) => puzzleCandidatesFromStory(story).map((word) => word.letters)));
    for (const word of puzzle.words) {
      if (word.letters.length < MIN_LETTERS || isBlockedPuzzleWord(word.letters) || !allowed.has(word.letters)) {
        throw new Error(`${puzzle.path} includes ${word.letters}, which is not on that week's stories.`);
      }
    }
    for (const placement of puzzle.placements) {
      if (!placementMatches(puzzle.grid, placement)) throw new Error(`${puzzle.path} lost ${placement.letters}.`);
    }
    if (puzzle.words.length && puzzle.placements.length !== puzzle.words.length) {
      throw new Error(`${puzzle.path} did not place every word.`);
    }
    if (puzzle.words.length >= WORD_SEARCH_MIN_WORDS) {
      const directions = new Set(puzzle.placements.map((placement) => placement.direction));
      if (directions.size < 2) throw new Error(`${puzzle.path} should place words in more than one direction.`);
    }
  }
  const short = puzzles.filter((puzzle) => puzzle.short).map((puzzle) => `${puzzle.start} (${puzzle.words.length})`);
  console.log(`Word searches: ${puzzles.length} since ${launch}. Fewer than six words: ${short.join(", ") || "none"}.`);
}
