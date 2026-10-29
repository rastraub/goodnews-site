/**
 * Shared Good Neighbor totals.
 *
 * Off unless GOOD_NEIGHBOR_VOTES is `file` or `upstash` and the matching
 * settings are present. This module never talks to the network. The Upstash
 * client lives in lib/good-neighbor-upstash.ts and is imported only by the
 * API route, so story pages stay static.
 *
 * Stored records are a hash and a story slug. Raw IP addresses and voter ids
 * are not written.
 */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

export type VoteMode = "off" | "file" | "upstash";

export type CastResult =
  | { ok: true; duplicate: boolean; choice: string; counts: Record<string, number> }
  | { ok: false; status: number; error: string; mode?: "cheer" };

type MonthBucket = { counts: Record<string, number>; voters: Record<string, string> };
type VoteDb = { months: Record<string, MonthBucket> };

let warned = false;
let writeChain: Promise<void> = Promise.resolve();

export function hashSecret(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}\0${value}`).digest("hex");
}

function configuredSalt(): string {
  return (process.env.GOOD_NEIGHBOR_IP_SALT || "").trim();
}

export function upstashSettingsPresent(): boolean {
  const url = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function voteMode(): VoteMode {
  const flag = (process.env.GOOD_NEIGHBOR_VOTES || "").trim().toLowerCase();
  if (!flag || flag === "0" || flag === "off" || flag === "false") return "off";
  const saltOk = configuredSalt().length >= 16;
  if (flag === "file" && saltOk) return "file";
  if (flag === "upstash" && saltOk && upstashSettingsPresent()) return "upstash";
  if (!warned) {
    warned = true;
    console.warn("[good-neighbor] GOOD_NEIGHBOR_VOTES is set, but the store settings are incomplete. Cheers stay in the browser.");
  }
  return "off";
}

export function votesEnabled(): boolean {
  return voteMode() !== "off";
}

/** Rate-limit key material. The raw address is not returned or stored. */
export function requestIpHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  const salt = configuredSalt().length >= 16 ? configuredSalt() : "good-neighbor-rate";
  return hashSecret(`ip:${ip}`, salt);
}

const DEFAULT_VOTE_FILE = path.join(process.cwd(), "data", "good-neighbor-votes.json");

export function voteFilePath(): string {
  return process.env.GOOD_NEIGHBOR_VOTE_FILE || DEFAULT_VOTE_FILE;
}

function readStaticVoteFile(): string | undefined {
  if (!fs.existsSync(DEFAULT_VOTE_FILE)) return undefined;
  return fs.readFileSync(DEFAULT_VOTE_FILE, "utf8");
}

/** Tests point GOOD_NEIGHBOR_VOTE_FILE at a temp path outside data/. */
function readDynamicVoteFile(file: string): string | undefined {
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) return undefined;
  return fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8");
}

function readVoteFile(file: string): string | undefined {
  if (file === DEFAULT_VOTE_FILE) return readStaticVoteFile();
  return readDynamicVoteFile(file);
}

function writeStaticVoteFile(body: string) {
  fs.mkdirSync(path.dirname(DEFAULT_VOTE_FILE), { recursive: true });
  const tmp = `${DEFAULT_VOTE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, DEFAULT_VOTE_FILE);
}

function writeDynamicVoteFile(file: string, body: string) {
  fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(/*turbopackIgnore: true*/ tmp, body, "utf8");
  fs.renameSync(/*turbopackIgnore: true*/ tmp, file);
}

function writeVoteFile(file: string, body: string) {
  if (file === DEFAULT_VOTE_FILE) {
    writeStaticVoteFile(body);
    return;
  }
  writeDynamicVoteFile(file, body);
}

export function countsFromRedis(result: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  function take(slug: unknown, votes: unknown) {
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
    const n = typeof votes === "number" ? votes : Number(votes);
    if (!Number.isInteger(n) || n <= 0 || n > 1_000_000) return;
    counts[slug] = n;
  }
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) take(result[i], result[i + 1]);
    return counts;
  }
  if (result && typeof result === "object") {
    for (const [slug, votes] of Object.entries(result as Record<string, unknown>)) take(slug, votes);
  }
  return counts;
}

function emptyDb(): VoteDb {
  return { months: {} };
}

function readDb(): VoteDb {
  try {
    const text = readVoteFile(voteFilePath());
    if (!text) return emptyDb();
    const raw = JSON.parse(text) as VoteDb;
    if (!raw || typeof raw !== "object" || !raw.months || typeof raw.months !== "object") return emptyDb();
    return raw;
  } catch {
    return emptyDb();
  }
}

function writeDb(db: VoteDb) {
  writeVoteFile(voteFilePath(), JSON.stringify(db));
}

export function readFileCounts(month: string): Record<string, number> {
  const bucket = readDb().months[month];
  if (!bucket?.counts) return {};
  return countsFromRedis(bucket.counts);
}

function bucket(db: VoteDb, month: string): MonthBucket {
  const current = db.months[month];
  if (current) return current;
  const created = { counts: {}, voters: {} };
  db.months[month] = created;
  return created;
}

const VOTER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function voterHash(voterId: string): string {
  return hashSecret(`voter:${voterId}`, configuredSalt());
}

/**
 * One stored vote per voter hash per month. A repeat keeps the first choice
 * and does not add another tally. `open` is decided by the caller.
 */
export function castFileVote(input: {
  month: string;
  slug: string;
  voterId: string;
  nomineeSlugs: string[];
  open: boolean;
}): Promise<CastResult> {
  const run = writeChain.then(() => castFileVoteSync(input));
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function castFileVoteSync(input: {
  month: string;
  slug: string;
  voterId: string;
  nomineeSlugs: string[];
  open: boolean;
}): CastResult {
  if (!input.open) return { ok: false, status: 403, error: "Voting for this month is closed." };
  if (!input.nomineeSlugs.includes(input.slug)) {
    return { ok: false, status: 400, error: "That story is not on this month's ballot." };
  }
  if (!VOTER_ID.test(input.voterId)) return { ok: false, status: 400, error: "Vote from the ballot page." };
  const db = readDb();
  const month = bucket(db, input.month);
  const hash = voterHash(input.voterId);
  const existing = month.voters[hash];
  if (existing) {
    return { ok: true, duplicate: true, choice: existing, counts: countsFromRedis(month.counts) };
  }
  month.voters[hash] = input.slug;
  month.counts[input.slug] = (month.counts[input.slug] ?? 0) + 1;
  writeDb(db);
  return { ok: true, duplicate: false, choice: input.slug, counts: countsFromRedis(month.counts) };
}

export function publicCounts(counts: Record<string, number>, nomineeSlugs: string[]): Record<string, number> {
  const allowed = new Set(nomineeSlugs);
  const clean: Record<string, number> = {};
  for (const [slug, votes] of Object.entries(countsFromRedis(counts))) {
    if (allowed.has(slug)) clean[slug] = votes;
  }
  return clean;
}
