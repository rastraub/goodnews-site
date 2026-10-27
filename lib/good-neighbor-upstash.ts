/**
 * Optional Upstash Redis REST store for Good Neighbor votes.
 * Import this only from the API route. Pages must not call it: a network
 * read during render would turn static story pages into functions.
 */
import { countsFromRedis, publicCounts, voterHash, type CastResult } from "./good-neighbor-store";

const VOTER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function endpoint(): { url: string; token: string } | undefined {
  const url = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return undefined;
    return { url: parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "")), token };
  } catch {
    return undefined;
  }
}

async function command(args: (string | number)[]): Promise<unknown> {
  const target = endpoint();
  if (!target) throw new Error("Upstash is not configured");
  const response = await fetch(target.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${target.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`Upstash returned ${response.status}`);
  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

function countsKey(month: string): string {
  return `gn:${month}:counts`;
}

function voterKey(month: string, hash: string): string {
  return `gn:${month}:voter:${hash}`;
}

export async function readUpstashCounts(month: string): Promise<Record<string, number>> {
  try {
    return countsFromRedis(await command(["HGETALL", countsKey(month)]));
  } catch (error) {
    console.warn("[good-neighbor] could not read totals");
    if (error instanceof Error && error.message.startsWith("Upstash returned")) {
      console.warn(`[good-neighbor] ${error.message}`);
    }
    return {};
  }
}

export async function castUpstashVote(input: {
  month: string;
  slug: string;
  voterId: string;
  nomineeSlugs: string[];
  open: boolean;
}): Promise<CastResult> {
  if (!input.open) return { ok: false, status: 403, error: "Voting for this month is closed." };
  if (!input.nomineeSlugs.includes(input.slug)) {
    return { ok: false, status: 400, error: "That story is not on this month's ballot." };
  }
  if (!VOTER_ID.test(input.voterId)) return { ok: false, status: 400, error: "Vote from the ballot page." };
  const hash = voterHash(input.voterId);
  try {
    const set = await command(["SET", voterKey(input.month, hash), input.slug, "NX"]);
    if (set !== "OK") {
      const choice = await command(["GET", voterKey(input.month, hash)]);
      const counts = publicCounts(await readUpstashCounts(input.month), input.nomineeSlugs);
      const kept = typeof choice === "string" && choice ? choice : input.slug;
      return { ok: true, duplicate: true, choice: kept, counts };
    }
    await command(["HINCRBY", countsKey(input.month), input.slug, 1]);
    const counts = publicCounts(await readUpstashCounts(input.month), input.nomineeSlugs);
    return { ok: true, duplicate: false, choice: input.slug, counts };
  } catch {
    console.warn("[good-neighbor] could not store a vote");
    return { ok: false, status: 503, error: "Votes are not being stored.", mode: "cheer" };
  }
}
