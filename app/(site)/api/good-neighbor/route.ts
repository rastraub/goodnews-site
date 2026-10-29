import { getBallot } from "@/lib/good-neighbor-data";
import { winnerSlug } from "@/lib/good-neighbor";
import { castUpstashVote, readUpstashCounts } from "@/lib/good-neighbor-upstash";
import {
  castFileVote,
  publicCounts,
  readFileCounts,
  requestIpHash,
  voteMode,
} from "@/lib/good-neighbor-store";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || request.headers.get("host") || new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  const ipHash = requestIpHash(request);
  if (!rateLimit(`good-neighbor-read:${ipHash}`, 30)) {
    return json({ ok: false, error: "Too many tries. Wait a minute and try again." }, 429);
  }
  const month = new URL(request.url).searchParams.get("month") ?? "";
  const ballot = getBallot(month);
  if (!ballot) return json({ ok: false, error: "No ballot for that month." }, 404);
  const mode = voteMode();
  const raw = mode === "upstash" ? await readUpstashCounts(month) : mode === "file" ? readFileCounts(month) : {};
  const counts = publicCounts(raw, ballot.nominees.map((nominee) => nominee.slug));
  const winner =
    winnerSlug(
      ballot.nominees.map((nominee) => ({ slug: nominee.slug, date: nominee.date })),
      counts,
      { open: ballot.open, editorWinner: ballot.editorWinner },
    ) ?? null;
  return json({
    ok: true,
    enabled: ballot.votesEnabled,
    open: ballot.open,
    month: ballot.month,
    counts,
    winner,
  });
}

export async function POST(request: Request) {
  const ipHash = requestIpHash(request);
  if (!rateLimit(`good-neighbor:${ipHash}`, 8)) {
    return json({ ok: false, error: "Too many tries. Wait a minute and try again." }, 429);
  }
  if (!originAllowed(request)) return json({ ok: false, error: "Vote from the ballot page." }, 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ ok: false, error: "Vote from the ballot page." }, 400);
  const data = body as { month?: unknown; slug?: unknown; voterId?: unknown; company?: unknown };
  if (typeof data.company === "string" && data.company.trim()) {
    return json({ ok: true, ignored: true });
  }
  const month = typeof data.month === "string" ? data.month : "";
  const slug = typeof data.slug === "string" ? data.slug : "";
  const voterId = typeof data.voterId === "string" ? data.voterId : "";
  const ballot = getBallot(month);
  if (!ballot) return json({ ok: false, error: "No ballot for that month." }, 404);
  if (!ballot.open) return json({ ok: false, error: "Voting for this month is closed." }, 403);
  const mode = voteMode();
  if (mode === "off") {
    return json({ ok: false, mode: "cheer", error: "Votes are not being stored." }, 503);
  }
  const nomineeSlugs = ballot.nominees.map((nominee) => nominee.slug);
  const result =
    mode === "file"
      ? await castFileVote({ month, slug, voterId, nomineeSlugs, open: true })
      : await castUpstashVote({ month, slug, voterId, nomineeSlugs, open: true });
  if (result.ok && !result.duplicate) console.log(`[good-neighbor] ${month} ${result.choice}`);
  if (!result.ok) return json({ ok: false, error: result.error, mode: result.mode }, result.status);
  return json({
    ok: true,
    duplicate: result.duplicate,
    choice: result.choice,
    counts: publicCounts(result.counts, nomineeSlugs),
  });
}
